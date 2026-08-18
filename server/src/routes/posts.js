import { Router } from 'express';
import { db, POST_SELECT, rowToPost } from '../db.js';

const router = Router();

const LIST_FIELDS = ['page', 'limit', 'category', 'tag', 'q', 'author', 'featured'];

function buildListQuery(query) {
  const where = ["p.status = 'published'"];
  const params = [];
  // "views": all-time most read; "hot": recency-weighted popularity
  const orderBy = query.sort === 'views'
    ? 'p.views DESC, p.published_at DESC'
    : query.sort === 'hot'
      ? "(p.views * 1.0 / (julianday('now') - julianday(COALESCE(p.published_at, p.created_at)) + 2)) DESC"
      : 'p.is_top DESC, p.published_at DESC';

  if (query.category) {
    where.push('c.slug = ?');
    params.push(query.category);
  }
  if (query.tag) {
    where.push(`p.id IN (
      SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug = ?
    )`);
    params.push(query.tag);
  }
  if (query.author) {
    where.push('u.username = ?');
    params.push(query.author);
  }
  if (query.q) {
    where.push('(p.title LIKE ? OR p.excerpt LIKE ? OR p.content_md LIKE ?)');
    const like = `%${query.q}%`;
    params.push(like, like, like);
  }
  if (query.featured === '1') {
    where.push('p.is_featured = 1');
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (page - 1) * limit;

  return { where: where.join(' AND '), params, page, limit, offset, orderBy };
}

/** GET /api/posts — published posts list with filters. */
router.get('/', (req, res) => {
  try {
    const { where, params, page, limit, offset, orderBy } = buildListQuery(req.query);

    const total = db.prepare(
      `SELECT COUNT(*) AS n FROM posts p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN users u ON u.id = p.author_id
        WHERE ${where}`
    ).get(...params).n;

    const rows = db.prepare(
      `${POST_SELECT}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({
      items: rows.map(rowToPost),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/posts/:slug — single published post, increments views. */
router.get('/:slug', (req, res) => {
  try {
    const row = db.prepare(
      `${POST_SELECT} WHERE p.slug = ? AND p.status = 'published'`
    ).get(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Post not found' });

    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(row.id);
    row.views = (row.views || 0) + 1;

    const tags = db.prepare(
      `SELECT t.id, t.name, t.slug FROM tags t
         JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?`
    ).all(row.id);

    const post = rowToPost(row);
    post.tags = tags;
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/posts/:id/related — same category or shared tags. */
router.get('/:id/related', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = db.prepare(
      `${POST_SELECT}
        WHERE p.status = 'published' AND p.id != ?
          AND (p.category_id = (SELECT category_id FROM posts WHERE id = ?)
               OR p.id IN (SELECT pt2.post_id FROM post_tags pt2
                            WHERE pt2.tag_id IN (SELECT tag_id FROM post_tags WHERE post_id = ?)))
        ORDER BY p.published_at DESC LIMIT 4`
    ).all(id, id, id);
    res.json(rows.map(rowToPost));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
