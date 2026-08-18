import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { ensureDefaultCovers, defaultCoverFor } from './covers.js';

// Seed: creates base users, categories and settings only.
// No sample posts — the site's content comes from the crawler (and the
// user's own uploads via the admin panel).

function upsertUser(username, password, displayName, role, bio = '') {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role, bio)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET display_name = excluded.display_name`
  ).run(username, hash, displayName, role, bio);
  return db.prepare('SELECT id FROM users WHERE username = ?').get(username).id;
}

function upsertCategory(name, slug, description, sortOrder = 0) {
  db.prepare(
    `INSERT INTO categories (name, slug, description, sort_order)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, sort_order = excluded.sort_order`
  ).run(name, slug, description, sortOrder);
  return db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug).id;
}

// ---------- users ----------
upsertUser('admin', 'admin123', 'Site Admin', 'admin', 'Managing editor of Atlas.');
upsertUser('editor', 'editor123', 'Atlas Editorial', 'editor', 'The Atlas news desk.');

// ---------- categories ----------
// only categories that actually carry content — no empty placeholder categories
upsertCategory('Architecture', 'architecture', 'Buildings, projects and practice from around the world.', 1);
upsertCategory('World News', 'world-news', 'Breaking news and global current affairs.', 2);
upsertCategory('Technology', 'technology', 'Science, tech and innovation.', 3);
upsertCategory('Business', 'business', 'Markets, companies and the economy.', 4);
upsertCategory('Science', 'science', 'Research, discovery and the natural world.', 5);
upsertCategory('Sports', 'sports', 'Sport and games from around the world.', 6);
upsertCategory('Travel', 'travel', 'Destinations, escapes and the road less travelled.', 7);

// ---------- backfill covers ----------
// any post without a cover gets a branded default cover
ensureDefaultCovers();
{
  const noCover = db.prepare("SELECT id, slug FROM posts WHERE cover_image = '' OR cover_image IS NULL").all();
  const setCover = db.prepare('UPDATE posts SET cover_image = ? WHERE id = ?');
  for (const r of noCover) setCover.run(defaultCoverFor(r.slug), r.id);
  if (noCover.length) console.log(`[seed] backfilled ${noCover.length} default covers`);
}

// ---------- settings ----------
const settings = {
  site_name: 'Atlas',
  site_tagline: 'Architecture & design from around the world',
  site_footer: '© Atlas — Architecture & Design Magazine',
  contact_email: 'hello@atlas.example.com'
};
const set = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(settings)) set.run(k, v);

const counts = {
  users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
  categories: db.prepare('SELECT COUNT(*) AS n FROM categories').get().n,
  posts: db.prepare('SELECT COUNT(*) AS n FROM posts').get().n
};
console.log('[seed] done:', counts);
console.log('[seed] admin login → username: admin / password: admin123');
