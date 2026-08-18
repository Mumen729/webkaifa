import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

import postsRouter from './routes/posts.js';
import categoriesRouter from './routes/categories.js';
import tagsRouter from './routes/tags.js';
import authorsRouter from './routes/authors.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import uploadRouter from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// simple request log
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- SEO: robots.txt + sitemap.xml ----------
const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`);
});

app.get('/sitemap.xml', (_req, res) => {
  const posts = db.prepare("SELECT slug FROM posts WHERE status='published' ORDER BY published_at DESC").all();
  const cats = db.prepare('SELECT slug FROM categories').all();
  const urls = [`${SITE_URL}/`];
  for (const c of cats) urls.push(`${SITE_URL}/category/${c.slug}`);
  for (const p of posts) urls.push(`${SITE_URL}/post/${p.slug}`);
  const now = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${now}</lastmod></url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/authors', authorsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', uploadRouter);

// production: serve the built frontend (client/dist) with SPA fallback
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  console.log(`[server] serving static frontend from ${distDir}`);
  app.use(express.static(distDir, {
    maxAge: 0, // no caching during this phase — every visit gets the newest build
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: `Not found: ${req.method} ${req.url}` });
  res.status(404).send('Not found');
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Atlas API listening on http://localhost:${PORT}`);
});
