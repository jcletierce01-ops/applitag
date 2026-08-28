// Usage : node scripts/audit-bundle.js
// A executer apres vite build — scanne dist/assets/*.js pour detecter des
// patterns de credentials (JWT, cles API, URLs de base de donnees avec mdp).
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PATTERNS = [
  // JWT signé (header.payload.signature, les deux premiers segments commencent par eyJ)
  { name: 'JWT signe',               re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  // Cles AWS IAM
  { name: 'Cle AWS AKIA',            re: /AKIA[A-Z0-9]{16}/ },
  // Bloc PEM de cle privee
  { name: 'Cle privee PEM',          re: /-----BEGIN\s+(?:RSA\s+)?PRIVATE KEY-----/ },
  // URL de base de donnees avec identifiants (user:password@host)
  { name: 'URL DB avec credentials', re: /(?:postgres|mysql|mongodb):\/\/[^:/"']+:[^@/"']{4,}@/ },
  // Noms de variables d environnement backend qui n ont rien a faire dans le bundle frontend
  { name: 'DATABASE_URL',            re: /DATABASE_URL/ },
  { name: 'JWT_SECRET',              re: /JWT_SECRET/ },
  // Cles Stripe live (jamais cote client)
  { name: 'Cle Stripe live',         re: /sk_live_[A-Za-z0-9]{24,}/ },
  // Cles OpenAI
  { name: 'Cle OpenAI',             re: /sk-[A-Za-z0-9]{48,}/ },
  // Bearer token statique encode en dur (hors Authorization dynamique)
  { name: 'Bearer token statique',   re: /["']Bearer [A-Za-z0-9_\-.]{40,}["']/ },
]

const distDir = join(process.cwd(), 'dist', 'assets')

if (!existsSync(distDir)) {
  console.error('Erreur : dist/assets/ introuvable — lancez npm run build:prod avant cet audit.')
  process.exit(2)
}

const files = readdirSync(distDir).filter(f => f.endsWith('.js'))

if (files.length === 0) {
  console.error('Erreur : aucun chunk .js dans dist/assets/.')
  process.exit(2)
}

let found = 0

for (const file of files) {
  const content = readFileSync(join(distDir, file), 'utf8')
  for (const { name, re } of PATTERNS) {
    const match = re.exec(content)
    if (match) {
      const pos = match.index
      const excerpt = content.slice(Math.max(0, pos - 20), pos + 80).replace(/\n/g, ' ')
      console.error(`[SUSPECT] ${name}  →  ${file}`)
      console.error(`  Contexte : ...${excerpt}...`)
      found++
    }
  }
}

if (found > 0) {
  console.error(`\nAudit bundle ECHEC — ${found} pattern(s) suspect(s) detecte(s).`)
  process.exit(1)
}

console.log(`Audit bundle OK — ${files.length} chunk(s) scanne(s), aucun secret detecte.`)
