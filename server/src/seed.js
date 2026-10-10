import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { ensureConfiguredAdministrator } from './adminAccount.js';
import { initializeSqliteSchema } from './sqliteSchema.js';

const serverDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: `${serverDir}/../../.env` });

const databaseUrl = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!databaseUrl) throw new Error('Set TURSO_DATABASE_URL before initializing the Turso database.');
if (databaseUrl.startsWith('libsql://') && !authToken) throw new Error('Set TURSO_AUTH_TOKEN for the Turso database.');

const client = createClient({ url: databaseUrl, authToken });
const pool = {
  async query(sql, params = []) {
    const args = params.map((value) => {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    });
    const result = await client.execute({ sql: sql.replace(/\$(\d+)/g, '?$1'), args });
    return { rows: result.rows, rowCount: result.rowsAffected || result.rows.length };
  },
};

const categories = [
  ['os', 'Operating Systems'],
  ['networking', 'Networking + Hardware'],
  ['keycloak', 'Keycloak'],
  ['commands', 'Commands'],
  ['aws', 'AWS'],
];

try {
  await initializeSqliteSchema(pool);
  for (const [index, [slug, name]] of categories.entries()) {
    await pool.query(`INSERT INTO categories (slug, name, color, sort_order) VALUES ($1, $2, 'blue', $3)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order`, [slug, name, index + 1]);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set a real, valid ADMIN_EMAIL.');
  if (!password) throw new Error('Set ADMIN_PASSWORD before creating the administrator.');

  const adminResult = await ensureConfiguredAdministrator({ pool, email, password });
  console.log(`Initialized ${categories.length} sections in Turso. Administrator: ${email} (${adminResult})`);
} finally {
  client.close();
}
