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

// Premium default covers: one consistent design system (architectural arch motif +
// fine grid + soft glow + brand wordmark) across five elegant palettes.
const VARIANTS = [
  { from: '#16233f', to: '#31456e' }, // deep navy → indigo
  { from: '#241f45', to: '#4c3d7a' }, // plum → violet
  { from: '#0e3535', to: '#1f6b60' }, // deep teal → emerald
  { from: '#3b2a1e', to: '#8a5a33' }, // espresso → bronze
  { from: '#1e2834', to: '#42566c' }  // slate → steel
];

function svgFor(v) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="450" viewBox="0 0 750 450">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${v.from}"/>
      <stop offset="1" stop-color="${v.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.12" r="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.16)"/>
      <stop offset="0.55" stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M30 0H0V30" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="750" height="450" fill="url(#g)"/>
  <rect width="750" height="450" fill="url(#grid)"/>
  <rect width="750" height="450" fill="url(#glow)"/>

  <!-- architectural arch motif -->
  <g transform="translate(505 55)" opacity="0.18">
    <path d="M0 340 V150 a115 115 0 0 1 230 0 V340" fill="none" stroke="#ffffff" stroke-width="2.5"/>
    <path d="M20 340 V150 a95 95 0 0 1 190 0 V340" fill="none" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M115 20 V35" stroke="#ffffff" stroke-width="1.5"/>
    <line x1="40" y1="150" x2="190" y2="150" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>
    <line x1="30" y1="200" x2="200" y2="200" stroke="#ffffff" stroke-width="0.8" opacity="0.55"/>
    <line x1="24" y1="250" x2="206" y2="250" stroke="#ffffff" stroke-width="0.8" opacity="0.4"/>
    <line x1="18" y1="300" x2="212" y2="300" stroke="#ffffff" stroke-width="0.8" opacity="0.25"/>
  </g>

  <!-- small accent squares (city grid) -->
  <g fill="rgba(255,255,255,0.10)">
    <rect x="120" y="60" width="9" height="9"/>
    <rect x="150" y="60" width="9" height="9"/>
    <rect x="135" y="88" width="9" height="9"/>
  </g>

  <text x="40" y="402" font-family="Georgia, 'Times New Roman', serif" font-size="36" letter-spacing="12" fill="rgba(255,255,255,0.96)">ATLAS</text>
  <text x="43" y="428" font-family="Arial, Helvetica, sans-serif" font-size="11" letter-spacing="5" fill="rgba(255,255,255,0.55)">NEWS &amp; ARCHITECTURE</text>
</svg>`;
}

/** Write the branded default-cover SVGs (always regenerated with the latest design). */
export function ensureDefaultCovers() {
  VARIANTS.forEach((v, i) => {
    const file = path.join(defaultsDir, `default-${i + 1}.svg`);
    fs.writeFileSync(file, svgFor(v), 'utf8');
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
