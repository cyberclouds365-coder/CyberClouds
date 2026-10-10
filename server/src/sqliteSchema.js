import { readFile } from 'node:fs/promises';

const columnMigrations = {
  app_users: {
    is_active: 'INTEGER NOT NULL DEFAULT 1',
    payment_done: 'INTEGER NOT NULL DEFAULT 0',
    payment_confirmation_email_sent: 'INTEGER NOT NULL DEFAULT 0',
    referral_code: 'TEXT',
    referred_by_user_id: 'INTEGER REFERENCES app_users(id) ON DELETE SET NULL',
    referral_rewarded: 'INTEGER NOT NULL DEFAULT 0',
    referral_rewarded_at: 'TEXT',
    login_count: 'INTEGER NOT NULL DEFAULT 0',
    last_login_at: 'TEXT',
    terms_accepted_at: 'TEXT',
  },
  auth_sessions: { last_seen_at: 'TEXT' },
  signup_verifications: {
    referred_by_user_id: 'INTEGER REFERENCES app_users(id) ON DELETE SET NULL',
    terms_accepted_at: 'TEXT',
  },
};

async function ensureColumns(pool) {
  for (const [table, columns] of Object.entries(columnMigrations)) {
    const result = await pool.query(`PRAGMA table_info("${table}")`);
    const existingColumns = new Set(result.rows.map((row) => row.name));
    for (const [column, definition] of Object.entries(columns)) {
      if (!existingColumns.has(column)) {
        await pool.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
      }
    }
  }
}

export async function initializeSqliteSchema(pool) {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const statements = schema
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  const tableStatements = statements.filter((statement) => /^CREATE TABLE\b/i.test(statement));
  const remainingStatements = statements.filter((statement) => !/^CREATE TABLE\b/i.test(statement));

  for (const statement of tableStatements) await pool.query(statement);
  await ensureColumns(pool);
  for (const statement of remainingStatements) await pool.query(statement);
}
