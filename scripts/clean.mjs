#!/usr/bin/env node
import { rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'dist')

if (output !== join(root, 'dist')) {
  throw new Error(`refusing to clear unexpected build output: ${output}`)
}

rmSync(output, { recursive: true, force: true })
