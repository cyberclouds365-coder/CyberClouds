import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { ensureConfiguredAdministrator } from './adminAccount.js';

const serverDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(serverDir, '../../.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to initialize PostgreSQL.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const categories = [
  ['os', 'Operating Systems'],
  ['networking', 'Networking + Hardware'],
  ['keycloak', 'Keycloak'],
  ['commands', 'Commands'],
  ['aws', 'AWS'],
];

try {
  await pool.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
  for (const [index, [slug, name]] of categories.entries()) {
    await pool.query(`INSERT INTO categories (slug, name, color, sort_order) VALUES ($1, $2, 'blue', $3)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order`, [slug, name, index + 1]);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set a real, valid ADMIN_EMAIL.');
  if (!password) throw new Error('Set ADMIN_PASSWORD before creating the administrator.');

  const adminResult = await ensureConfiguredAdministrator({ pool, email, password });

  console.log(`Initialized ${categories.length} sections. Administrator: ${email} (${adminResult})`);
} finally {
  await pool.end();
}
