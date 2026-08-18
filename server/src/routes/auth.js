import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = Router();

/** POST /api/auth/login */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const user = db.prepare(
      'SELECT id, username, password_hash, display_name, avatar, role FROM users WHERE username = ?'
    ).get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, display_name: user.display_name, avatar: user.avatar, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/auth/me */
router.get('/me', authRequired, (req, res) => {
  res.json(req.user);
});

export default router;
