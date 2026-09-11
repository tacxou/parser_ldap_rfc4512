#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactRoot = join(root, '.artifacts')
const defaultOutput = join(artifactRoot, 'pages')

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function ensureDirectoryIsSafe(outputDirectory) {
  const resolved = resolve(outputDirectory)
  if (resolved !== artifactRoot && !resolved.startsWith(`${artifactRoot}${sep}`)) {
    throw new Error(`refusing to clear an output outside ${artifactRoot}: ${resolved}`)
  }
}

export function buildDocs(projectRoot = root, outputDirectory = defaultOutput) {
  const manifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
  const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8').replace(/\r\n/g, '\n')
  const cli = readFileSync(join(projectRoot, 'CLI_USAGE.md'), 'utf8').replace(/\r\n/g, '\n')
  const homepage = String(manifest.homepage ?? '').replace(/\/?$/, '/')
  if (!homepage.startsWith('https://')) {
    throw new Error('package.json homepage must be an HTTPS URL')
  }

  const npmUrl = `https://www.npmjs.com/package/${manifest.name}`
  const llms = `# ${manifest.name}\n\n> ${manifest.description}\n\n- Documentation: ${homepage}\n- Complete context: ${homepage}llms-full.txt\n- CLI guide: ${homepage}CLI_USAGE.md\n- npm: ${npmUrl}\n`
  const llmsFull = `# ${manifest.name}\n\n${manifest.description}\n\nSource: ${homepage}\n\n${readme}\n\n---\n\n${cli}\n`
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(manifest.description)}">
  <title>${escapeHtml(manifest.name)} documentation</title>
  <style>body{margin:0;background:#0b1220;color:#dce7f5;font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}main{max-width:1080px;margin:auto;padding:2rem}nav{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}a{color:#72d5ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#111b2e;border:1px solid #263854;border-radius:12px;padding:1.5rem}</style>
</head>
<body><main><nav><a href="${npmUrl}">npm</a><a href="CLI_USAGE.md">CLI guide</a><a href="llms.txt">llms.txt</a><a href="llms-full.txt">llms-full.txt</a></nav><pre>${escapeHtml(readme)}</pre></main></body>
</html>
`

  ensureDirectoryIsSafe(outputDirectory)
  rmSync(outputDirectory, { recursive: true, force: true })
  mkdirSync(outputDirectory, { recursive: true })
  writeFileSync(join(outputDirectory, 'index.html'), html, 'utf8')
  writeFileSync(join(outputDirectory, 'llms.txt'), llms, 'utf8')
  writeFileSync(join(outputDirectory, 'llms-full.txt'), llmsFull, 'utf8')
  cpSync(join(projectRoot, 'CLI_USAGE.md'), join(outputDirectory, 'CLI_USAGE.md'))
  cpSync(join(projectRoot, 'LICENSE'), join(outputDirectory, 'LICENSE'))

  return { homepage, outputDirectory }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    const result = buildDocs()
    console.log(`Documentation built: ${result.outputDirectory}`)
    console.log(`Canonical URL: ${result.homepage}`)
  } catch (error) {
    console.error(`ERROR: ${error.message}`)
    process.exit(1)
  }
}
