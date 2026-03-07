import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import { nanoid } from 'nanoid';

const db = new Database('./data/judge.db');
const now = Date.now();
const username = 'pwadmin_runtime';
const email = 'pwadmin_runtime@example.com';
const name = 'Playwright Runtime Admin';
const passwordHash = hashSync('admin123', 12);

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

if (existing) {
  db.prepare(`
    UPDATE users
    SET email = ?,
        name = ?,
        class_name = ?,
        password_hash = ?,
        role = ?,
        is_active = 1,
        must_change_password = 1,
        updated_at = ?
    WHERE id = ?
  `).run(email, name, 'QA', passwordHash, 'admin', now, existing.id);
} else {
  db.prepare(`
    INSERT INTO users (
      id, username, email, name, class_name, password_hash, role,
      is_active, must_change_password, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `).run(nanoid(), username, email, name, 'QA', passwordHash, 'admin', now, now);
}

console.log(JSON.stringify({ ok: true, username }));
