import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const DEFAULTS = {
  site_name: 'Atlas',
  site_tagline: 'Architecture & design from around the world',
  site_footer: '© Atlas — Architecture & Design Magazine',
  contact_email: 'hello@atlas.example.com'
};

function loadSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}

/** GET /api/settings */
router.get('/', (req, res) => {
  res.json(loadSettings());
});

/** GET /api/home — aggregated data for the homepage. */
router.get('/home', (req, res) => {
  try {
    const featured = db.prepare(
      `SELECT p.*, u.display_name AS author_name, u.username AS author_username, u.avatar AS author_avatar,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT GROUP_CONCAT(t.name, '|') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id) AS tags
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published' AND p.is_featured = 1
        ORDER BY p.published_at DESC LIMIT 8`
    ).all();
    const latest = db.prepare(
      `SELECT p.*, u.display_name AS author_name, u.username AS author_username, u.avatar AS author_avatar,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT GROUP_CONCAT(t.name, '|') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id) AS tags
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published'
        ORDER BY p.is_top DESC, p.published_at DESC LIMIT 12`
    ).all();

    const trending = db.prepare(
      `SELECT p.*, u.display_name AS author_name, u.username AS author_username, u.avatar AS author_avatar,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT GROUP_CONCAT(t.name, '|') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id) AS tags
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published'
        ORDER BY p.views DESC LIMIT 6`
    ).all();

    const categories = db.prepare(
      `SELECT c.id, c.name, c.slug, c.description,
              (SELECT COUNT(*) FROM posts p
                WHERE p.category_id = c.id AND p.status = 'published') AS post_count
         FROM categories c ORDER BY c.sort_order ASC, c.name ASC LIMIT 8`
    ).all();

    const settings = loadSettings();

    res.json({
      settings,
      featured: featured.map(rowToPost),
      latest: latest.map(rowToPost),
      trending: trending.map(rowToPost),
      categories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function rowToPost(row) {
  return {
    id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt,
    cover_image: row.cover_image, category_id: row.category_id,
    category_name: row.category_name, category_slug: row.category_slug,
    author_id: row.author_id, author_name: row.author_name, author_username: row.author_username,
    author_avatar: row.author_avatar, is_featured: !!row.is_featured, is_top: !!row.is_top,
    views: row.views, source_name: row.source_name || null, source_url: row.source_url || null, is_crawled: !!row.source_url,
    tags: row.tags ? row.tags.split('|') : [],
    published_at: row.published_at, created_at: row.created_at
  };
}

export default router;
