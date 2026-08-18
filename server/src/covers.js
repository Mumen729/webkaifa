import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { netFetch } from './net.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
const crawlDir = path.join(uploadsDir, 'crawl');
const defaultsDir = path.join(uploadsDir, 'defaults');
fs.mkdirSync(crawlDir, { recursive: true });
fs.mkdirSync(defaultsDir, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 AtlasBot/1.0';

const VARIANTS = [
  { from: '#5b7a9d', to: '#16253c', glyph: '⌂' },
  { from: '#9c8a6b', to: '#4e4030', glyph: '▣' },
  { from: '#6b8f71', to: '#2f4634', glyph: '⌁' },
  { from: '#a5764f', to: '#5d3a20', glyph: '❋' },
  { from: '#7a5b9e', to: '#2f2340', glyph: '✦' }
];

function svgFor(v) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="450" viewBox="0 0 750 450">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${v.from}"/><stop offset="1" stop-color="${v.to}"/>
  </linearGradient></defs>
  <rect width="750" height="450" fill="url(#g)"/>
  <text x="702" y="408" font-family="Georgia, serif" font-size="250" fill="rgba(255,255,255,0.22)" text-anchor="end">${v.glyph}</text>
  <text x="38" y="414" font-family="Georgia, serif" font-size="32" fill="rgba(255,255,255,0.85)" letter-spacing="8">ATLAS</text>
</svg>`;
}

/** Write the branded default-cover SVGs once. */
export function ensureDefaultCovers() {
  VARIANTS.forEach((v, i) => {
    const file = path.join(defaultsDir, `default-${i + 1}.svg`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, svgFor(v), 'utf8');
  });
}

/** Deterministic default cover URL for a slug/hash seed. */
export function defaultCoverFor(seed) {
  let h = 0;
  for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `/uploads/defaults/default-${(Math.abs(h) % VARIANTS.length) + 1}.svg`;
}

/** Detect real image extension from magic bytes (jpg/png/webp/gif/avif) or null. */
export function imageExt(buf) {
  if (!buf || buf.length < 16) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'gif';
  const box = buf.subarray(4, 12).toString('latin1');
  if (box.startsWith('ftyp') && (box.includes('avif') || box.includes('avis'))) return 'avif';
  return null;
}

/** Download an image to /uploads/crawl and return the local URL, or null. */
export async function downloadImage(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) return null;
  try {
    const res = await netFetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, Referer: url },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800 || buf.length > 6 * 1024 * 1024) return null;
    const ext = imageExt(buf);
    if (!ext) return null; // not a real image (html page, redirect body, …)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(crawlDir, name), buf);
    return `/uploads/crawl/${name}`;
  } catch {
    return null;
  }
}
