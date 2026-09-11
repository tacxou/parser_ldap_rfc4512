import assert from 'node:assert/strict'
import test from 'node:test'
import { PACKAGE_SPEC, validatePackResult } from '../package.mjs'

function validResult() {
  return {
    name: '@example/parser_ldap_rfc4512',
    version: '1.0.3',
    size: 100,
    unpackedSize: 200,
    files: PACKAGE_SPEC.required.map((path) => ({ path, size: 1, mode: 0o644 })),
  }
}

test('package audit accepts the exact public contract', () => {
  assert.doesNotThrow(() => validatePackResult(validResult(), PACKAGE_SPEC, '@example/parser_ldap_rfc4512', '1.0.3'))
})

test('package audit rejects missing, unexpected, generated and secret files', () => {
  const missing = validResult()
  missing.files = missing.files.filter(({ path }) => path !== 'dist/index.d.cts')
  assert.throws(() => validatePackResult(missing, PACKAGE_SPEC, missing.name, missing.version), /missing required file/)

  for (const path of ['src/index.ts', 'dist/.tsbuildinfo', '.env.production']) {
    const polluted = validResult()
    polluted.files.push({ path, size: 10, mode: 0o600 })
    assert.throws(() => validatePackResult(polluted, PACKAGE_SPEC, polluted.name, polluted.version), /allowlisted|forbidden/)
  }
})

test('package audit enforces identity, version and size budgets', () => {
  const result = validResult()
  result.size = PACKAGE_SPEC.maximumPackedSize + 1
  assert.throws(() => validatePackResult(result, PACKAGE_SPEC, '@wrong/package', '1.0.4'), /expected package name/)
  assert.throws(() => validatePackResult(result, PACKAGE_SPEC, result.name, result.version), /packed size/)
})
