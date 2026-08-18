import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import NewsRow from '../components/NewsRow.jsx';
import Pagination from '../components/Pagination.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { setSEO } from '../utils/seo.js';

export default function SearchPage() {
  const [sp] = useSearchParams();
  const q = sp.get('q') || '';
  const page = parseInt(sp.get('page') || '1', 10);
  const [data, setData] = useState(null);

  useEffect(() => { setSEO(q ? `Cari: ${q}` : 'Cari', 'Cari cerita Warta.'); }, [q]);

  useEffect(() => {
    if (!q.trim()) { setData({ items: [], total: 0, page: 1, pages: 1 }); return; }
    setData(null);
    api.get('/posts', { params: { q, page, limit: 12 } })
      .then(r => setData(r.data))
      .catch(() => setData({ items: [], total: 0, page: 1, pages: 1 }));
  }, [q, page]);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="breadcrumb">Cari</div>
          <h1>{q ? `Keputusan untuk “${q}”` : 'Cari'}</h1>
          <div className="desc">{data ? `${data.total} ${data.total === 1 ? 'hasil' : 'hasil'} ditemui` : 'Mencari…'}</div>
        </div>
      </div>

      <div className="wrap cols">
        <div className="main-col">
          {!data
            ? <div className="loading"><div className="spinner" /><p>Mencari…</p></div>
            : data.items.length === 0
              ? <div className="empty"><h3>Tiada hasil</h3><p>Cuba kata kunci lain, atau lihat mengikut kategori.</p></div>
              : <>
                  <div className="nlist">
                    {data.items.map(p => <NewsRow key={p.id} post={p} />)}
                  </div>
                  <Pagination page={data.page} pages={data.pages} base={({ page: p }) => `/search?q=${encodeURIComponent(q)}&page=${p}`} />
                </>}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
