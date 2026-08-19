import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import NewsTicker from './NewsTicker.jsx';

export default function Layout() {
  const [settings, setSettings] = useState({ site_name: 'Malaysia Times', site_tagline: '', site_footer: '' });
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

  const today = new Date().toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const cats = categories.slice(0, 8);

  return (
    <>
      {/* topbar */}
      <div className="topbar">
        <div className="wrap">
          <div className="tb-left">
            <span className="date">{today}</span>
            <span className="tagline">{settings.site_tagline || 'Berita arkitektur, reka bentuk & dunia — dikemas kini setiap hari'}</span>
          </div>
        </div>
      </div>

      {/* header */}
      <header className="site">
        <div className="wrap header-inner">
          <Link className="logo" to="/">
            <img src="/logo.svg" className="logo-img" alt="Malaysia Times" />
<span>{settings.site_name || 'Malaysia Times'}<small>Berita Malaysia &amp; Dunia</small></span>
          </Link>
          <nav className="main">
            <NavLink to="/" end>Laman Utama</NavLink>
            {cats.map(c => <NavLink key={c.id} to={`/category/${c.slug}`}>{c.name}</NavLink>)}
          </nav>
          <div className="header-actions">
            <form onSubmit={onSearch}>
              <input placeholder="Cari berita…" value={q} onChange={e => setQ(e.target.value)} />
              <button type="submit">Cari</button>
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
            <h3>Langganan Harian</h3>
            <p>Berita utama dari seluruh dunia, satu e-mel setiap hari.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="your@email.com" required />
            <button type="submit">Langgan</button>
          </form>
        </div>
      </div>

      {/* footer */}
      <footer className="site">
        <div className="wrap footer-grid">
          <div>
            <div className="logo">{settings.site_name || 'Malaysia Times'}</div>
            <p style={{ margin: '12px 0', lineHeight: 1.7 }}>
              {settings.site_tagline || 'Malaysia Times ialah portal berita dalam talian yang menyampaikan liputan berita Malaysia dan dunia, seni bina, teknologi, perniagaan, sains, sukan dan pelancongan — dikemas kini setiap hari.'}
            </p>
          </div>
          <div>
            <h4>Kategori</h4>
            {categories.slice(0, 7).map(c => <Link key={c.id} to={`/category/${c.slug}`}>{c.name}</Link>)}
          </div>
          <div>
            <h4>Terokai</h4>
            <Link to="/">Laman Utama</Link>
            <Link to="/search">Cari</Link>
          </div>
          <div>
            <h4>Hubungi</h4>
            <a href={`mailto:${settings.contact_email || 'info@malaysiatimes.asia'}`}>
              {settings.contact_email || 'info@malaysiatimes.asia'}
            </a>
            <a href="#">Kiriman</a>
            <a href="#">Iklan</a>
            <a href="#">Tentang Kami</a>
          </div>
        </div>
        <div className="foot-bottom">{settings.site_footer || `© ${new Date().getFullYear()} Malaysia Times — Hak cipta terpelihara`}</div>
      </footer>
    </>
  );
}
