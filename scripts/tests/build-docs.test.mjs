import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildDocs } from '../build-docs.mjs'

test('documentation build emits canonical and LLM entry points', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'rfc4512-docs-'))
  const output = join(process.cwd(), '.artifacts', 'tests', `docs-${process.pid}`)
  try {
    mkdirSync(fixture, { recursive: true })
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ name: '@example/parser', description: 'Parser docs', homepage: 'https://example.test/parser/' }))
    writeFileSync(join(fixture, 'README.md'), '# README\n')
    writeFileSync(join(fixture, 'CLI_USAGE.md'), '# CLI\n')
    writeFileSync(join(fixture, 'LICENSE'), 'license\n')

    buildDocs(fixture, output)
    assert.equal(existsSync(join(output, 'index.html')), true)
    assert.match(readFileSync(join(output, 'llms.txt'), 'utf8'), /https:\/\/example\.test\/parser\/llms-full\.txt/)
    assert.match(readFileSync(join(output, 'llms-full.txt'), 'utf8'), /# README[\s\S]+# CLI/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
    rmSync(output, { recursive: true, force: true })
  }
})
