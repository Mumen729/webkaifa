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
Disallow: /admin
Sitemap: ${SITE_URL}/sitemap.xml
`);
});

app.get('/sitemap.xml', (_req, res) => {
  const posts = db.prepare("SELECT slug, published_at, updated_at FROM posts WHERE status='published' ORDER BY published_at DESC").all();
  const cats = db.prepare('SELECT slug FROM categories ORDER BY sort_order').all();
  const urls = [];
  urls.push({ loc: `${SITE_URL}/`, lastmod: new Date().toISOString().slice(0, 10) });
  for (const c of cats) urls.push({ loc: `${SITE_URL}/category/${c.slug}`, lastmod: new Date().toISOString().slice(0, 10) });
  for (const p of posts) {
    urls.push({
      loc: `${SITE_URL}/post/${p.slug}`,
      lastmod: (p.updated_at || p.published_at || '').slice(0, 10)
    });
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

/* ---------- server-side SEO head injection ----------
 * The SPA sets <title>/meta in the browser, but Google and social scrapers
 * may not execute JS. Inject title, meta, Open Graph and JSON-LD directly
 * into the served index.html for article / category / home routes.
 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function absolute(u) {
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}
function buildSeoHead(seo) {
  const t = seo.title || seo.siteName || 'News';
  const d = (seo.description || '').slice(0, 160);
  const image = absolute(seo.image);
  const url = seo.url ? `${SITE_URL}${seo.url}` : SITE_URL;
  const ld = seo.jsonld || {};
  let out = '';
  out += `<title>${esc(t)}</title>\n`;
  if (d) out += `<meta name="description" content="${esc(d)}">\n`;
  out += `<meta property="og:site_name" content="${esc(seo.siteName || 'News')}">\n`;
  out += `<meta property="og:locale" content="ms_MY">\n`;
  out += `<meta property="og:type" content="${seo.type || 'website'}">\n`;
  out += `<meta property="og:title" content="${esc(t)}">\n`;
  if (d) out += `<meta property="og:description" content="${esc(d)}">\n`;
  out += `<meta property="og:url" content="${esc(url)}">\n`;
  if (image) out += `<meta property="og:image" content="${esc(image)}">\n`;
  out += `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">\n`;
  out += `<link rel="canonical" href="${esc(url)}">\n`;
  if (Object.keys(ld).length) {
    out += `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n`;
  }
  return out;
}
function injectSeo(html, head) {
  // replace the placeholder <title> in index.html and prepend meta before </head>
  const titleRe = /<title>[^<]*<\/title>/;
  const hasTitle = titleRe.test(html);
  if (hasTitle) html = html.replace(titleRe, head);
  else html = html.replace('</head>', `${head}</head>`);
  return html;
}
function seoForPost(post, category) {
  const siteName = (db.prepare('SELECT value FROM settings WHERE key = ?').get('site_name') || {}).value || 'News';
  return {
    title: post.title,
    siteName,
    description: (post.excerpt || '').replace(/\s+/g, ' ').trim(),
    image: post.cover_image,
    url: `/post/${post.slug}`,
    type: 'article',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description: (post.excerpt || '').slice(0, 200),
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      publisher: { '@type': 'Organization', name: siteName },
      mainEntityOfPage: `${SITE_URL}/post/${post.slug}`,
      ...(post.cover_image ? { image: [absolute(post.cover_image)] } : {}),
      ...(category ? { articleSection: category.name } : {})
    }
  };
}
function seoForCategory(cat) {
  const siteName = (db.prepare('SELECT value FROM settings WHERE key = ?').get('site_name') || {}).value || 'News';
  return {
    title: `${cat.name} — ${siteName}`,
    siteName,
    description: `Berita terkini dalam kategori ${cat.name} di ${siteName}.`,
    url: `/category/${cat.slug}`,
    type: 'website'
  };
}
function seoForHome() {
  const s = {};
  for (const r of db.prepare('SELECT key, value FROM settings').all()) s[r.key] = r.value;
  const siteName = s.site_name || 'News';
  return {
    title: `${siteName}${s.site_tagline ? ` — ${s.site_tagline}` : ''}`,
    siteName,
    description: (s.site_tagline || 'News portal').slice(0, 160),
    url: '/',
    type: 'website',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: SITE_URL,
      ...(s.site_tagline ? { description: s.site_tagline } : {})
    }
  };
}

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
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  // compute SEO meta for article / category / home routes
  const seoByPath = new Map();
  for (const p of db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at, p.updated_at, c.name AS category_name
    FROM posts p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published'
  `).all()) {
    const seo = seoForPost(p, p.category_name ? { name: p.category_name } : null);
    seoByPath.set(`/post/${p.slug}`, buildSeoHead(seo));
  }
  for (const c of db.prepare('SELECT slug, name FROM categories').all()) {
    seoByPath.set(`/category/${c.slug}`, buildSeoHead(seoForCategory(c)));
  }
  seoByPath.set('/', buildSeoHead(seoForHome()));

  // HTML routes get SEO-injected head BEFORE static middleware (so / is covered too)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    if (req.path.startsWith('/assets')) return next();
    if (/\.(js|css|png|jpg|jpeg|svg|ico|webp|gif|woff2?|txt|xml|map)$/i.test(req.path)) return next();
    const head = seoByPath.get(req.path) || seoByPath.get('/');
    res.send(injectSeo(indexHtml, head));
  });

  app.use(express.static(distDir, {
    maxAge: 0, // no caching during this phase — every visit gets the newest build
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    if (req.path.startsWith('/assets') || /\.(js|css|png|jpg|jpeg|svg|ico|webp|gif|woff2?|txt|xml|map)$/i.test(req.path)) return next();
    const head = seoByPath.get(req.path) || seoByPath.get('/');
    res.send(injectSeo(indexHtml, head));
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
