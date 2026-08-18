// Lightweight SEO helpers: page titles, meta description, canonical, JSON-LD.
let SITE_NAME = 'Malaysia Times';

export async function initSiteName() {
  try {
    const r = await fetch('/api/settings');
    const s = await r.json();
    if (s.site_name) SITE_NAME = s.site_name;
  } catch { /* keep default */ }
}

function ensureMeta(name) {
  let m = document.querySelector(`meta[name="${name}"]`);
  if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); }
  return m;
}

/** Set document title + meta description + canonical URL. */
export function setSEO(title, description = '') {
  document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  ensureMeta('description').content = description || '';
  const url = window.location.href.split('?')[0];
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = url;
}

/** Add NewsArticle JSON-LD (removes previous one on route change). */
export function setArticleJsonLd(post) {
  document.querySelectorAll('script[data-seo-jsonld]').forEach(s => s.remove());
  if (!post) return;
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.setAttribute('data-seo-jsonld', '1');
  el.text = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt || '',
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { '@type': 'Person', name: post.author_name },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: window.location.href,
    image: post.cover_image ? `${window.location.origin}${post.cover_image}` : undefined
  });
  document.head.appendChild(el);
}
