import { Database } from 'bun:sqlite'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Migration runner using Bun's native sqlite module.
 * Automatically runs all SQL migrations in the specified directory.
 */
export function runMigrations(dbPath: string, migrationsDir: string): void {
  // Ensure the parent directory for the database exists
  const parentDir = path.dirname(dbPath)
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true })
  }

  const db = new Database(dbPath)

  // Set WAL mode for better concurrency
  db.run('PRAGMA journal_mode = WAL;')

  // Create migrations schema tracking table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      run_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
    db.close()
    return
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const migrationName = path.parse(file).name

    // Check if migration has already run
    const row = db.prepare('SELECT id FROM _migrations WHERE name = ?').get(migrationName)
    if (row) {
      continue
    }

    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf8')

    // Run migration in a transaction block
    db.run('BEGIN TRANSACTION;')
    try {
      db.run(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migrationName)
      db.run('COMMIT;')
      console.info(`Running database migration: ${migrationName}`)
    } catch (err) {
      db.run('ROLLBACK;')
      db.close()
      throw err
    }
  }

  db.close()
}
