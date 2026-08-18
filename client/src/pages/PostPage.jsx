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

  if (error) return <div className="wrap"><div className="empty"><h3>Story not found</h3><p>{error}</p></div></div>;
  if (!post) return <div className="loading"><div className="spinner" /><p>Loading…</p></div>;

  const initials = (post.author_name || 'A').slice(0, 2).toUpperCase();

  // The detail page already shows the cover above the body, so drop the first
  // image inside the content to avoid duplicating it.
  const bodyHtml = post.content_html
    ? post.content_html.replace(/<img[^>]*>/i, '').replace(/<figure>\s*<\/figure>/gi, '')
    : '';
  const bodyMd = post.content_md
    ? post.content_md.replace(/!\[[^\]]*\]\([^)]*\)/, '')
    : '';

  return (
    <div className="wrap" style={{ paddingTop: 22 }}>
      <div className="cols" style={{ paddingTop: 0 }}>
        <div className="main-col">
          <div className="article-card">
            <div className="breadcrumb">
              <Link to="/">Home</Link>
              {post.category_slug && <> / <Link to={`/category/${post.category_slug}`}>{post.category_name}</Link></>}
            </div>

            <div className="article-head">
              <h1>{post.title}</h1>
              <div className="article-meta">
                {post.category_name && <span className="chip">{post.category_name}</span>}
                <span>By <Link to={`/author/${post.author_id}`} style={{ color: 'var(--accent)' }}>{post.author_name}</Link></span>
                <span>{fmtDate(post.published_at)}</span>
                <span>{fmtViews(post.views)} views</span>
              </div>
            </div>

            <Cover src={post.cover_image} label={post.category_name || ''} glyph="◇"
              className="article-cover" style={{ height: 440 }} />

            <MarkdownView md={bodyMd} html={bodyHtml} />

            {post.tags?.length > 0 && (
              <div className="article-tags">
                {post.tags.map(t => <Link key={t.id || t.slug} to={`/tag/${t.slug}`}>#{t.name || t}</Link>)}
              </div>
            )}

            <div className="author-box">
              <div className="avatar">
                {post.author_avatar
                  ? <img src={post.author_avatar} alt="" onError={e => { e.target.style.display = 'none'; }} />
                  : initials}
              </div>
              <div>
                <Link to={`/author/${post.author_id}`}><b>{post.author_name}</b></Link>
                <p>Writer at Atlas{post.author_username ? ` (@${post.author_username})` : ''}</p>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="sec">
              <div className="sec-head">
                <span className="bar" />
                <h2>Related Stories</h2>
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
