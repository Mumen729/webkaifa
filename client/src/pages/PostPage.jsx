import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import Cover from '../components/Cover.jsx';
import PostCard from '../components/PostCard.jsx';
import MarkdownView from '../components/MarkdownView.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { fmtDate, fmtViews } from '../utils/format.js';
import { setSEO, setArticleJsonLd } from '../utils/seo.js';

export default function PostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPost(null);
    setRelated([]);
    api.get(`/posts/${slug}`)
      .then(r => {
        setPost(r.data);
        setSEO(r.data.title, r.data.excerpt || '');
        setArticleJsonLd(r.data);
        return api.get(`/posts/${r.data.id}/related`);
      })
      .then(r => setRelated(r.data))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, [slug]);

  if (error) return <div className="wrap"><div className="empty"><h3>Berita tidak dijumpai</h3><p>{error}</p></div></div>;
  if (!post) return <div className="loading"><div className="spinner" /><p>Memuatkan…</p></div>;

  // The detail page already shows the cover above the body, so drop any body
  // image that is the same photo as the cover. Sources often embed the same
  // photo multiple times in different sizes (e.g. "2-1024x682.jpg" and "2.jpg"),
  // so we normalize file names and remove every occurrence of the first image.
  const normImgName = (src) => {
    const clean = String(src || '').split('?')[0].split('#')[0];
    const base = clean.substring(clean.lastIndexOf('/') + 1).toLowerCase();
    return base.replace(/-\d{2,4}x\d{2,4}(\.[a-z0-9]+)?$/, '$1');
  };
  const bodyHtml = (() => {
    if (!post.content_html) return '';
    const first = post.content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
    const key = first ? normImgName(first[1]) : '';
    if (!key) return post.content_html;
    return post.content_html
      .replace(/<img[^>]+src=["']([^"']+)["']/gi, (m, src) => normImgName(src) === key ? '' : m)
      .replace(/<figure>\s*<\/figure>/gi, '');
  })();
  const bodyMd = post.content_md
    ? post.content_md.replace(/!\[[^\]]*\]\([^)]*\)/, '')
    : '';

  return (
    <div className="wrap" style={{ paddingTop: 22 }}>
      <div className="cols" style={{ paddingTop: 0 }}>
        <div className="main-col">
          <div className="article-card">
            <div className="breadcrumb">
              <Link to="/">Laman Utama</Link>
              {post.category_slug && <> / <Link to={`/category/${post.category_slug}`}>{post.category_name}</Link></>}
            </div>

            <div className="article-head">
              <h1>{post.title}</h1>
              <div className="article-meta">
                {post.category_name && <span className="chip">{post.category_name}</span>}
                <span>{fmtDate(post.published_at)}</span>
                <span>{fmtViews(post.views)} paparan</span>
              </div>
            </div>

            <Cover src={post.cover_image} label={post.category_name || ''} glyph="◇" eager
              className="article-cover" style={{ height: 440 }} />

            <MarkdownView md={bodyMd} html={bodyHtml} />

            {post.tags?.length > 0 && (
              <div className="article-tags">
                {post.tags.map(t => <Link key={t.id || t.slug} to={`/tag/${t.slug}`}>#{t.name || t}</Link>)}
              </div>
            )}
          </div>

          {related.length > 0 && (
            <div className="sec">
              <div className="sec-head">
                <span className="bar" />
                <h2>Berita Berkaitan</h2>
              </div>
              <div className="grid3">
                {related.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}
        </div>

        <Sidebar />
      </div>
    </div>
  );
}
