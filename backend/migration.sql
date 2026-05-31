-- =============================================================================
-- APEXDRIVE: FULL SCHEMA MIGRATION (SUPABASE / POSTGRES)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) CITIES
-- -----------------------------------------------------------------------------
CREATE TABLE cities (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  region   VARCHAR(150),
  lat      NUMERIC(10,6),
  lon      NUMERIC(10,6),
  UNIQUE(name, region)
);

-- -----------------------------------------------------------------------------
-- 2) WAREHOUSES
-- -----------------------------------------------------------------------------
CREATE TABLE warehouses (
  id              SERIAL PRIMARY KEY,
  city_id         INT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  address         TEXT NOT NULL,
  phone           VARCHAR(20),
  working_hours   VARCHAR(100),
  is_pickup_point BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 3) USERS
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  role                VARCHAR(10) DEFAULT 'user' CHECK (role IN ('guest','user','admin')),
  email               VARCHAR(255) UNIQUE,
  phone_number        VARCHAR(20) UNIQUE,
  password_hash       TEXT,
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100),
  otchestvo           VARCHAR(100),
  avatar_url          TEXT DEFAULT 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png',
  is_email_verified   BOOLEAN DEFAULT FALSE,
  saved_city_id       INT REFERENCES cities(id) ON DELETE SET NULL,
  allows_data_saving  BOOLEAN DEFAULT FALSE,
  cart                JSONB DEFAULT '[]'::jsonb,
  compare_list        JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_contact CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
);

-- -----------------------------------------------------------------------------
-- 4) USER VEHICLES
-- -----------------------------------------------------------------------------
CREATE TABLE user_vehicles (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand         VARCHAR(100) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          SMALLINT,
  vin           VARCHAR(17),
  engine_volume NUMERIC(3,1),
  is_primary    BOOLEAN DEFAULT FALSE
);

-- -----------------------------------------------------------------------------
-- 5) PASSWORD RESET TOKENS
-- -----------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6) NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) CHECK (type IN ('order','system','promo','stock')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7) CATEGORIES
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
  name      VARCHAR(150) NOT NULL,
  slug      VARCHAR(150) UNIQUE NOT NULL,
  image_url TEXT
);

-- -----------------------------------------------------------------------------
-- 8) CATEGORY ATTRIBUTES
-- -----------------------------------------------------------------------------
CREATE TABLE category_attributes (
  id             SERIAL PRIMARY KEY,
  category_id    INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  code           VARCHAR(100) NOT NULL,
  label          VARCHAR(150) NOT NULL,
  type           VARCHAR(20) NOT NULL CHECK (type IN ('range','checkbox','boolean','text')),
  unit           VARCHAR(30),
  sort_order     INT DEFAULT 0,
  is_filterable  BOOLEAN DEFAULT TRUE,
  is_required    BOOLEAN DEFAULT FALSE,
  options_json   JSONB DEFAULT '[]'::jsonb,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, code)
);

-- -----------------------------------------------------------------------------
-- 9) BRANDS
-- -----------------------------------------------------------------------------
CREATE TABLE brands (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  logo_url   TEXT,
  country    VARCHAR(100),
  is_popular BOOLEAN DEFAULT FALSE
);

-- -----------------------------------------------------------------------------
-- 10) PRODUCTS
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id                    SERIAL PRIMARY KEY,
  category_id           INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  brand_id              INT REFERENCES brands(id) ON DELETE SET NULL,
  sku                   VARCHAR(50) UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  characteristics       JSONB DEFAULT '{}'::jsonb,
  price                 NUMERIC(10,2) NOT NULL,
  discount_price        NUMERIC(10,2),
  weight_kg             NUMERIC(6,2),
  warranty_months       INT,
  images                TEXT[],
  tags                  TEXT[] DEFAULT '{}',
  vehicle_compatibility JSONB DEFAULT '{"brands":[],"models":[],"years":[]}'::jsonb,
  is_active             BOOLEAN DEFAULT TRUE,
  waiting_users         TEXT[] DEFAULT '{}',
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 11) PRODUCT STOCKS
-- -----------------------------------------------------------------------------
CREATE TABLE product_stocks (
  id             SERIAL PRIMARY KEY,
  product_id     INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id   INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity       INT DEFAULT 0,
  shelf_location VARCHAR(50),
  CONSTRAINT unique_product_warehouse UNIQUE(product_id, warehouse_id)
);

-- -----------------------------------------------------------------------------
-- 12) ORDERS
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  warehouse_id     INT REFERENCES warehouses(id) ON DELETE RESTRICT,
  payment_method   VARCHAR(50) CHECK (payment_method IN ('card','cash')),
  payment_status   VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  delivery_status  VARCHAR(50) DEFAULT 'processing'
                   CHECK (delivery_status IN ('processing','shipping','ready_for_pickup','delivered','cancelled','returned')),
  shipping_cost    NUMERIC(10,2) DEFAULT 0,
  total_price      NUMERIC(10,2) NOT NULL,
  delivery_address TEXT,
  customer_name    VARCHAR(150) NOT NULL,
  customer_phone   VARCHAR(20) NOT NULL,
  customer_email   VARCHAR(255),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 13) ORDER ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INT NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL,
  warehouse_id INT REFERENCES warehouses(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 14) ORDER STATUS HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE order_status_history (
  id              SERIAL PRIMARY KEY,
  order_id        INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_status VARCHAR(50),
  payment_status  VARCHAR(50),
  comment         TEXT,
  changed_by      TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 15) RETURN REQUESTS
-- -----------------------------------------------------------------------------
CREATE TABLE return_requests (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,
  images     TEXT[],
  status     VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 16) REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE reviews (
  id                   SERIAL PRIMARY KEY,
  product_id           INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id             INT REFERENCES orders(id) ON DELETE SET NULL,
  rating               INT CHECK (rating >= 1 AND rating <= 5),
  comment              TEXT,
  pros                 TEXT,
  cons                 TEXT,
  images               TEXT[],
  is_approved          BOOLEAN DEFAULT FALSE,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count        INT DEFAULT 0,
  voted_users          TEXT[] DEFAULT '{}',
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 17) WISHLISTS
-- -----------------------------------------------------------------------------
CREATE TABLE wishlists (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_product_wishlist UNIQUE(user_id, product_id)
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX idx_cities_name                  ON cities(name);
CREATE INDEX idx_warehouses_city              ON warehouses(city_id);
CREATE INDEX idx_users_city                   ON users(saved_city_id);
CREATE INDEX idx_users_email                  ON users(email);
CREATE INDEX idx_users_phone                  ON users(phone_number);
CREATE INDEX idx_category_attributes_category ON category_attributes(category_id);
CREATE INDEX idx_category_attributes_type     ON category_attributes(type);
CREATE INDEX idx_products_category            ON products(category_id);
CREATE INDEX idx_products_brand               ON products(brand_id);
CREATE INDEX idx_products_active              ON products(is_active);
CREATE INDEX idx_products_characteristics     ON products USING GIN (characteristics);
CREATE INDEX idx_products_tags                ON products USING GIN (tags);
CREATE INDEX idx_products_vehicle             ON products USING GIN (vehicle_compatibility);
CREATE INDEX idx_stocks_product               ON product_stocks(product_id);
CREATE INDEX idx_stocks_warehouse             ON product_stocks(warehouse_id);
CREATE INDEX idx_orders_user                  ON orders(user_id);
CREATE INDEX idx_orders_delivery_status       ON orders(delivery_status);
CREATE INDEX idx_orders_payment_status        ON orders(payment_status);
CREATE INDEX idx_order_items_order            ON order_items(order_id);
CREATE INDEX idx_order_status_history_order   ON order_status_history(order_id);
CREATE INDEX idx_reviews_product              ON reviews(product_id);
CREATE INDEX idx_notifications_user           ON notifications(user_id);
CREATE INDEX idx_reset_tokens_token           ON password_reset_tokens(token);

-- -----------------------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_password_hashing()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.password_hash IS DISTINCT FROM OLD.password_hash)
     AND NEW.password_hash IS NOT NULL
     AND NEW.password_hash NOT LIKE '$2a$%'
     AND NEW.password_hash NOT LIKE '$2b$%' THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_hash_password
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE handle_password_hashing();

CREATE OR REPLACE FUNCTION verify_user_password(user_id_param TEXT, pass_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = user_id_param
      AND password_hash = crypt(pass_param, password_hash)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, avatar_url, role, is_email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'first_name',
             'Пользователь'),
    COALESCE(new.raw_user_meta_data->>'avatar_url',
             'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png'),
    'user',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  R NUMERIC := 6371.0;
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN ROUND(R * c, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_order_shipping(
    target_warehouse_id INT,
    items_json JSON
)
RETURNS JSON AS $$
DECLARE
    item_record RECORD;
    prod_weight NUMERIC;
    unit_price NUMERIC;
    total_intercity_cost NUMERIC := 0;
    source_wh_id INT;
    source_lat NUMERIC;
    source_lon NUMERIC;
    target_lat NUMERIC;
    target_lon NUMERIC;
    target_city_id INT;
    dist_km NUMERIC;
    item_shipping NUMERIC;
    total_shipping NUMERIC := 0;
    max_shipping NUMERIC;
    final_shipping NUMERIC;
    detail_arr JSONB := '[]'::jsonb;
    detail_item JSONB;
    local_stock_available BOOLEAN;
    in_stock BOOLEAN DEFAULT TRUE;
    base_order_cost NUMERIC := 200;
    rate NUMERIC;
    total_weight_kg NUMERIC;
    has_intercity BOOLEAN := FALSE;
BEGIN
    SELECT c.lat, c.lon, w.city_id
    INTO target_lat, target_lon, target_city_id
    FROM warehouses w
    JOIN cities c ON c.id = w.city_id
    WHERE w.id = target_warehouse_id;

    IF target_lat IS NULL THEN
        RETURN json_build_object('total', 0, 'details', '[]'::json);
    END IF;

    FOR item_record IN 
        SELECT *
        FROM json_to_recordset(items_json) AS x(product_id INT, quantity INT)
    LOOP
        SELECT COALESCE(discount_price, price) INTO unit_price
        FROM products WHERE id = item_record.product_id;

        SELECT EXISTS (
            SELECT 1
            FROM product_stocks ps
            JOIN warehouses w ON w.id = ps.warehouse_id
            WHERE ps.product_id = item_record.product_id
              AND w.city_id = target_city_id
              AND ps.quantity >= item_record.quantity
        ) INTO local_stock_available;

        IF NOT local_stock_available THEN
            total_intercity_cost := total_intercity_cost + (unit_price * item_record.quantity);
        END IF;
    END LOOP;

    FOR item_record IN 
        SELECT *
        FROM json_to_recordset(items_json) AS x(product_id INT, quantity INT)
    LOOP
        SELECT weight_kg INTO prod_weight
        FROM products WHERE id = item_record.product_id;

        total_weight_kg := prod_weight * item_record.quantity;

        SELECT EXISTS (
            SELECT 1
            FROM product_stocks ps
            JOIN warehouses w ON w.id = ps.warehouse_id
            WHERE ps.product_id = item_record.product_id
              AND w.city_id = target_city_id
              AND ps.quantity >= item_record.quantity
        ) INTO local_stock_available;

        IF local_stock_available THEN
            dist_km := 0;
            item_shipping := 0;
            in_stock := TRUE;
        ELSE
            has_intercity := TRUE;
            SELECT ps.warehouse_id, c.lat, c.lon
            INTO source_wh_id, source_lat, source_lon
            FROM product_stocks ps
            JOIN warehouses w ON w.id = ps.warehouse_id
            JOIN cities c ON c.id = w.city_id
            WHERE ps.product_id = item_record.product_id
              AND ps.quantity >= item_record.quantity
              AND w.city_id != target_city_id
            ORDER BY haversine_distance(target_lat, target_lon, c.lat, c.lon)
            LIMIT 1;

            IF source_wh_id IS NULL THEN
                SELECT ps.warehouse_id, c.lat, c.lon
                INTO source_wh_id, source_lat, source_lon
                FROM product_stocks ps
                JOIN warehouses w ON w.id = ps.warehouse_id
                JOIN cities c ON c.id = w.city_id
                WHERE ps.product_id = item_record.product_id
                ORDER BY haversine_distance(target_lat, target_lon, c.lat, c.lon)
                LIMIT 1;
            END IF;

            IF source_wh_id IS NULL THEN
                dist_km := 99999;
                in_stock := FALSE;
                item_shipping := base_order_cost + 99999 * 10;
            ELSE
                dist_km := haversine_distance(target_lat, target_lon, source_lat, source_lon);
                in_stock := TRUE;

                IF total_weight_kg <= 5 THEN rate := 0.35;
                ELSIF total_weight_kg <= 20 THEN rate := 0.22;
                ELSIF total_weight_kg <= 50 THEN rate := 0.16;
                ELSIF total_weight_kg <= 100 THEN rate := 0.10;
                ELSE rate := 0.07;
                END IF;

                item_shipping := dist_km * total_weight_kg * rate;
            END IF;
        END IF;

        total_shipping := total_shipping + item_shipping;

        detail_item := jsonb_build_object(
            'product_id', item_record.product_id,
            'quantity', item_record.quantity,
            'weight', prod_weight,
            'distance_km', ROUND(dist_km, 1),
            'shipping_cost', item_shipping,
            'in_stock', in_stock
        );
        detail_arr := detail_arr || detail_item;
    END LOOP;

    IF has_intercity THEN
        total_shipping := total_shipping + base_order_cost;
    END IF;

    IF total_intercity_cost > 0 THEN
        max_shipping := total_intercity_cost * 0.22;
        IF total_shipping > max_shipping THEN
            final_shipping := max_shipping;
        ELSE
            final_shipping := total_shipping;
        END IF;
    ELSE
        final_shipping := 0;
    END IF;

    RETURN json_build_object(
        'total', ROUND(final_shipping),
        'details', detail_arr
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id INT, p_warehouse_id INT, p_quantity INT)
RETURNS void AS $$
BEGIN
  UPDATE product_stocks
  SET quantity = quantity - p_quantity
  WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_orders_status_history()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history(order_id, delivery_status, payment_status, comment)
    VALUES (NEW.id, NEW.delivery_status, NEW.payment_status, 'Заказ создан');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      INSERT INTO order_status_history(order_id, delivery_status, payment_status, comment)
      VALUES (NEW.id, NEW.delivery_status, NEW.payment_status, 'Статусы обновлены');
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_orders_status_history
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE trg_orders_status_history();

-- Fix notifications type constraint (удаляем promo/stock если нужно, но оставляем совместимость)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('order', 'system', 'promo', 'stock'));

-- Уникальный активный возврат
DROP INDEX IF EXISTS idx_unique_active_return;
CREATE UNIQUE INDEX idx_unique_active_return 
ON return_requests (order_id) 
WHERE (status IN ('pending', 'approved'));