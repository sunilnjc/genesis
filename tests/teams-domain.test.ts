import test from "node:test";
import assert from "node:assert/strict";
import {
  minorUnits,
  calendarToday,
  decimalAmount,
} from "../src/lib/teams/domain.ts";
test("team currency amounts retain exact supported precision", () => {
  assert.equal(minorUnits("150.05", "USD"), 15005);
  assert.equal(minorUnits("0.001", "KWD"), 1);
  assert.equal(minorUnits("999", "JPY"), 999);
  assert.equal(decimalAmount(15005, "USD"), "150.05");
  for (const bad of ["-1", "1e3", "NaN", "1.001", "", "900000000000000"])
    assert.throws(() => minorUnits(bad, "USD"));
  assert.throws(() => minorUnits("1.0", "JPY"));
});
test("effective date follows workspace calendar rather than UTC", () => {
  const instant = new Date("2026-09-28T21:00:00Z");
  assert.equal(calendarToday("Asia/Dubai", instant), "2026-09-29");
  assert.equal(calendarToday("America/Los_Angeles", instant), "2026-09-28");
});

import { parseCsv, previewImport, exportCsv, CSV_COLUMNS } from '../src/lib/teams/csv.ts'
test('CSV preview validates exact money, membership, dates, and duplicates',()=>{
 const members=[{user_id:'member',display_name:'owner@example.invalid'}]
 const header=CSV_COLUMNS.join(',')+'\n'
 const valid='"Design, tool",owner@example.invalid,150.05,USD,1,10,2026-10-31,2026-10-24'
 const rows=previewImport(header+valid,members,[])
 assert.equal(rows[0].row?.amount_minor,15005)
 assert.equal(rows[0].row?.owner_id,'member')
 assert.ok(previewImport(header+valid+'\n'+valid,members,[])[1].error?.includes('Duplicate'))
 assert.ok(previewImport(header+valid.replace('2026-10-31','2026-02-30'),members,[])[0].error)
 assert.ok(previewImport(header+valid,[],[])[0].error?.includes('active workspace member'))
 assert.throws(()=>parseCsv('"unterminated'))
 assert.deepEqual(parseCsv('a,"b\nline"\r\nc,"d""e"'),[['a','b\nline'],['c','d"e']])
})
test('CSV export neutralizes spreadsheet formulas and quotes names',()=>{
 assert.equal(exportCsv([['=HYPERLINK("x")','safe, value']]),'"\'=HYPERLINK(""x"")","safe, value"')
})

import { isSupabaseConfigured } from '../src/lib/auth/config.ts'
test('local Supabase requires an explicit flag and rejects non-loopback HTTP',()=>{
 const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_ENABLE_LOCAL_SUPABASE'] as const
 const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]))
 try{
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:57321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='local-fixture'
  delete process.env.NEXT_PUBLIC_ENABLE_LOCAL_SUPABASE
  assert.equal(isSupabaseConfigured(),false)
  process.env.NEXT_PUBLIC_ENABLE_LOCAL_SUPABASE='true'
  assert.equal(isSupabaseConfigured(),true)
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://example.com:57321'
  assert.equal(isSupabaseConfigured(),false)
 }finally{for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name]}}
})
