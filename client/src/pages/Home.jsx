import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Cover from '../components/Cover.jsx';
import PostCard from '../components/PostCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { timeAgo, fmtViews } from '../utils/format.js';
import { setSEO } from '../utils/seo.js';

function HeroSlider({ slides }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (slides.length < 2) return;
    timer.current = setInterval(() => setIdx(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer.current);
  }, [slides.length]);

  const go = (n) => {
    setIdx(n);
    clearInterval(timer.current);
    if (slides.length > 1) timer.current = setInterval(() => setIdx(i => (i + 1) % slides.length), 5000);
  };

  return (
    <Link className="hero-main" to={`/post/${slides[idx].slug}`}>
      {slides.map((s, i) => (
        <div key={s.id} className={`slide${i === idx ? ' on' : ''}`}>
          <Cover src={s.cover_image} label={s.category_name || ''} glyph="◇" eager />
        </div>
      ))}
      <div className="meta">
        <span className="cat">{(slides[idx].category_name || 'Warta').toUpperCase()}</span>
        <h1>{slides[idx].title}</h1>
        <div className="by">
          <span>{timeAgo(slides[idx].published_at)}</span>
          <span>{fmtViews(slides[idx].views)} paparan</span>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => <i key={s.id} className={i === idx ? 'on' : ''} onClick={(e) => { e.preventDefault(); go(i); }} />)}
        </div>
      )}
    </Link>
  );
}

function CategoryBlock({ category, posts }) {
  if (!posts.length) return null;
  const [lead, ...rest] = posts;
  return (
    <div className="sec">
      <div className="sec-head">
        <span className="bar" />
        <h2>{category.name}</h2>
        <Link className="more" to={`/category/${category.slug}`}>Lagi {category.name} →</Link>
      </div>
      <div className="catblock">
        <Link className="lead" to={`/post/${lead.slug}`}>
          <Cover src={lead.cover_image} label="" glyph="▣" />
          <div className="cat">{lead.category_name || 'Warta'}</div>
          <h3>{lead.title}</h3>
          <p>{lead.excerpt || ''}</p>
          <span className="more">Baca lagi →</span>
        </Link>
        <div className="rows">
          {rest.slice(0, 6).map(p => (
            <Link key={p.id} className="rrow" to={`/post/${p.slug}`}>
              <Cover src={p.cover_image} label="" glyph="▣" />
              <div>
                <h4>{p.title}</h4>
                <div className="m">
                  {timeAgo(p.published_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [catPosts, setCatPosts] = useState({});

  useEffect(() => {
    api.get('/settings/home').then(r => {
      setData(r.data);
      setSEO('', r.data.settings?.site_tagline || '');
    }).catch(e => setError(e.message));
  }, []);

  // fetch per-category posts for the section blocks
  const blockCategories = data ? data.categories.slice(0, 4) : [];
  useEffect(() => {
    if (!blockCategories.length) return;
    let alive = true;
    blockCategories.forEach(c => {
      api.get('/posts', { params: { category: c.slug, limit: 5 } })
        .then(r => { if (alive) setCatPosts(p => ({ ...p, [c.slug]: r.data.items })); })
        .catch(() => {});
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.categories?.length]);

  if (error) return <div className="wrap"><div className="empty"><h3>Tidak dapat dimuatkan</h3><p>{error}</p></div></div>;
  if (!data) return <div className="loading"><div className="spinner" /><p>Memuatkan…</p></div>;

  const { featured, latest, trending, categories } = data;
  // dedupe by id — the feed must never show the same article twice
  const uniqById = (arr) => [...new Map((arr || []).map(x => [x.id, x])).values()];
  const latestU = uniqById(latest);
  const slides = featured.length >= 3 ? featured.slice(0, 5) : (latestU.length ? [featured[0] || latestU[0], ...latestU.slice(0, 3).filter(p => p.id !== (featured[0] || {}).id)] : []);
  const heroSide = featured.slice(3, 5).length ? featured.slice(3, 5) : latestU.slice(4, 6);
  const side = uniqById(heroSide.length >= 2 ? heroSide : latestU.slice(2, 4));
  const slidesU = uniqById(slides);

  // articles shown in the hero (slider + side cards) must not repeat in the grid below
  const heroIds = new Set([...slidesU, ...side].map(s => s.id));
  const latestGrid = latestU.filter(p => !heroIds.has(p.id));

  return (
    <>
      {/* hero */}
      {slidesU.length > 0 && (
        <div className="wrap hero">
          <HeroSlider slides={slidesU} />
          <div className="hero-side">
            {side.map(p => (
              <Link key={p.id} className="item" to={`/post/${p.slug}`}>
                <Cover src={p.cover_image} label={p.category_name || ''} glyph="▣" />
                <div className="meta">
                  <span className="cat">{(p.category_name || 'Warta').toUpperCase()}</span>
                  <h2>{p.title}</h2>
                  <div className="time">{timeAgo(p.published_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="wrap cols">
        <div className="main-col">
          {/* latest grid */}
          <div className="sec" style={{ paddingTop: 6 }}>
            <div className="sec-head">
              <span className="bar" />
              <h2>Berita Terkini</h2>
              <Link className="more" to="/latest">Lihat Semua →</Link>
            </div>
            <div className="grid4">
              {latestGrid.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </div>

          {/* category sections */}
          {blockCategories.map(c => <CategoryBlock key={c.id} category={c} posts={catPosts[c.slug] || []} />)}

          {/* trending strip */}
          {trending.length > 0 && (
            <div className="sec">
              <div className="sec-head">
                <span className="bar" />
                <h2>Sedang Hangat</h2>
              </div>
              <div className="grid2">
                {trending.filter(p => !heroIds.has(p.id)).slice(0, 6).map(p => (
                  <Link key={p.id} className="nrow" to={`/post/${p.slug}`}>
                    <Cover src={p.cover_image} label="" glyph="★" />
                    <div>
                      <div className="cat">{p.category_name || 'Warta'}</div>
                      <h4>{p.title}</h4>
                      <div className="m">
                        {timeAgo(p.published_at)} · {fmtViews(p.views)} paparan
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <Sidebar />
      </div>
    </>
  );
}
