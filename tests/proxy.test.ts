import test from 'node:test';
import assert from 'node:assert/strict';
import { proxy } from '../packages/shared/proxy.ts';

test('each frontend serves its own static assets without invoking API',async()=>{
 for(const admin of [false,true]) {
 const response=await proxy(admin).fetch(new Request('https://site.example/'),{ASSETS:{fetch:async()=>new Response('own-assets')},API:{fetch:async()=>{throw Error('unexpected API')}}});
 assert.equal(await response.text(),'own-assets');
 }
});
test('business gateway blocks admin routes before forwarding',async()=>{
 const response=await proxy(false).fetch(new Request('https://web.example/api/admin/overview'),{ASSETS:{fetch:async()=>new Response('')},API:{fetch:async()=>{throw Error('admin forwarded')}}});
 assert.equal(response.status,404);
});
test('admin gateway preserves session, origin, request body and response cookie',async()=>{
 const request=new Request('https://admin.example/api/admin/session',{method:'POST',headers:{Origin:'https://admin.example','Content-Type':'application/json',Cookie:'test=value'},body:'{"key":"example"}'});
 const response=await proxy(true).fetch(request,{ASSETS:{fetch:async()=>{throw Error('asset route')}},API:{fetch:async(r)=>{
 assert.equal(r.url,request.url);assert.equal(r.headers.get('Origin'),'https://admin.example');assert.equal(r.headers.get('Cookie'),'test=value');assert.equal(await r.text(),'{"key":"example"}');
 return new Response('{}',{headers:{'Set-Cookie':'session=example; HttpOnly'}});
 }}});
 assert.equal(response.headers.get('Set-Cookie'),'session=example; HttpOnly');
});
