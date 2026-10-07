import bcrypt from 'bcryptjs';

export async function ensureConfiguredAdministrator({ pool, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const current = await pool.query('SELECT id, role FROM app_users WHERE email = $1', [normalizedEmail]);

  if (current.rowCount) {
    if (current.rows[0].role !== 'admin') {
      throw new Error(`ADMIN_EMAIL ${normalizedEmail} belongs to a non-admin account.`);
    }
    return 'existing';
  }

  const legacy = await pool.query(
    "SELECT id FROM app_users WHERE email = $1 AND role = 'admin' ORDER BY id LIMIT 1",
    ['admin@gmail.com'],
  );
  if (legacy.rowCount) {
    await pool.query('UPDATE app_users SET email = $1 WHERE id = $2', [normalizedEmail, legacy.rows[0].id]);
    return 'updated';
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO app_users (name, email, password_hash, role, is_active) VALUES ('Site Administrator', $1, $2, 'admin', TRUE)",
    [normalizedEmail, passwordHash],
  );
  return 'created';
}
