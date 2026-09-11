#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactRoot = join(root, '.artifacts')
const outputDirectory = join(artifactRoot, 'npm')
const resolvedCommands = new Map()

export const PACKAGE_SPEC = {
  required: [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/index.js',
    'dist/index.js.map',
    'dist/index.cjs',
    'dist/index.cjs.map',
    'dist/index.d.ts',
    'dist/index.d.cts',
    'dist/cli.js',
    'dist/cli.js.map',
  ],
  maximumPackedSize: 500_000,
  maximumUnpackedSize: 1_500_000,
}

function resolveCommand(command) {
  if (process.platform !== 'win32' || !['npm', 'yarn'].includes(command)) {
    return { executable: command, prefix: [] }
  }
  if (resolvedCommands.has(command)) {
    return resolvedCommands.get(command)
  }

  const wrappers = execFileSync('where.exe', [`${command}.cmd`], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
  const cli = wrappers.map((wrapper) => join(dirname(wrapper), 'node_modules', command, command === 'npm' ? 'bin/npm-cli.js' : 'bin/yarn.js')).find(existsSync)
  if (!cli) {
    throw new Error(`cannot resolve ${command} CLI from ${wrappers.join(', ')}`)
  }

  const resolved = { executable: process.execPath, prefix: [cli] }
  resolvedCommands.set(command, resolved)
  return resolved
}

function run(command, args, options = {}) {
  const { executable, prefix } = resolveCommand(command)
  const environment = { ...process.env }
  if (command === 'npm') {
    for (const key of ['npm_config_argv', 'npm_config_version_commit_hooks', 'npm_config_version_git_message', 'npm_config_version_git_tag', 'npm_config_version_tag_prefix']) {
      delete environment[key]
    }
  }
  return execFileSync(executable, [...prefix, ...args], {
    cwd: options.cwd ?? root,
    encoding: options.encoding,
    stdio: options.encoding ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: environment,
  })
}

function normalizePath(path) {
  return path.replaceAll('\\', '/')
}

function assertArtifactOutput(path) {
  const resolved = resolve(path)
  if (resolved !== artifactRoot && !resolved.startsWith(`${artifactRoot}${sep}`)) {
    throw new Error(`refusing to clear an output outside ${artifactRoot}: ${resolved}`)
  }
}

export function validatePackResult(result, spec, expectedName, expectedVersion) {
  const errors = []
  const paths = result.files.map((file) => normalizePath(file.path))
  const allowed = new Set(spec.required)

  if (result.name !== expectedName) {
    errors.push(`expected package name ${expectedName}, got ${result.name}`)
  }
  if (result.version !== expectedVersion) {
    errors.push(`expected version ${expectedVersion}, got ${result.version}`)
  }
  for (const required of spec.required) {
    if (!paths.includes(required)) {
      errors.push(`missing required file ${required}`)
    }
  }
  for (const path of paths) {
    if (!allowed.has(path)) {
      errors.push(`file is not allowlisted: ${path}`)
    }
    if (/\.tsbuildinfo$/.test(path)) {
      errors.push(`forbidden generated file ${path}`)
    }
    if (/(?:^|\/)\.env(?:\.|$)/.test(path)) {
      errors.push(`forbidden secret file ${path}`)
    }
  }
  if (result.size > spec.maximumPackedSize) {
    errors.push(`packed size ${result.size} exceeds ${spec.maximumPackedSize}`)
  }
  if (result.unpackedSize > spec.maximumUnpackedSize) {
    errors.push(`unpacked size ${result.unpackedSize} exceeds ${spec.maximumUnpackedSize}`)
  }
  if (errors.length > 0) {
    throw new Error(`${expectedName}:\n- ${errors.join('\n- ')}`)
  }
}

function repositoryUrl(manifest) {
  return typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
}

function validateManifest(manifest) {
  if (!manifest.name || !manifest.version) {
    throw new Error('package name and version are required')
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\.git$/.test(repositoryUrl(manifest) ?? '')) {
    throw new Error('repository must be a canonical GitHub HTTPS .git URL')
  }
  if (!manifest.homepage) {
    throw new Error('homepage is required')
  }
  if (!manifest.bugs?.url?.endsWith('/issues')) {
    throw new Error('bugs.url must point to GitHub Issues')
  }
  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    throw new Error('keywords are required')
  }
  if (manifest.publishConfig?.access !== 'public') {
    throw new Error('publishConfig.access must be public')
  }
  if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org/') {
    throw new Error('publishConfig.registry must be the public npm registry')
  }

  const targets = [
    manifest.main,
    manifest.module,
    manifest.types,
    manifest.exports?.['.']?.import?.types,
    manifest.exports?.['.']?.import?.default,
    manifest.exports?.['.']?.require?.types,
    manifest.exports?.['.']?.require?.default,
    manifest.exports?.['./package.json'],
  ]
  for (const target of targets) {
    if (!target || !existsSync(join(root, target))) {
      throw new Error(`package export target does not exist: ${target ?? '<missing>'}`)
    }
  }

  const binary = manifest.bin?.['rfc4512-parser']
  if (!binary || !existsSync(join(root, binary))) {
    throw new Error('rfc4512-parser binary target is missing')
  }
  if (!readFileSync(join(root, binary), 'utf8').startsWith('#!/usr/bin/env node')) {
    throw new Error('rfc4512-parser must retain its node shebang')
  }
}

function pack(manifest) {
  const raw = run('npm', ['pack', '--json', '--pack-destination', outputDirectory], { encoding: 'utf8' })
  const [result] = JSON.parse(raw)
  validatePackResult(result, PACKAGE_SPEC, manifest.name, manifest.version)
  const path = join(outputDirectory, result.filename)
  if (!existsSync(path)) {
    throw new Error(`npm did not create ${path}`)
  }
  return { ...result, path }
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function smokeInstalledTarball(artifact, manifest) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'rfc4512-package-smoke-'))
  try {
    writeFileSync(join(temporaryRoot, 'package.json'), `${JSON.stringify({ name: 'rfc4512-package-smoke', version: '1.0.0', private: true, type: 'module' }, null, 2)}\n`)
    run('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', '--no-package-lock', artifact.path], { cwd: temporaryRoot })

    const definition = "( 2.5.6.6 NAME 'person' SUP top STRUCTURAL MUST sn )"
    writeFileSync(
      join(temporaryRoot, 'consumer.mjs'),
      `import { parseSchema } from '${manifest.name}'\nconst result = parseSchema(${JSON.stringify(definition)})\nif (result.oid !== '2.5.6.6') throw new Error('ESM parse failed')\n`,
    )
    writeFileSync(
      join(temporaryRoot, 'consumer.cjs'),
      `const { parseSchema } = require('${manifest.name}')\nconst result = parseSchema(${JSON.stringify(definition)})\nif (result.oid !== '2.5.6.6') throw new Error('CommonJS parse failed')\n`,
    )
    run(process.execPath, ['consumer.mjs'], { cwd: temporaryRoot })
    run(process.execPath, ['consumer.cjs'], { cwd: temporaryRoot })

    writeFileSync(join(temporaryRoot, 'consumer.ts'), `import { parseSchema } from '${manifest.name}'\nparseSchema(${JSON.stringify(definition)})\n`)
    writeFileSync(join(temporaryRoot, 'consumer.cts'), `import { parseSchema } from '${manifest.name}'\nparseSchema(${JSON.stringify(definition)})\n`)
    writeFileSync(
      join(temporaryRoot, 'tsconfig.json'),
      `${JSON.stringify({ compilerOptions: { strict: true, noEmit: true, module: 'Node16', moduleResolution: 'Node16', target: 'ES2022', skipLibCheck: false }, include: ['consumer.ts', 'consumer.cts'] }, null, 2)}\n`,
    )
    run(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], { cwd: temporaryRoot })

    const binaryLink = join(temporaryRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'rfc4512-parser.cmd' : 'rfc4512-parser')
    if (!existsSync(binaryLink)) {
      throw new Error('installed rfc4512-parser binary link is missing')
    }
    const installedBinary = join(temporaryRoot, 'node_modules', ...manifest.name.split('/'), manifest.bin['rfc4512-parser'])
    const output = run(process.execPath, [installedBinary, '--help'], { cwd: temporaryRoot, encoding: 'utf8' })
    if (!output.includes('rfc4512-parser')) {
      throw new Error(`installed binary smoke test failed: ${output}`)
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}

async function main() {
  const unknown = process.argv.slice(2).filter((argument) => argument !== '--check')
  if (unknown.length > 0) {
    throw new Error(`unknown argument(s): ${unknown.join(', ')}`)
  }

  run('yarn', ['build'])
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  validateManifest(manifest)
  assertArtifactOutput(outputDirectory)
  rmSync(outputDirectory, { recursive: true, force: true })
  mkdirSync(outputDirectory, { recursive: true })

  const artifact = pack(manifest)
  smokeInstalledTarball(artifact, manifest)
  const checksumPath = join(outputDirectory, 'SHA256SUMS.txt')
  writeFileSync(checksumPath, `${sha256File(artifact.path)}  ${basename(artifact.path)}\n`, 'utf8')

  if (statSync(artifact.path).size !== artifact.size) {
    throw new Error('packed size changed after npm pack')
  }
  console.log(`${artifact.name}@${artifact.version}: ${normalizePath(relative(root, artifact.path))} (${artifact.entryCount} files, ${artifact.size} bytes)`)
  console.log(`Checksums: ${normalizePath(relative(root, checksumPath))}`)
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`)
    process.exit(1)
  })
}
