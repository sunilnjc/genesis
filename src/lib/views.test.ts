import assert from "node:assert/strict"
import test from "node:test"
import { pathForView, pathFromHash, viewFromPathname } from "./views.ts"

test("home path is the decide-by queue", () => {
  assert.equal(viewFromPathname("/"), "decide")
  assert.equal(pathForView("decide"), "/")
})

test("inventory is its own route", () => {
  assert.equal(viewFromPathname("/inventory"), "inventory")
  assert.equal(viewFromPathname("/inventory/"), "inventory")
  assert.equal(pathForView("inventory"), "/inventory")
})

test("legacy hashes map to separate pages", () => {
  assert.equal(pathFromHash("#inventory"), "/inventory")
  assert.equal(pathFromHash("decide"), "/")
  assert.equal(pathFromHash("#other"), null)
})
