import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  // `src/_grammars/rfc4512.generated.js` is plain, precompiled JS (see
  // scripts/build-grammar.mjs) — bundle it in like any other source file
  // rather than treating it as an external asset.
})
