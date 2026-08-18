import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/** GET /api/categories — with published post counts. */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.sort_order,
              (SELECT COUNT(*) FROM posts p
                WHERE p.category_id = c.id AND p.status = 'published') AS post_count
         FROM categories c
        ORDER BY c.sort_order ASC, c.name ASC`
    ).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
