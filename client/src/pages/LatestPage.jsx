import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import NewsRow from '../components/NewsRow.jsx';
import Pagination from '../components/Pagination.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { setSEO } from '../utils/seo.js';

/** All published stories, newest first, paginated. */
export default function LatestPage() {
  const [sp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1', 10);
  const [data, setData] = useState(null);

  useEffect(() => { setSEO('Semua Berita', 'Semua berita terkini dari Malaysia Times.'); }, []);

  useEffect(() => {
    setData(null);
    api.get('/posts', { params: { page, limit: 12 } })
      .then(r => setData(r.data))
      .catch(() => setData({ items: [], total: 0, page: 1, pages: 1 }));
  }, [page]);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="breadcrumb"><Link to="/">Laman Utama</Link> / Semua Berita</div>
          <h1>Semua Berita</h1>
        </div>
      </div>

      <div className="wrap cols">
        <div className="main-col">
          {!data
            ? <div className="loading"><div className="spinner" /><p>Loading…</p></div>
            : data.items.length === 0
              ? <div className="empty"><h3>Tiada berita</h3><p>Sila kembali kemudian.</p></div>
              : <>
                  <div className="nlist">
                    {data.items.map(p => <NewsRow key={p.id} post={p} />)}
                  </div>
                  <Pagination page={data.page} pages={data.pages} base={({ page: p }) => `/latest?page=${p}`} />
                </>}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
