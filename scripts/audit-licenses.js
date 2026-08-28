// Usage : node scripts/audit-licenses.js
// Verifie que toutes les dependances directes (prod + dev) ont une licence
// compatible avec le deploiement commercial de l application.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'CC-BY-4.0',
  'Unlicense',
  'BlueOak-1.0.0',
  'Python-2.0',
])

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const deps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
}

let violations = 0
let skipped = 0

for (const [name] of Object.entries(deps)) {
  const pkgJsonPath = join(root, 'node_modules', name, 'package.json')

  if (!existsSync(pkgJsonPath)) {
    console.warn(`[SKIP] ${name} — package.json absent de node_modules (npm ci requis ?)`)
    skipped++
    continue
  }

  const depPkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const raw = depPkg.license ?? depPkg.licenses?.[0]?.type ?? 'UNKNOWN'
  const licStr = typeof raw === 'object' ? (raw.type ?? 'UNKNOWN') : String(raw)

  // Expressions SPDX : "(MIT AND ISC)", "MIT OR Apache-2.0" → verifier chaque terme
  const parts = licStr.replace(/[()]/g, '').split(/\s+(?:AND|OR)\s+/).map(s => s.trim())
  const ok = parts.every(p => ALLOWED.has(p))

  if (!ok) {
    console.error(`[VIOLATION] ${name}@${depPkg.version} — licence: ${licStr}`)
    violations++
  } else {
    console.log(`  OK  ${name}@${depPkg.version} — ${licStr}`)
  }
}

console.log('')
const total = Object.keys(deps).length - skipped

if (violations > 0) {
  console.error(`Audit licences ECHEC — ${violations} licence(s) non autorisee(s) parmi ${total} dependances directes.`)
  process.exit(1)
}

if (skipped > 0) {
  console.warn(`Audit licences OK avec ${skipped} package(s) ignore(s) — relancez apres npm ci.`)
} else {
  console.log(`Audit licences OK — ${total} dependance(s) directes verifiees, toutes autorisees.`)
}
