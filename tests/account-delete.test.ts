import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deleteOwnAccount } from '../src/lib/account-delete.ts'
const config = { url: 'https://gmbretmepjxrsmuxvpbn.supabase.co', anonKey: 'public', serviceRoleKey: 'server-only-test' }
const id = '11111111-1111-4111-8111-111111111111'
const request = (headers: Record<string, string> = {}) => new Request('https://ritestack.app/api/account', { method: 'DELETE', headers })
test('cookies cannot authorize account deletion', async () => {
 const response = await deleteOwnAccount(request({ cookie: 'session=anything' }), config, () => { throw Error('must not call') })
 assert.equal(response.status, 401)
})
test('confirmation is mandatory', async () => {
 assert.equal((await deleteOwnAccount(request({ authorization: 'Bearer test' }), config)).status, 400)
})
test('unverified JWT cannot delete', async () => {
 let calls = 0
 const response = await deleteOwnAccount(request({ authorization: 'Bearer invalid', 'x-ritestack-confirm': 'delete-account' }), config, async () => { calls++; return new Response(null, {status:401}) })
 assert.equal(response.status,401); assert.equal(calls,1)
})
test('deletes only identity returned by auth server', async () => {
 const calls: string[] = []
 const response = await deleteOwnAccount(request({authorization:'Bearer valid','x-ritestack-confirm':'delete-account'}), config, async (url, init) => {
  calls.push(String(url))
  if(calls.length === 1) { assert.equal(new Headers(init?.headers).get('authorization'),'Bearer valid'); return Response.json({id}) }
  assert.equal(init?.method,'DELETE'); assert.equal(String(url),`${config.url}/auth/v1/admin/users/${id}`)
  return Response.json({})
 })
 assert.equal(response.status,200); assert.equal(calls.length,2)
})
test('refuses other Supabase projects and unavailable service key', async () => {
 for(const c of [{...config,url:'https://other.supabase.co'}, {...config,serviceRoleKey:null}]) {
  assert.equal((await deleteOwnAccount(request({authorization:'Bearer valid','x-ritestack-confirm':'delete-account'}),c)).status,503)
 }
})
test('failed deletion is never reported as success', async () => {
 let calls=0
 const response=await deleteOwnAccount(request({authorization:'Bearer valid','x-ritestack-confirm':'delete-account'}),config,async()=>++calls===1?Response.json({id}):new Response(null,{status:500}))
 assert.equal(response.status,502)
})
