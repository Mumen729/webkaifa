import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { pathToFileURL } from 'node:url';
import { db, getOrCreateTag, getOrCreateCategory, slugify } from './db.js';
import { ensureDefaultCovers, downloadImage } from './covers.js';
import { netFetch } from './net.js';

/**
 * RSS-based content importer ("crawler") v2.
 *
 * For every feed item it:
 *   1. uses the feed's full HTML body when substantial,
 *   2. otherwise fetches the article page and extracts the main content,
 *   3. downloads the cover image to /uploads/crawl (fallback: branded default cover),
 *   4. deduplicates by source URL.
 *
 * Usage:
 *   node src/crawler.js                 # import from enabled feeds
 *   node src/crawler.js --limit 15      # max 15 items per feed
 *   node src/crawler.js --source verge  # only one feed (by key)
 *   node src/crawler.js --refresh       # delete previously crawled posts first
 */

const SOURCES = [
  {
    key: 'archd',
    name: 'ArchDaily',
    feed: 'https://www.archdaily.com/feed',
    category: 'Architecture',
    site: 'https://www.archdaily.com'
  },
  {
    key: 'dezeen',
    name: 'Dezeen',
    feed: 'https://www.dezeen.com/feed/',
    category: 'Architecture',
    site: 'https://www.dezeen.com'
  },
  {
    key: 'guardian-world',
    name: 'The Guardian — World',
    feed: 'https://www.theguardian.com/world/rss',
    category: 'World News',
    site: 'https://www.theguardian.com'
  },
  {
    key: 'guardian-tech',
    name: 'The Guardian — Technology',
    feed: 'https://www.theguardian.com/technology/rss',
    category: 'Technology',
    site: 'https://www.theguardian.com'
  },
  {
    key: 'bbc-world',
    name: 'BBC World',
    feed: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'World News',
    site: 'https://www.bbc.com'
  },
  {
    key: 'npr',
    name: 'NPR News',
    feed: 'https://feeds.npr.org/1001/rss.xml',
    category: 'World News',
    site: 'https://www.npr.org'
  },
  {
    key: 'verge',
    name: 'The Verge',
    feed: 'https://www.theverge.com/rss/index.xml',
    category: 'Technology',
    site: 'https://www.theverge.com'
  },
  {
    key: 'skynews',
    name: 'Sky News — World',
    feed: 'https://feeds.skynews.com/feeds/rss/world.xml',
    category: 'World News',
    site: 'https://news.sky.com'
  },
  {
    key: 'cnet',
    name: 'CNET News',
    feed: 'https://www.cnet.com/rss/news/',
    category: 'Technology',
    site: 'https://www.cnet.com'
  },
  {
    key: 'marketwatch',
    name: 'MarketWatch — Top Stories',
    feed: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    category: 'Business',
    site: 'https://www.marketwatch.com'
  },
  {
    key: 'euleader-world',
    name: 'uk.euleader.org',
    feed: 'https://uk.euleader.org/category/world/feed/',
    category: 'World News',
    site: 'https://uk.euleader.org'
  },
  {
    key: 'euleader-politics',
    name: 'uk.euleader.org',
    feed: 'https://uk.euleader.org/category/politics/feed/',
    category: 'World News',
    site: 'https://uk.euleader.org'
  },
  {
    key: 'euleader-science',
    name: 'uk.euleader.org',
    feed: 'https://uk.euleader.org/category/science/feed/',
    category: 'Science',
    site: 'https://uk.euleader.org'
  },
  {
    key: 'euleader-sport',
    name: 'uk.euleader.org',
    feed: 'https://uk.euleader.org/category/sport/feed/',
    category: 'Sports',
    site: 'https://uk.euleader.org'
  },
  {
    key: 'euleader-travel',
    name: 'uk.euleader.org',
    feed: 'https://uk.euleader.org/category/travel/feed/',
    category: 'Travel',
    site: 'https://uk.euleader.org'
  },
  // ---- social channels (Telegram, public pages) ----
  {
    key: 'tg-trtworld',
    name: 'TRT World (Telegram)',
    type: 'telegram',
    channel: 'trtworld',
    category: 'World News',
    site: 'https://t.me/trtworld'
  },
  {
    key: 'tg-skynews',
    name: 'Sky News (Telegram)',
    type: 'telegram',
    channel: 'skynews',
    category: 'World News',
    site: 'https://t.me/skynews'
  },
  {
    key: 'tg-apnews',
    name: 'AP News (Telegram)',
    type: 'telegram',
    channel: 'apnews',
    category: 'World News',
    site: 'https://t.me/apnews'
  }
];

const args = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 10;
// accept both "--source x" and "--source=x"
const sourceIdx = args.indexOf('--source');
const sourceArg = args.find(a => a.startsWith('--source=')) || (sourceIdx >= 0 ? `--source=${args[sourceIdx + 1]}` : undefined);
const SOURCE_KEY = sourceArg ? sourceArg.split('=')[1] : null;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 AtlasBot/1.0';

const parser = new Parser({
  timeout: 30000,
  headers: { 'User-Agent': UA },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

/* ---------------- text / html helpers ---------------- */

const KEEP_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'figure', 'figcaption', 'strong', 'em', 'b', 'i', 'a', 'img', 'br'];

/** Clean arbitrary HTML down to a safe, presentation-friendly subset. */
export function sanitizeHtml(html) {
  let s = String(html || '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<(iframe|noscript|nav|header|footer|aside|form|button|svg|canvas|video|audio|object|embed|template|input|select|textarea)[\s\S]*?<\/\1>/gi, ' ');

  s = s.replace(/<\/?([a-z][a-z0-9]*)([^>]*)>/gi, (match, tag, attrs) => {
    const t = tag.toLowerCase();
    const closing = match.startsWith('</');
    if (t === 'img') {
      const src = /src=["']([^"']+)["']/i.exec(attrs);
      return src ? `<img src="${src[1]}">` : '';
    }
    if (t === 'a') {
      const href = /href=["']([^"']+)["']/i.exec(attrs);
      return closing ? '</a>' : (href ? `<a href="${href[1]}">` : '<a>');
    }
    if (KEEP_TAGS.includes(t)) return closing ? `</${t}>` : `<${t}>`;
    return ''; // unwrap div/span/section/… (children kept)
  });

  // collapse whitespace & trim empty paragraphs
  s = s.replace(/&nbsp;/gi, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
  s = s.replace(/<p[^>]*>\s*<\/p>/gi, '').replace(/<(ul|ol)[^>]*>\s*<\/(ul|ol)>/gi, '');

  // cap inline images to 6
  const imgs = s.match(/<img/g);
  if (imgs && imgs.length > 6) {
    let n = 0;
    s = s.replace(/<img[^>]*>/g, m => (++n > 6 ? '' : m));
  }
  return s.trim();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------- page fetch / extraction ---------------- */

async function fetchUrl(url, timeoutMs) {
  const res = await netFetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Generic main-content extraction for a news article page (cheerio DOM). */
export function extractMainHtml(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, nav, header, footer, aside, form, button, svg, canvas, template').remove();

  let node = $('article').first();
  if (!node.length) {
    node = $('.entry-content, .post-content, .article-body, .story-body, .main-content, .content-body, .rich-text, .article__body, .entry').first();
  }
  if (!node.length) node = $('main').first();
  if (!node.length) {
    const ps = $('p').filter((_, el) => $(el).text().trim().length > 40);
    if (ps.length) node = ps.first().parent();
  }
  if (!node.length) return '';

  node.find('script, style, iframe, form, button, svg, aside, nav').remove();
  node.find('div, span').each((_, el) => {
    const $el = $(el);
    if (!$el.text().trim() && !$el.find('img').length) $el.remove();
  });

  const clean = sanitizeHtml($.html(node));
  return clean.length > 200 ? clean : '';
}

function extractImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.mediaContent?.[0]?.$?.url) return item.mediaContent[0].$.url;
  if (item.mediaThumbnail?.[0]?.$?.url) return item.mediaThumbnail[0].$.url;
  if (item.contentEncoded) {
    const m = item.contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
  }
  return '';
}

/** Normalize an RSS category entry (string, or object from rss-parser). */
function categoryName(c) {
  if (typeof c === 'string') return c.trim();
  if (c && typeof c === 'object') {
    // rss-parser: <category domain="…">Name</category> → { _: 'Name', $: { domain } }
    const v = c._ ?? c['#text'] ?? c.value;
    if (typeof v === 'string') return v.trim();
  }
  return '';
}

/* ---------------- reader fallback (r.jina.ai) ---------------- */

/**
 * Fetch a page through the r.jina.ai reader (bypasses many bot blocks and
 * returns clean markdown). Used when a site blocks direct page fetching.
 */
async function fetchViaReader(url) {
  try {
    const res = await netFetch(`https://r.jina.ai/${url}`, {
      headers: { 'User-Agent': UA, 'X-No-Cache': 'true' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length < 200) return null;
    if (/blocked request|too many requests|rate limit|429|502 bad gateway|403 forbidden/i.test(text.slice(0, 400))) return null;
    return text;
  } catch {
    return null;
  }
}

/* ---------------- telegram channels ---------------- */

function telegramTextToMarkdown(html) {
  let s = String(html || '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, label) => {
    const t = label.replace(/<[^>]+>/g, '').trim();
    return t ? `[${t}](${href})` : href;
  });
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"');
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function importTelegram(source) {
  const categoryId = getOrCreateCategory(source.category, `Imported from ${source.name}`);
  const crawlerUserId = ensureCrawlerUser();

  let page;
  try {
    page = await fetchUrl(`https://t.me/s/${source.channel}`, 20000);
  } catch (err) {
    console.log(`  ✗ ${source.name}: channel fetch failed — ${err.message}`);
    return { ok: false, error: err.message };
  }
  if (!page.includes('tgme_widget_message_wrap')) {
    console.log(`  ✗ ${source.name}: no messages found on channel page`);
    return { ok: false, error: 'no messages' };
  }

  const blocks = page.split('<div class="tgme_widget_message_wrap').slice(1);
  let inserted = 0, skipped = 0;

  for (const block of blocks.slice(0, LIMIT)) {
    let link = null;
    const linkM = block.match(/href="(https:\/\/t\.me\/[^"]+\/\d+)"/);
    if (linkM) link = linkM[1];
    const timeM = block.match(/<time datetime="([^"]+)"/);
    const date = timeM ? timeM[1] : null;
    if (!link || !date) { skipped++; continue; }
    if (db.prepare('SELECT id FROM posts WHERE source_url = ?').get(link)) { skipped++; continue; }

    const textM = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const mdText = textM ? telegramTextToMarkdown(textM[1]) : '';
    if (!mdText) { skipped++; continue; }

    let photo = '';
    const photoM = block.match(/tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:url\(['"]([^'"]+)['"]\)/);
    if (photoM && /cdn\d+\.telesco\.pe/i.test(photoM[1])) photo = photoM[1];

    const plain = mdText.replace(/[#*_`\[\]]/g, '').replace(/\n+/g, ' ').trim();
    const title = plain.slice(0, 90) || `Update from ${source.name}`;
    const slug = uniqueSlug(slugify(title));
    const excerpt = mdText.slice(0, 240) + (mdText.length > 240 ? '…' : '');
    const content_md = mdText.slice(0, 3000);

    // text-only messages (no photo) are skipped — no placeholder covers
    const downloaded = photo ? await downloadImage(photo) : null;
    if (!downloaded) { skipped++; continue; }
    const cover = downloaded;
    const published = new Date(date).toISOString().replace('T', ' ').slice(0, 19);

    try {
      db.prepare(
        `INSERT INTO posts (title, slug, excerpt, content_md, content_html, cover_image, category_id,
                            author_id, status, is_featured, is_top, views, source_url, source_name, published_at)
         VALUES (?, ?, ?, ?, '', ?, ?, ?, 'published', 0, 0, 0, ?, ?, ?)`
      ).run(title, slug, excerpt, content_md, cover, categoryId, crawlerUserId, link, source.name, published);
      inserted++;
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) { skipped++; continue; }
      console.log(`  ✗ item failed: ${err.message}`);
      skipped++;
    }
    await sleep(350);
  }

  console.log(`  ✓ ${source.name}: +${inserted} imported, ${skipped} skipped/duplicate`);
  return { ok: true, inserted, skipped };
}

/* ---------------- import ---------------- */

async function fetchFeedText(url) {
  return fetchUrl(url, 30000);
}

async function importFeed(source) {
  const categoryId = getOrCreateCategory(source.category, `Imported from ${source.name}`);
  const crawlerUserId = ensureCrawlerUser();

  let feed;
  try {
    const xml = await fetchFeedText(source.feed);
    feed = await parser.parseString(xml);
  } catch (err) {
    console.log(`  ✗ ${source.name}: feed fetch failed — ${err.message}`);
    return { ok: false, error: err.message };
  }

  let inserted = 0, skipped = 0, pageFetches = 0;
  const items = (feed.items || []).slice(0, LIMIT);

  for (const item of items) {
    const title = (item.title || '').trim();
    if (!title) { skipped++; continue; }
    if (db.prepare('SELECT id FROM posts WHERE source_url = ?').get(item.link)) { skipped++; continue; }

    const slug = uniqueSlug(slugify(title));

    // 1) body: prefer feed content, upgrade with a page fetch when too short,
    //    then with the r.jina.ai reader when the site blocks direct fetching
    let html = sanitizeHtml(item.contentEncoded || item.content || '');
    let readerMd = '';
    if (stripHtml(html).length < 500 && item.link) {
      try {
        const pageHtml = await fetchUrl(item.link, 15000);
        pageFetches++;
        const extracted = extractMainHtml(pageHtml);
        if (extracted) html = extracted;
      } catch { /* keep RSS body */ }
    }
    if (stripHtml(html).length < 400 && item.link && /^https?:\/\//i.test(item.link)) {
      readerMd = (await fetchViaReader(item.link)) || '';
      await sleep(600); // be polite to the reader service
    }
    const text = readerMd || stripHtml(html) || item.contentSnippet || '';
    const excerpt = text.slice(0, 260) + (text.length > 260 ? '…' : '');
    const content_md = (readerMd || text).slice(0, 6000);
    const content_html = readerMd ? '' : html;

    // 2) cover: download to /uploads/crawl; posts without a real image are
    //    skipped entirely (site policy — no default-cover placeholders for crawled content)
    let cover = '';
    let candidate = extractImage(item);
    if (!candidate && html) {
      const im = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (im) candidate = im[1];
    }
    if (candidate) cover = (await downloadImage(candidate)) || '';
    if (!cover) {
      skipped++;
      continue;
    }

    const published = (item.isoDate ? new Date(item.isoDate) : new Date(item.pubDate || Date.now()))
      .toISOString().replace('T', ' ').slice(0, 19);

    try {
      const info = db.prepare(
        `INSERT INTO posts (title, slug, excerpt, content_md, content_html, cover_image, category_id,
                            author_id, status, is_featured, is_top, views, source_url, source_name, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 0, 0, 0, ?, ?, ?)`
      ).run(title, slug, excerpt, content_md, html, cover, categoryId, crawlerUserId,
            item.link, source.name, published);

      const tagNames = (item.categories || []).slice(0, 4).map(categoryName).filter(Boolean);
      const ins = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
      for (const t of tagNames) ins.run(info.lastInsertRowid, getOrCreateTag(t.slice(0, 60)));

      inserted++;
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) { skipped++; continue; }
      console.log(`  ✗ item failed: ${err.message}`);
      skipped++;
    }
  }

  console.log(`  ✓ ${source.name}: +${inserted} imported, ${skipped} skipped/duplicate (${pageFetches} article pages fetched)`);
  return { ok: true, inserted, skipped };
}

function uniqueSlug(base) {
  let candidate = base || 'post';
  let n = 2;
  while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}

function ensureCrawlerUser() {
  let row = db.prepare('SELECT id FROM users WHERE username = ?').get('crawler');
  if (!row) {
    const info = db.prepare(
      `INSERT INTO users (username, password_hash, display_name, role, bio)
       VALUES (?, '', ?, 'editor', 'Automated importer for Atlas')`
    ).run('crawler', 'Atlas News Desk');
    return info.lastInsertRowid;
  }
  return row.id;
}

async function main() {
  ensureDefaultCovers();

  if (REFRESH) {
    const info = db.prepare('DELETE FROM posts WHERE source_url IS NOT NULL').run();
    console.log(`[crawler] --refresh: removed ${info.changes} previously crawled posts`);
  }

  console.log(`[crawler] importing up to ${LIMIT} items per feed…`);

  for (const s of SOURCES) getOrCreateCategory(s.category, `Imported from ${s.name}`);

  const targets = SOURCE_KEY
    ? SOURCES.filter(s => s.key === SOURCE_KEY)
    : SOURCES.filter(s => s.enabled !== false);
  if (!targets.length) {
    console.log(`[crawler] no source matched key "${SOURCE_KEY}"`);
    process.exit(1);
  }

  const started = Date.now();
  const results = [];
  const rssTargets = targets.filter(s => s.type !== 'telegram');
  const tgTargets = targets.filter(s => s.type === 'telegram');

  for (const source of rssTargets) {
    console.log(`\n[${source.key}] ${source.name} ← ${source.feed}`);
    results.push(await importFeed(source));
  }
  for (const source of tgTargets) {
    console.log(`\n[${source.key}] ${source.name} ← https://t.me/s/${source.channel}`);
    results.push(await importTelegram(source));
  }

  const total = results.reduce((s, r) => s + (r.inserted || 0), 0);
  const posts = db.prepare("SELECT COUNT(*) AS n FROM posts WHERE status='published'").get().n;
  console.log(`\n[crawler] done in ${((Date.now() - started) / 1000).toFixed(1)}s — inserted ${total}, published posts now: ${posts}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (isDirectRun) {
  main().catch(err => {
    console.error('[crawler] fatal:', err);
    process.exit(1);
  });
}
