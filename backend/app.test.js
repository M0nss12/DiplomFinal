process.env.NODE_ENV='test'
process.env.SUPABASE_URL='https://test.supabase.co'
process.env.SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_key'
process.env.ADMIN_SECRET='test_admin_secret'
process.env.EMAIL_USER='test@apexdrive.ru'
process.env.BREVO_API_KEY='test_brevo_key'
const request=require('supertest')
const axios=require('axios')
const chain=()=>({
  select:jest.fn().mockReturnThis(),insert:jest.fn().mockReturnThis(),update:jest.fn().mockReturnThis(),
  delete:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),neq:jest.fn().mockReturnThis(),
  gte:jest.fn().mockReturnThis(),gt:jest.fn().mockReturnThis(),or:jest.fn().mockReturnThis(),
  in:jest.fn().mockReturnThis(),ilike:jest.fn().mockReturnThis(),not:jest.fn().mockReturnThis(),
  order:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),
  single:jest.fn(()=>Promise.resolve({data:{id:1,name:'Mock'},error:null})),
  maybeSingle:jest.fn(()=>Promise.resolve({data:{id:1},error:null})),
  then:jest.fn(cb=>Promise.resolve({data:[{id:1,name:'Mock'}],error:null}).then(cb))
})
let tables={}
const mockSupabase={
  from:jest.fn(t=>tables[t]||chain()),
  rpc:jest.fn(()=>Promise.resolve({data:{total:500,details:[]},error:null})),
  storage:{from:jest.fn(()=>({upload:jest.fn(()=>Promise.resolve({data:{},error:null})),getPublicUrl:jest.fn(()=>({data:{publicUrl:'http://mock.url/file.png'}})),remove:jest.fn(()=>Promise.resolve({data:{},error:null}))}))}
}
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn(()=>mockSupabase)}))
jest.mock('axios')
axios.post.mockResolvedValue({data:{success:true}})
axios.get.mockResolvedValue({data:{Valute:{USD:{Value:90},EUR:{Value:100},CNY:{Value:13}}}})
jest.mock('fs',()=>({...jest.requireActual('fs'),existsSync:jest.fn(()=>true),mkdirSync:jest.fn(),
  readFileSync:jest.fn(()=>'{"id":"1","timestamp":"01.01.2026","action":"POST","message":"OK"}\n'),
  writeFileSync:jest.fn(),appendFile:jest.fn((p,d,cb)=>cb(null))}))
const app=require('./server')
afterAll(()=>{app.server&&app.server.close&&app.server.close()})
const admin={'x-admin-key':'test_admin_secret'}
describe('ApexDrive API tests',()=>{
  beforeEach(()=>{
    jest.clearAllMocks()
    tables={}
    tables['categories']=chain()
    tables['products']=chain()
    tables['cities']=chain()
    tables['warehouses']=chain()
    tables['product_stocks']=chain()
    tables['users']=chain()
    tables['orders']=chain()
    tables['order_items']=chain()
    tables['notifications']=chain()
    tables['password_reset_tokens']=chain()
    tables['return_requests']=chain()
    tables['wishlists']=chain()
  })
  test('POST /api/upload/:folder',async()=>{
    const r=await request(app).post('/api/upload/avatars').attach('file',Buffer.from('img'),'test.png')
    expect(r.status).toBe(200)
    expect(r.body.url).toBe('http://mock.url/file.png')
  })
  test('DELETE /api/storage/:bucket/:filename',async()=>{
    const r=await request(app).delete('/api/storage/avatars/old.png').set(admin)
    expect(r.status).toBe(200)
    expect(r.body.success).toBe(true)
  })
  test('GET /api/categories',async()=>{
    const r=await request(app).get('/api/categories')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body)).toBe(true)
  })
  test('GET /api/global-search?q=test',async()=>{
    const r=await request(app).get('/api/global-search?q=test')
    expect(r.status).toBe(200)
    expect(r.body).toHaveProperty('products')
    expect(r.body).toHaveProperty('categories')
  })
  test('POST /api/public/shipping-estimate',async()=>{
    const r=await request(app).post('/api/public/shipping-estimate').send({warehouse_id:2,items:[{product_id:1,quantity:1}]})
    expect(r.status).toBe(200)
    expect(r.body.total).toBe(500)
  })
  test('POST /api/users/login',async()=>{
    tables['users'].maybeSingle.mockResolvedValueOnce({data:{id:'u1',first_name:'Ivan'},error:null})
    mockSupabase.rpc.mockResolvedValueOnce({data:true,error:null})
    const r=await request(app).post('/api/users/login').send({login:'ivan@test.ru',password:'123456'})
    expect(r.status).toBe(200)
    expect(r.body.id).toBe('u1')
  })
  test('PUT /api/users/profile/:id',async()=>{
    const r=await request(app).put('/api/users/profile/u1').send({first_name:'Alex'})
    expect(r.status).toBe(200)
  })
  test('POST /api/orders',async()=>{
    tables['warehouses'].single.mockResolvedValueOnce({data:{id:1,address:'addr',cities:{id:1,name:'Moscow',lat:55,lon:37}},error:null})
    mockSupabase.rpc.mockResolvedValueOnce({data:{total:350,details:[]},error:null})
    tables['products'].single.mockResolvedValueOnce({data:{id:1,price:1200,discount_price:null},error:null})
    tables['warehouses'].select.mockReturnThis(); tables['warehouses'].eq.mockReturnThis()
    tables['warehouses'].then.mockImplementationOnce(cb=>Promise.resolve({data:[{id:1}],error:null}).then(cb))
    tables['product_stocks'].select.mockReturnThis(); tables['product_stocks'].eq.mockReturnThis()
    tables['product_stocks'].gte.mockReturnThis(); tables['product_stocks'].in.mockReturnThis()
    tables['product_stocks'].limit.mockReturnThis()
    tables['product_stocks'].maybeSingle.mockResolvedValueOnce({data:{warehouse_id:1,quantity:10},error:null})
    tables['product_stocks'].single.mockResolvedValueOnce({data:{quantity:10},error:null})
    tables['product_stocks'].update.mockReturnThis(); tables['product_stocks'].eq.mockReturnThis()
    tables['product_stocks'].then.mockImplementationOnce(cb=>Promise.resolve({error:null}).then(cb))
    tables['orders'].select.mockReturnThis()
    tables['orders'].then.mockImplementationOnce(cb=>Promise.resolve({data:[{id:101}],error:null}).then(cb))
    tables['order_items'].insert.mockReturnThis()
    tables['order_items'].then.mockImplementationOnce(cb=>Promise.resolve({error:null}).then(cb))
    const r=await request(app).post('/api/orders').send({customer_name:'Test',customer_email:'t@t.ru',customer_phone:'+79990000000',warehouse_id:1,payment_method:'card',items:[{product_id:1,quantity:1}]})
    expect(r.status).toBe(200)
    expect(r.body.orderId).toBe(101)
  })
  test('PATCH /api/orders/:id',async()=>{
    tables['orders'].maybeSingle.mockResolvedValueOnce({data:{id:10,user_id:'u1',delivery_status:'processing'},error:null})
    tables['order_items'].select.mockReturnThis(); tables['order_items'].eq.mockReturnThis()
    tables['order_items'].then.mockImplementationOnce(cb=>Promise.resolve({data:[{product_id:1,quantity:1,warehouse_id:1}],error:null}).then(cb))
    tables['product_stocks'].maybeSingle.mockResolvedValueOnce({data:{quantity:5},error:null})
    tables['product_stocks'].update.mockReturnThis(); tables['product_stocks'].eq.mockReturnThis()
    tables['product_stocks'].then.mockImplementationOnce(cb=>Promise.resolve({error:null}).then(cb))
    tables['orders'].update.mockReturnThis(); tables['orders'].eq.mockReturnThis(); tables['orders'].select.mockReturnThis()
    tables['orders'].single.mockResolvedValueOnce({data:{id:10,delivery_status:'cancelled'},error:null})

    const r=await request(app).patch('/api/orders/10').set('x-user-id','u1').send({delivery_status:'cancelled'})
    expect(r.status).toBe(200)
  })
  test('POST /api/admin/return_requests',async()=>{
    tables['return_requests'].maybeSingle.mockResolvedValueOnce({data:null,error:null})
    tables['return_requests'].select.mockReturnThis()
    tables['return_requests'].single.mockResolvedValueOnce({data:{id:5,order_id:10,user_id:'u1',reason:'br',status:'pending'},error:null})
    const r=await request(app).post('/api/admin/return_requests').set(admin).send({order_id:10,user_id:'u1',reason:'br'})
    expect(r.status).toBe(200)
  })
  test('GET /api/admin/system/logs',async()=>{
    const r=await request(app).get('/api/admin/system/logs?type=actions').set(admin)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body)).toBe(true)
  })
  test('GET /api/admin/users',async()=>{
    const r=await request(app).get('/api/admin/users').set(admin)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body)).toBe(true)
  })
  test('GET /api/marketing/currency',async()=>{
    const r=await request(app).get('/api/marketing/currency')
    expect(r.status).toBe(200)
    expect(r.body.usd).toBe('90.00')
    expect(r.body.eur).toBe('100.00')
  })
  test('POST /api/feedback/send',async()=>{
    const r=await request(app).post('/api/feedback/send').send({name:'Ivan',contact:'ivan@mail.ru',message:'Help'})
    expect(r.status).toBe(200)
    expect(r.body.success).toBe(true)
  })
  test('GET /',async()=>{
    const r=await request(app).get('/')
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toMatch(/html/)
  })
})