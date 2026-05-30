// app.failed.test.js — негативные тесты (компактный вариант)
process.env.NODE_ENV='test'
process.env.SUPABASE_URL='https://test.supabase.co'
process.env.SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_key'
process.env.ADMIN_SECRET='test_admin_secret'
process.env.EMAIL_USER='test@apexdrive.ru'
process.env.BREVO_API_KEY='test_brevo_key'
process.env.YANDEX_API_KEY='test_captcha_key'
const request=require('supertest')
const axios=require('axios')
const chain=()=>({
  select:jest.fn().mockReturnThis(),insert:jest.fn().mockReturnThis(),update:jest.fn().mockReturnThis(),
  delete:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),neq:jest.fn().mockReturnThis(),
  gte:jest.fn().mockReturnThis(),gt:jest.fn().mockReturnThis(),or:jest.fn().mockReturnThis(),
  in:jest.fn().mockReturnThis(),ilike:jest.fn().mockReturnThis(),not:jest.fn().mockReturnThis(),
  order:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),
  single:jest.fn(()=>Promise.resolve({data:null,error:{message:'Not found'}})),
  maybeSingle:jest.fn(()=>Promise.resolve({data:null,error:null})),
  then:jest.fn(cb=>Promise.resolve({data:null,error:{message:'DB Error'}}).then(cb))
})
let tables={}
const mockSupabase={
  from:jest.fn(t=>tables[t]||chain()),
  rpc:jest.fn(()=>Promise.resolve({data:null,error:{message:'RPC Error'}})),
  storage:{from:jest.fn(()=>({
    upload:jest.fn(()=>Promise.resolve({data:null,error:{message:'Storage is full'}})),
    getPublicUrl:jest.fn(()=>({data:{publicUrl:'http://mock.url/file.png'}})),
    remove:jest.fn(()=>Promise.resolve({data:null,error:{message:'Delete failed'}}))
  }))}
}
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn(()=>mockSupabase)}))
jest.mock('axios')
axios.post.mockRejectedValue(new Error('Brevo Network Error'))
axios.get.mockResolvedValue({data:{Valute:{USD:{Value:90},EUR:{Value:100},CNY:{Value:13}}}})
jest.mock('fs',()=>({...jest.requireActual('fs'),existsSync:jest.fn(()=>true),mkdirSync:jest.fn(),
  readFileSync:jest.fn(()=>{throw new Error('File read error')}),writeFileSync:jest.fn(),
  appendFile:jest.fn((p,d,cb)=>cb(null))}))
jest.mock('https',()=>({request:jest.fn((options,cb)=>{
  const res={on:jest.fn((event,handler)=>{if(event==='data')handler('{"status":"failed"}');if(event==='end')handler()}),statusCode:200}
  cb(res);return{on:jest.fn(),end:jest.fn()}
})}))
const app=require('./server')
afterAll(()=>{app.server&&app.server.close&&app.server.close()})
const admin={'x-admin-key':'test_admin_secret'}
describe('ApexDrive Negative API tests',()=>{
  beforeEach(()=>{
    jest.clearAllMocks(); tables={}
    'categories,products,cities,warehouses,product_stocks,users,orders,order_items,notifications,password_reset_tokens,return_requests,wishlists'
      .split(',').forEach(t=>tables[t]=chain())
  })
  test('GET /api/admin/users без ключа → 403',async()=>{
    const r=await request(app).get('/api/admin/users')
    expect(r.status).toBe(403);expect(r.body.error).toBe('Доступ запрещен.')
  })
  test('GET /api/admin/users с неверным ключом → 403',async()=>{
    const r=await request(app).get('/api/admin/users').set('x-admin-key','hacker_key')
    expect(r.status).toBe(403)
  })
  test('PATCH /api/orders/:id без x-user-id → 401',async()=>{
    const r=await request(app).patch('/api/orders/1').send({delivery_status:'cancelled'})
    expect(r.status).toBe(401);expect(r.body.error).toBe('Требуется авторизация')
  })
  test('POST /api/users/login пользователь не найден → 401',async()=>{
    tables['users'].maybeSingle.mockResolvedValueOnce({data:null})
    const r=await request(app).post('/api/users/login').send({login:'ghost@mail.ru',password:'123'})
    expect(r.status).toBe(401);expect(r.body.error).toBe('Пользователь не найден')
  })
  test('POST /api/users/login неверный пароль → 401',async()=>{
    tables['users'].maybeSingle.mockResolvedValueOnce({data:{id:'u1'}})
    mockSupabase.rpc.mockResolvedValueOnce({data:false})
    const r=await request(app).post('/api/users/login').send({login:'admin@mail.ru',password:'wrong'})
    expect(r.status).toBe(401);expect(r.body.error).toBe('Неверный пароль')
  })
  test('POST /api/users/register капча не пройдена → 400',async()=>{
    const r=await request(app).post('/api/users/register').send({email:'bot@mail.ru',password:'123',captchaToken:'bad'})
    expect(r.status).toBe(400);expect(r.body.error).toBe('Проверка на робота не пройдена')
  })
  test('PUT /api/users/profile/:id профиль не найден (data null, без ошибки) → 404',async()=>{
    tables['users'].single.mockResolvedValueOnce({data:null,error:null})
    const r=await request(app).put('/api/users/profile/u1').send({first_name:'Alex'})
    expect(r.status).toBe(404);expect(r.body.error).toBe('Пользователь не найден')
  })
  test('POST /api/orders склад не найден → 400',async()=>{
    tables['warehouses'].single.mockResolvedValueOnce({data:null,error:{message:'Not found'}})
    const r=await request(app).post('/api/orders').send({warehouse_id:9999,items:[]})
    expect(r.status).toBe(400);expect(r.body.error).toBe('Склад не найден')
  })
  test('POST /api/orders недостаточно остатков → 409',async()=>{
    tables['warehouses'].single.mockResolvedValueOnce({data:{id:1,address:'addr',cities:{id:1,name:'Moscow',lat:55,lon:37}},error:null})
    mockSupabase.rpc.mockResolvedValueOnce({data:{total:0},error:null})
    tables['products'].single.mockResolvedValueOnce({data:{id:1,price:1000},error:null})
    tables['warehouses'].select.mockReturnThis();tables['warehouses'].eq.mockReturnThis()
    tables['warehouses'].then.mockImplementationOnce(cb=>Promise.resolve({data:[{id:1}],error:null}).then(cb))
    tables['product_stocks'].select.mockReturnThis();tables['product_stocks'].eq.mockReturnThis()
    tables['product_stocks'].gte.mockReturnThis();tables['product_stocks'].in.mockReturnThis()
    tables['product_stocks'].limit.mockReturnThis()
    tables['product_stocks'].maybeSingle.mockResolvedValueOnce({data:{warehouse_id:1,quantity:0},error:null})
    tables['product_stocks'].single.mockResolvedValueOnce({data:{quantity:0},error:null})
    const r=await request(app).post('/api/orders').send({customer_name:'Test',customer_email:'t@t.ru',customer_phone:'+79990000000',warehouse_id:1,payment_method:'card',items:[{product_id:5,quantity:2}]})
    expect(r.status).toBe(409);expect(r.body.error).toMatch(/Недостаточно остатков/)
  })
  test('PATCH /api/orders/:id отмена доставленного заказа → 400',async()=>{
    tables['orders'].maybeSingle.mockResolvedValueOnce({data:{id:1,delivery_status:'delivered'},error:null})
    const r=await request(app).patch('/api/orders/1').set('x-user-id','u1').send({delivery_status:'cancelled'})
    expect(r.status).toBe(400);expect(r.body.error).toBe('Невозможно отменить данный заказ')
  })
  test('POST /api/orders/:id/return заказ не доставлен → 400',async()=>{
    tables['orders'].single.mockResolvedValueOnce({data:{id:1,delivery_status:'shipping',payment_status:'paid'},error:null})
    const r=await request(app).post('/api/orders/1/return').set('x-user-id','u1').send({reason:'Брак детали'})
    expect(r.status).toBe(400);expect(r.body.error).toBe('Возврат возможен только для оплаченных и полученных заказов')
  })
  test('POST /api/orders/:id/return заявка уже существует → 400',async()=>{
    tables['orders'].single.mockResolvedValueOnce({data:{id:1,delivery_status:'delivered',payment_status:'paid'},error:null})
    tables['return_requests'].select.mockReturnThis();tables['return_requests'].eq.mockReturnThis()
    tables['return_requests'].in.mockReturnThis()
    tables['return_requests'].maybeSingle.mockResolvedValueOnce({data:{id:10},error:null})
    const r=await request(app).post('/api/orders/1/return').set('x-user-id','u1').send({reason:'Не подошло'})
    expect(r.status).toBe(400);expect(r.body.error).toBe('Заявка на возврат уже подана')
  })
  test('POST /api/upload/:folder ошибка хранилища → 500',async()=>{
    const r=await request(app).post('/api/upload/avatars').attach('file',Buffer.from('img'),'test.png')
    expect(r.status).toBe(500);expect(r.body.error).toBe('Storage is full')
  })
  test('POST /api/feedback/send ошибка Brevo → 500',async()=>{
    const r=await request(app).post('/api/feedback/send').send({name:'Test',contact:'123',message:'Hello'})
    expect(r.status).toBe(500);expect(r.body.error).toBe('Не удалось отправить сообщение. Попробуйте позже.')
  })
  test('GET /api/categories ошибка Supabase → 500',async()=>{
    tables['categories'].then.mockImplementationOnce(cb=>Promise.resolve({data:null,error:{message:'Database disconnected'}}).then(cb))
    const r=await request(app).get('/api/categories')
    expect(r.status).toBe(500);expect(r.body.error).toBe('Database disconnected')
  })
  test('GET /api/global-search ошибка Supabase (возвращает 200 с пустыми массивами)',async()=>{
    tables['products'].then.mockImplementationOnce(cb=>Promise.resolve({data:null,error:{message:'Search failed'}}).then(cb))
    tables['categories'].then.mockImplementationOnce(cb=>Promise.resolve({data:null,error:{message:'Search failed'}}).then(cb))
    const r=await request(app).get('/api/global-search?q=test')
    expect(r.status).toBe(200);expect(r.body.products).toEqual([]);expect(r.body.categories).toEqual([])
  })
  test('GET /api/products/:id товар не найден → 404',async()=>{
    tables['products'].single.mockResolvedValueOnce({data:null,error:{message:'Row not found'}})
    const r=await request(app).get('/api/products/999')
    expect(r.status).toBe(404);expect(r.body.error).toBe('Товар не найден')
  })
})