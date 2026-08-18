import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/** GET /api/authors — authors with published counts. */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.bio,
              (SELECT COUNT(*) FROM posts p
                WHERE p.author_id = u.id AND p.status = 'published') AS post_count
         FROM users u
        ORDER BY post_count DESC`
    ).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/authors/:id — single author. */
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = db.prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.bio, u.role,
              (SELECT COUNT(*) FROM posts p
                WHERE p.author_id = u.id AND p.status = 'published') AS post_count
         FROM users u WHERE u.id = ?`
    ).get(id);
    if (!row) return res.status(404).json({ error: 'Author not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
