// app.failed.test.js — ФАЙЛ С ПРОВАЛЕННЫМИ ТЕСТАМИ (FAILED)
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

describe('🛑 ApexDrive FAILED API tests (Ожидаем провал всех 17 тестов)',()=>{
  beforeEach(()=>{
    jest.clearAllMocks(); tables={}
    'categories,products,cities,warehouses,product_stocks,users,orders,order_items,notifications,password_reset_tokens,return_requests,wishlists'
      .split(',').forEach(t=>tables[t]=chain())
  })

  test('1. GET /api/admin/users без ключа → ПРОВАЛ (ждем 200 вместо 403)',async()=>{
    const r=await request(app).get('/api/admin/users')
    expect(r.status).toBe(200); // Сервер вернет 403
  })

  test('2. GET /api/admin/users с неверным ключом → ПРОВАЛ (ждем 200 вместо 403)',async()=>{
    const r=await request(app).get('/api/admin/users').set('x-admin-key','hacker_key')
    expect(r.status).toBe(200); // Сервер вернет 403
  })

  test('3. PATCH /api/orders/:id без x-user-id → ПРОВАЛ (ждем 200 вместо 401)',async()=>{
    const r=await request(app).patch('/api/orders/1').send({delivery_status:'cancelled'})
    expect(r.status).toBe(200); // Сервер вернет 401
  })

  test('4. POST /api/users/login пользователь не найден → ПРОВАЛ (ждем 200 вместо 401)',async()=>{
    tables['users'].maybeSingle.mockResolvedValueOnce({data:null})
    const r=await request(app).post('/api/users/login').send({login:'ghost@mail.ru',password:'123'})
    expect(r.status).toBe(200); // Сервер вернет 401
  })

  test('5. POST /api/users/login неверный пароль → ПРОВАЛ (ждем 200 вместо 401)',async()=>{
    tables['users'].maybeSingle.mockResolvedValueOnce({data:{id:'u1'}})
    mockSupabase.rpc.mockResolvedValueOnce({data:false})
    const r=await request(app).post('/api/users/login').send({login:'admin@mail.ru',password:'wrong'})
    expect(r.status).toBe(200); // Сервер вернет 401
  })

  test('6. POST /api/users/register капча не пройдена → ПРОВАЛ (ждем 201 вместо 400)',async()=>{
    const r=await request(app).post('/api/users/register').send({email:'bot@mail.ru',password:'123',captchaToken:'bad'})
    expect(r.status).toBe(201); // Сервер вернет 400
  })

  test('7. PUT /api/users/profile/:id профиль не найден → ПРОВАЛ (ждем 200 вместо 404)',async()=>{
    tables['users'].single.mockResolvedValueOnce({data:null,error:null})
    const r=await request(app).put('/api/users/profile/u1').send({first_name:'Alex'})
    expect(r.status).toBe(200); // Сервер вернет 404
  })

  test('8. POST /api/orders склад не найден → ПРОВАЛ (ждем 200 вместо 400)',async()=>{
    tables['warehouses'].single.mockResolvedValueOnce({data:null,error:{message:'Not found'}})
    const r=await request(app).post('/api/orders').send({warehouse_id:9999,items:[]})
    expect(r.status).toBe(200); // Сервер вернет 400
  })

  test('9. POST /api/orders недостаточно остатков → ПРОВАЛ (ждем 200 вместо 409)',async()=>{
    tables['warehouses'].single.mockResolvedValueOnce({data:{id:1,cities:{id:1}},error:null})
    mockSupabase.rpc.mockResolvedValueOnce({data:{total:0},error:null})
    tables['products'].single.mockResolvedValueOnce({data:{id:1,price:1000},error:null})
    tables['product_stocks'].single.mockResolvedValueOnce({data:{quantity:0},error:null})
    const r=await request(app).post('/api/orders').send({customer_name:'T',warehouse_id:1,items:[{product_id:5,quantity:2}]})
    expect(r.status).toBe(200); // Сервер вернет 409
  })

  test('10. PATCH /api/orders/:id отмена доставленного заказа → ПРОВАЛ (ждем 200 вместо 400)',async()=>{
    tables['orders'].maybeSingle.mockResolvedValueOnce({data:{id:1,delivery_status:'delivered'},error:null})
    const r=await request(app).patch('/api/orders/1').set('x-user-id','u1').send({delivery_status:'cancelled'})
    expect(r.status).toBe(200); // Сервер вернет 400
  })

  test('11. POST /api/orders/:id/return заказ не доставлен → ПРОВАЛ (ждем 200 вместо 400)',async()=>{
    tables['orders'].single.mockResolvedValueOnce({data:{id:1,delivery_status:'shipping'},error:null})
    const r=await request(app).post('/api/orders/1/return').set('x-user-id','u1').send({reason:'bad'})
    expect(r.status).toBe(200); // Сервер вернет 400
  })

  test('12. POST /api/orders/:id/return заявка уже существует → ПРОВАЛ (ждем 200 вместо 400)',async()=>{
    tables['orders'].single.mockResolvedValueOnce({data:{id:1,delivery_status:'delivered',payment_status:'paid'},error:null})
    tables['return_requests'].maybeSingle.mockResolvedValueOnce({data:{id:10},error:null})
    const r=await request(app).post('/api/orders/1/return').set('x-user-id','u1').send({reason:'bad'})
    expect(r.status).toBe(200); // Сервер вернет 400
  })

  test('13. POST /api/upload/:folder ошибка хранилища → ПРОВАЛ (ждем 200 вместо 500)',async()=>{
    const r=await request(app).post('/api/upload/avatars').attach('file',Buffer.from('img'),'t.png')
    expect(r.status).toBe(200); // Сервер вернет 500
  })

  test('14. POST /api/feedback/send ошибка Brevo → ПРОВАЛ (ждем 200 вместо 500)',async()=>{
    const r=await request(app).post('/api/feedback/send').send({name:'1',contact:'1',message:'1'})
    expect(r.status).toBe(200); // Сервер вернет 500
  })

  test('15. GET /api/categories ошибка Supabase → ПРОВАЛ (ждем 200 вместо 500)',async()=>{
    tables['categories'].then.mockImplementationOnce(cb=>Promise.resolve({data:null,error:{message:'Err'}}).then(cb))
    const r=await request(app).get('/api/categories')
    expect(r.status).toBe(200); // Сервер вернет 500
  })

  test('16. GET /api/global-search ошибка БД → ПРОВАЛ (ждем данные, а получим пустые массивы)',async()=>{
    const r=await request(app).get('/api/global-search?q=test')
    // Сервер вернет пустые массивы [], а мы ждем, что там что-то есть
    expect(r.body.products.length).toBeGreaterThan(0);
  })

  test('17. GET /api/products/:id товар не найден → ПРОВАЛ (ждем 200 вместо 404)',async()=>{
    tables['products'].single.mockResolvedValueOnce({data:null,error:{message:'Err'}})
    const r=await request(app).get('/api/products/999')
    expect(r.status).toBe(200); // Сервер вернет 404
  })
})