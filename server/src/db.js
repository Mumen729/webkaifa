import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'news.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar        TEXT DEFAULT '',
  bio           TEXT DEFAULT '',
  role          TEXT DEFAULT 'editor',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  excerpt      TEXT DEFAULT '',
  content_md   TEXT DEFAULT '',
  content_html TEXT DEFAULT '',
  cover_image  TEXT DEFAULT '',
  category_id  INTEGER,
  author_id    INTEGER,
  status       TEXT DEFAULT 'draft',
  is_featured  INTEGER DEFAULT 0,
  is_top       INTEGER DEFAULT 0,
  views        INTEGER DEFAULT 0,
  source_url   TEXT UNIQUE,
  published_at TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`);

// ---- lightweight migrations ----
{
  const cols = db.prepare('PRAGMA table_info(posts)').all().map(c => c.name);
  if (!cols.includes('source_name')) {
    db.exec('ALTER TABLE posts ADD COLUMN source_name TEXT');
  }
}

export function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'post';
}

/** Get or create a tag by name; returns tag id. */
export function getOrCreateTag(name) {
  const slug = slugify(name);
  let row = db.prepare('SELECT id FROM tags WHERE slug = ?').get(slug);
  if (!row) {
    const info = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').run(name, slug);
    return info.lastInsertRowid;
  }
  return row.id;
}

export function getOrCreateCategory(name, description = '') {
  const slug = slugify(name);
  let row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (!row) {
    // unmanaged categories (e.g. created by the crawler) sort last
    const info = db.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, 100)')
      .run(name, slug, description);
    return info.lastInsertRowid;
  }
  return row.id;
}

export function getOrCreateUser(username, displayName, role = 'editor') {
  let row = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!row) {
    const info = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, '', displayName, role);
    return info.lastInsertRowid;
  }
  return row.id;
}

export function rowToPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content_md: row.content_md,
    content_html: row.content_html,
    cover_image: row.cover_image,
    category_id: row.category_id,
    category_name: row.category_name || null,
    category_slug: row.category_slug || null,
    author_id: row.author_id,
    author_name: row.author_name || 'Anonymous',
    author_username: row.author_username || '',
    author_avatar: row.author_avatar || '',
    status: row.status,
    is_featured: !!row.is_featured,
    is_top: !!row.is_top,
    views: row.views,
    source_name: row.source_name || null,
    source_url: row.source_url || null,
    is_crawled: !!row.source_url,
    tags: row.tags ? row.tags.split('|') : [],
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/** Base SELECT with author/category/tags joined. */
export const POST_SELECT = `
  SELECT p.*,
         u.display_name  AS author_name,
         u.username      AS author_username,
         u.avatar        AS author_avatar,
         c.name          AS category_name,
         c.slug          AS category_slug,
         (SELECT GROUP_CONCAT(t.name, '|')
            FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
           WHERE pt.post_id = p.id) AS tags
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
`;
