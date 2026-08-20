import { Router } from 'express';
import { db, slugify, getOrCreateTag, now, POST_SELECT, rowToPost } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function uniqueSlug(base, excludeId) {
  let slug = slugify(base);
  let candidate = slug;
  let n = 2;
  for (;;) {
    const row = excludeId
      ? db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').get(candidate, excludeId)
      : db.prepare('SELECT id FROM posts WHERE slug = ?').get(candidate);
    if (!row) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

function parseTags(tagInput) {
  // Accept array of names or comma-separated string
  const names = Array.isArray(tagInput)
    ? tagInput
    : String(tagInput || '').split(',').map(s => s.trim()).filter(Boolean);
  return names.map(getOrCreateTag);
}

function setPostTags(postId, tagIds) {
  db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId);
  const ins = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
  for (const tid of tagIds) ins.run(postId, tid);
}

/** GET /api/admin/posts — all posts (any status). */
router.get('/posts', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (req.query.status) { where.push('p.status = ?'); params.push(req.query.status); }
    if (req.query.q) { where.push('(p.title LIKE ? OR p.slug LIKE ?)'); const l = `%${req.query.q}%`; params.push(l, l); }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM posts p ${w}`).get(...params).n;
    const rows = db.prepare(
      `${POST_SELECT} ${w} ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({ items: rows.map(rowToPost), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/posts/:id — single post for editing. */
router.get('/posts/:id', (req, res) => {
  try {
    const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Post not found' });
    const post = rowToPost(row);
    post.tags = db.prepare(
      'SELECT t.id, t.name, t.slug FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?'
    ).all(row.id);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/posts — create. */
router.post('/posts', (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.title.trim()) return res.status(400).json({ error: 'Title is required' });

    const slug = uniqueSlug(b.slug || b.title);
    const published_at = b.published_at || (b.status === 'published' ? now() : null);
    // manual posts get a realistic random view count too (matches crawled range)
    const views = b.views !== undefined && b.views !== null && b.views !== ''
      ? Math.max(0, parseInt(b.views, 10) || 0)
      : 1500 + Math.floor(Math.random() * (9800 - 1500 + 1));

    const info = db.prepare(
      `INSERT INTO posts (title, slug, excerpt, content_md, cover_image, category_id, author_id,
                          status, is_featured, is_top, views, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      b.title.trim(), slug, b.excerpt || '', b.content_md || '', b.cover_image || '',
      b.category_id || null, b.author_id || req.user.id, b.status || 'draft',
      b.is_featured ? 1 : 0, b.is_top ? 1 : 0, views, published_at
    );

    setPostTags(info.lastInsertRowid, parseTags(b.tags));
    const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(rowToPost(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/admin/posts/:id — update. */
router.put('/posts/:id', (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    const b = req.body || {};
    const title = b.title !== undefined ? b.title : existing.title;
    const slug = uniqueSlug(b.slug || title, id);
    let published_at = b.published_at !== undefined ? b.published_at : existing.published_at;
    if (b.status === 'published' && !existing.published_at && !b.published_at) {
      published_at = now();
    }
    const views = b.views !== undefined && b.views !== null && b.views !== ''
      ? Math.max(0, parseInt(b.views, 10) || 0)
      : existing.views;

    db.prepare(
      `UPDATE posts SET title=?, slug=?, excerpt=?, content_md=?, cover_image=?, category_id=?,
              status=?, is_featured=?, is_top=?, views=?, published_at=?, updated_at=?
       WHERE id=?`
    ).run(
      title, slug,
      b.excerpt !== undefined ? b.excerpt : existing.excerpt,
      b.content_md !== undefined ? b.content_md : existing.content_md,
      b.cover_image !== undefined ? b.cover_image : existing.cover_image,
      b.category_id !== undefined ? b.category_id : existing.category_id,
      b.status !== undefined ? b.status : existing.status,
      b.is_featured !== undefined ? (b.is_featured ? 1 : 0) : existing.is_featured,
      b.is_top !== undefined ? (b.is_top ? 1 : 0) : existing.is_top,
      views, published_at, now(), id
    );

    if (b.tags !== undefined) setPostTags(id, parseTags(b.tags));
    const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(id);
    res.json(rowToPost(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/posts/:id */
router.delete('/posts/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Post not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- categories ---------------- */

router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all());
});

router.post('/categories', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: 'Name is required' });
  const slug = uniqueSlug(b.slug || b.name);
  const info = db.prepare(
    'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)'
  ).run(b.name.trim(), slug, b.description || '', b.sort_order || 0);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/categories/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  const name = b.name !== undefined ? b.name : existing.name;
  const slug = b.slug !== undefined ? uniqueSlug(b.slug, req.params.id) : existing.slug;
  db.prepare('UPDATE categories SET name=?, slug=?, description=?, sort_order=? WHERE id=?').run(
    name, slug,
    b.description !== undefined ? b.description : existing.description,
    b.sort_order !== undefined ? b.sort_order : existing.sort_order,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/categories/:id', (req, res) => {
  db.prepare('UPDATE posts SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- tags ---------------- */

router.get('/tags', (req, res) => {
  res.json(db.prepare('SELECT * FROM tags ORDER BY name ASC').all());
});

router.post('/tags', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: 'Name is required' });
  const slug = uniqueSlug(b.name);
  const info = db.prepare('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)').run(b.name.trim(), slug);
  res.status(201).json(db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/tags/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tag not found' });
  db.prepare('UPDATE tags SET name=?, slug=? WHERE id=?').run(
    b.name !== undefined ? b.name : existing.name,
    b.slug !== undefined ? uniqueSlug(b.slug, req.params.id) : existing.slug,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id));
});

router.delete('/tags/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- settings ---------------- */

router.get('/stats', (req, res) => {
  const posts = db.prepare('SELECT COUNT(*) AS n FROM posts').get().n;
  const published = db.prepare("SELECT COUNT(*) AS n FROM posts WHERE status='published'").get().n;
  const drafts = db.prepare("SELECT COUNT(*) AS n FROM posts WHERE status='draft'").get().n;
  const categories = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  const tags = db.prepare('SELECT COUNT(*) AS n FROM tags').get().n;
  const views = db.prepare('SELECT COALESCE(SUM(views), 0) AS n FROM posts').get().n;
  res.json({ posts, published, drafts, categories, tags, views });
});

router.put('/settings', (req, res) => {
  const b = req.body || {};
  for (const key of Object.keys(b)) {
    if (key === 'site_name' || key === 'site_tagline' || key === 'site_footer' || key === 'contact_email') {
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(key, String(b[key]));
    }
  }
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  res.json(out);
});

export default router;
