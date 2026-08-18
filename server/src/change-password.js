// Usage: node src/change-password.js <username> <new-password>
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.log('usage: node src/change-password.js <username> <new-password>');
  process.exit(1);
}
if (password.length < 8) {
  console.log('password must be at least 8 characters');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 10);
const info = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
if (info.changes) console.log(`[ok] password updated for "${username}"`);
else console.log(`[error] user "${username}" not found`);
