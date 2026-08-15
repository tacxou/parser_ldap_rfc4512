import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Regression suite for the 1.0.2 publish bug: the tarball published to npm
 * put `index.js`/`cli.js` at the package root while `package.json` pointed
 * `main` at `dist/index.js` (a path that never existed in the published
 * package), and the grammar loader baked in the CI runner's absolute
 * `__dirname` at build time — so `parseSchema()` threw `ENOENT` for every
 * consumer outside that exact machine.
 *
 * These tests build a directory structure that mimics a real install (a
 * package living under some other project's `node_modules/`, at a path
 * that has nothing to do with where it was built) and resolve/import it
 * from there, so a reintroduction of either bug fails here instead of
 * surfacing as a runtime crash in a downstream consumer.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8'))

const SAMPLE_DEFINITION = "( 2.5.6.6 NAME 'person' DESC 'RFC2256: a person' SUP top STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword ) )"

// This suite validates dist/, but the test run can legitimately start before
// dist/ exists (CI's `test` job builds nothing but the grammar; a separate
// `build` job only runs after tests pass). Build once, up front, so the
// suite is correct standalone instead of depending on external ordering.
beforeAll(() => {
  if (!existsSync(join(repoRoot, 'dist', 'index.cjs'))) {
    execSync('yarn build', { cwd: repoRoot, stdio: 'inherit' })
  }
}, 60_000)

describe('package.json publish layout', () => {
  it('points main/module/types/bin/exports at files that exist after build', () => {
    const declaredPaths = [pkg.main, pkg.module, pkg.types, pkg.bin['rfc4512-parser'], pkg.exports['.'].import, pkg.exports['.'].require, pkg.exports['.'].types]

    for (const declaredPath of declaredPaths) {
      const resolved = join(repoRoot, declaredPath)
      expect(existsSync(resolved)).toBe(true)
    }
  })

  it('only ships dist/**, README.md and LICENSE (no stray root-level build output)', () => {
    expect(pkg.files).toEqual(expect.arrayContaining(['dist/**']))
    expect(pkg.files).not.toContain('index.js')
    expect(pkg.files).not.toContain('cli.js')
  })
})

describe('installed package (simulated node_modules layout)', () => {
  let installDir: string
  let moduleDir: string

  beforeAll(() => {
    // A path that has nothing in common with this repo's location or with
    // wherever `dist/` was built — the exact condition the old
    // `readFileSync(path.join(__dirname, './_grammars/rfc4512.pegjs'))`
    // could not survive.
    installDir = join(tmpdir(), `parser-install-test-${randomUUID()}`)
    moduleDir = join(installDir, 'node_modules', '@tacxou', 'parser_ldap_rfc4512')
    mkdirSync(moduleDir, { recursive: true })
    cpSync(join(repoRoot, 'dist'), join(moduleDir, 'dist'), { recursive: true })
    cpSync(join(repoRoot, 'package.json'), join(moduleDir, 'package.json'))
  })

  afterAll(() => {
    rmSync(installDir, { recursive: true, force: true })
  })

  it('parses via the CJS entry point from a foreign install location', () => {
    const require = createRequire(join(moduleDir, 'package.json'))
    const { parseSchema } = require(join(moduleDir, 'dist/index.cjs'))

    const result = parseSchema(SAMPLE_DEFINITION, { relaxedMode: true })

    expect(result.oid).toBe('2.5.6.6')
    expect(result.name).toBe('person')
  })

  it('parses via the ESM entry point from a foreign install location', async () => {
    const mod = await import(join(moduleDir, 'dist/index.js'))

    const result = mod.parseSchema(SAMPLE_DEFINITION, { relaxedMode: true })

    expect(result.oid).toBe('2.5.6.6')
    expect(result.name).toBe('person')
  })
})
