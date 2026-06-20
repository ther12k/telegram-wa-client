import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { runMigrations } from '../src/db/migrations'
import { Database } from 'bun:sqlite'

const TEMP_DB = path.join(__dirname, 'temp.db')
const TEMP_MIGRATIONS = path.join(__dirname, 'temp_migrations')

describe('migrations runner', () => {
  beforeEach(() => {
    if (fs.existsSync(TEMP_DB)) fs.unlinkSync(TEMP_DB)
    if (fs.existsSync(TEMP_MIGRATIONS)) fs.rmSync(TEMP_MIGRATIONS, { recursive: true, force: true })
    fs.mkdirSync(TEMP_MIGRATIONS)
  })

  afterEach(() => {
    if (fs.existsSync(TEMP_DB)) fs.unlinkSync(TEMP_DB)
    if (fs.existsSync(TEMP_MIGRATIONS)) fs.rmSync(TEMP_MIGRATIONS, { recursive: true, force: true })
  })

  it('runs new migrations successfully and tracks them', () => {
    fs.writeFileSync(
      path.join(TEMP_MIGRATIONS, '0001_init.sql'),
      `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      `,
    )
    fs.writeFileSync(
      path.join(TEMP_MIGRATIONS, '0002_add_email.sql'),
      `
      ALTER TABLE users ADD COLUMN email TEXT;
      `,
    )

    runMigrations(TEMP_DB, TEMP_MIGRATIONS)

    const db = new Database(TEMP_DB)
    const migrations = db.prepare('SELECT name FROM _migrations ORDER BY id ASC').all() as {
      name: string
    }[]
    expect(migrations).toHaveLength(2)
    expect(migrations[0]?.name).toBe('0001_init')
    expect(migrations[1]?.name).toBe('0002_add_email')

    // Verify migrations actually created elements
    const columns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
    expect(columns.map((c) => c.name)).toContain('email')
    db.close()
  })

  it('does not re-run already executed migrations', () => {
    fs.writeFileSync(
      path.join(TEMP_MIGRATIONS, '0001_init.sql'),
      `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      `,
    )

    runMigrations(TEMP_DB, TEMP_MIGRATIONS)
    runMigrations(TEMP_DB, TEMP_MIGRATIONS) // Run again

    const db = new Database(TEMP_DB)
    const migrations = db.prepare('SELECT name FROM _migrations').all()
    expect(migrations).toHaveLength(1)
    db.close()
  })
})
