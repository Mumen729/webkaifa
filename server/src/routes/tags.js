import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/** GET /api/tags — with post counts, most used first. */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT t.id, t.name, t.slug,
              (SELECT COUNT(*) FROM post_tags pt
                JOIN posts p ON p.id = pt.post_id
               WHERE pt.tag_id = t.id AND p.status = 'published') AS post_count
         FROM tags t
        ORDER BY post_count DESC, t.name ASC
        LIMIT 60`
    ).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
