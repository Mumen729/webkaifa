import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import NewsRow from '../components/NewsRow.jsx';
import Pagination from '../components/Pagination.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { setSEO } from '../utils/seo.js';

export default function CategoryPage() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1', 10);
  const [data, setData] = useState(null);
  const [cat, setCat] = useState(null);

  // use the Malay category name from the DB (not a slug-derived English title)
  useEffect(() => {
    api.get('/categories').then(r => {
      const found = (r.data || []).find(c => c.slug === slug);
      if (found) setCat(found);
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    setData(null);
    api.get('/posts', { params: { category: slug, page, limit: 12 } })
      .then(r => setData(r.data))
      .catch(() => setData({ items: [], total: 0, page: 1, pages: 1 }));
  }, [slug, page]);

  const title = cat ? cat.name : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  useEffect(() => { setSEO(`Berita ${title}`, cat?.description || `Semua cerita dalam kategori ${title}.`); }, [title, cat]);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="breadcrumb"><Link to="/">Laman Utama</Link> / {title}</div>
          <h1>{title}</h1>
          {cat?.description ? <div className="desc">{cat.description}</div> : null}
        </div>
      </div>

      <div className="wrap cols">
        <div className="main-col">
          {!data
            ? <div className="loading"><div className="spinner" /><p>Memuatkan…</p></div>
            : data.items.length === 0
              ? <div className="empty"><h3>Tiada cerita lagi</h3><p>Sila kembali kemudian, atau lihat kategori lain.</p></div>
              : <>
                  <div className="nlist">
                    {data.items.map(p => <NewsRow key={p.id} post={p} />)}
                  </div>
                  <Pagination page={data.page} pages={data.pages} base={({ page: p }) => `/category/${slug}?page=${p}`} />
                </>}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
