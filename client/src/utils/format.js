/** Human-friendly relative time, e.g. "3 hours ago". */
export function timeAgo(input) {
  if (!input) return '';
  const date = new Date(String(input).includes('T') ? input : input.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Absolute date, e.g. "Mar 14, 2026". */
export function fmtDate(input) {
  if (!input) return '';
  const date = new Date(String(input).includes('T') ? input : input.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Deterministic gradient for placeholder covers. */
export function gradientFor(str = '') {
  const palettes = [
    ['#5b7a9d', '#16253c'],
    ['#9c8a6b', '#4e4030'],
    ['#6b8f71', '#2f4634'],
    ['#a5764f', '#5d3a20'],
    ['#7a8f9c', '#33424d'],
    ['#8f6f7a', '#42303a'],
    ['#7a5b9e', '#2f2340'],
    ['#4c8a7d', '#1c3d36']
  ];
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = palettes[h % palettes.length];
  return `linear-gradient(150deg, ${a} 0%, ${b} 100%)`;
}

export const fmtViews = (n) => (Number(n) || 0).toLocaleString('en-US');
