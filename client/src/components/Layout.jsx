import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import NewsTicker from './NewsTicker.jsx';

export default function Layout() {
  const [settings, setSettings] = useState({ site_name: 'Atlas', site_tagline: '', site_footer: '' });
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setQ(sp.get('q') || '');
  }, [sp]);

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const cats = categories.slice(0, 8);

  return (
    <>
      {/* topbar */}
      <div className="topbar">
        <div className="wrap">
          <div className="tb-left">
            <span className="date">{today}</span>
            <span className="tagline">{settings.site_tagline || 'Architecture, design & world news — updated daily'}</span>
          </div>
          <span>
            <Link to="/admin/login">Login</Link>
            <Link to="/admin">Publishing Desk</Link>
          </span>
        </div>
      </div>

      {/* header */}
      <header className="site">
        <div className="wrap header-inner">
          <Link className="logo" to="/">
            <span className="mark" />
            <span>{settings.site_name || 'Atlas'}<small>News &amp; Architecture</small></span>
          </Link>
          <nav className="main">
            <NavLink to="/" end>Home</NavLink>
            {cats.map(c => <NavLink key={c.id} to={`/category/${c.slug}`}>{c.name}</NavLink>)}
          </nav>
          <div className="header-actions">
            <form onSubmit={onSearch}>
              <input placeholder="Search news…" value={q} onChange={e => setQ(e.target.value)} />
              <button type="submit">Search</button>
            </form>
          </div>
        </div>
      </header>

      {/* breaking ticker */}
      <NewsTicker />

      <Outlet />

      {/* newsletter band */}
      <div className="newsletter">
        <div className="wrap">
          <div>
            <h3>Subscribe to the daily briefing</h3>
            <p>Top stories from around the world, one email a day.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="your@email.com" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>

      {/* footer */}
      <footer className="site">
        <div className="wrap footer-grid">
          <div>
            <div className="logo"><span className="mark" style={{ display: 'none' }} />{settings.site_name || 'Atlas'}</div>
            <p style={{ margin: '12px 0', lineHeight: 1.7 }}>
              {settings.site_tagline || 'A digital newsroom covering architecture, design, technology and world affairs — updated daily.'}
            </p>
          </div>
          <div>
            <h4>Categories</h4>
            {categories.slice(0, 7).map(c => <Link key={c.id} to={`/category/${c.slug}`}>{c.name}</Link>)}
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/">Home</Link>
            <Link to="/search">Search</Link>
            <Link to="/admin/login">Login</Link>
            <Link to="/admin">Publishing Desk</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`mailto:${settings.contact_email || 'hello@atlas.example.com'}`}>
              {settings.contact_email || 'hello@atlas.example.com'}
            </a>
            <a href="#">Submissions</a>
            <a href="#">Advertising</a>
            <a href="#">About us</a>
          </div>
        </div>
        <div className="foot-bottom">{settings.site_footer || `© ${new Date().getFullYear()} Atlas — All rights reserved`}</div>
      </footer>
    </>
  );
}
