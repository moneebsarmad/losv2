import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

function parseEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator), line.slice(separator + 1)]
      })
  )
}

const root = process.cwd()
const envPath = process.env.SUPABASE_ENV_FILE || path.join(root, '.env.local')
const env = parseEnv(envPath)
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const password = env.NEXT_DB_PASSWORD || process.env.NEXT_DB_PASSWORD
if (!supabaseUrl || !password) throw new Error('Supabase URL and database password are required.')

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
const poolerHost = process.env.SUPABASE_DB_POOLER_HOST || env.SUPABASE_DB_POOLER_HOST
const host = poolerHost || `db.${projectRef}.supabase.co`
const username = poolerHost ? `postgres.${projectRef}` : 'postgres'
const port = Number(process.env.SUPABASE_DB_POOLER_PORT || env.SUPABASE_DB_POOLER_PORT || 5432)
const testDirectory = path.join(root, 'supabase', 'tests')
const requestedFiles = process.argv.slice(2)
const files = (requestedFiles.length ? requestedFiles : fs.readdirSync(testDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort()

const sql = postgres({
  host,
  port,
  database: 'postgres',
  username,
  password,
  ssl: 'require',
  max: 1,
  prepare: false,
  connect_timeout: 12,
})

let failed = false
try {
  for (const file of files) {
    process.stdout.write(`\n=== ${file} ===\n`)
    try {
      const results = await sql.unsafe(fs.readFileSync(path.join(testDirectory, file), 'utf8'))
      const lines = results
        .flatMap((result) => (Array.isArray(result) ? result : []))
        .flatMap((row) => Object.values(row))
        .filter((value) => typeof value === 'string' && /^(1\.\.|ok\b|not ok\b)/.test(value))
      lines.forEach((line) => process.stdout.write(`${line}\n`))
      if (lines.some((line) => line.startsWith('not ok'))) failed = true
    } catch (error) {
      failed = true
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`SQL test error in ${file}: ${message}\n`)
      await sql.unsafe('rollback').catch(() => undefined)
    }
  }
} finally {
  await sql.end()
}

if (failed) process.exit(1)
