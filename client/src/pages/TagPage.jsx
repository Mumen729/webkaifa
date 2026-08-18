import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import NewsRow from '../components/NewsRow.jsx';
import Pagination from '../components/Pagination.jsx';
import Sidebar from '../components/Sidebar.jsx';

export default function TagPage() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1', 10);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get('/posts', { params: { tag: slug, page, limit: 12 } })
      .then(r => setData(r.data))
      .catch(() => setData({ items: [], total: 0, page: 1, pages: 1 }));
  }, [slug, page]);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="breadcrumb"><Link to="/">Home</Link> / Tag</div>
          <h1>#{slug}</h1>
          <div className="desc">{data ? `${data.total} tagged stories` : 'Loading…'}</div>
        </div>
      </div>

      <div className="wrap cols">
        <div className="main-col">
          {!data
            ? <div className="loading"><div className="spinner" /><p>Loading…</p></div>
            : data.items.length === 0
              ? <div className="empty"><h3>Nothing tagged yet</h3><p>Explore other tags or browse the latest stories.</p></div>
              : <>
                  <div className="nlist">
                    {data.items.map(p => <NewsRow key={p.id} post={p} />)}
                  </div>
                  <Pagination page={data.page} pages={data.pages} base={({ page: p }) => `/tag/${slug}?page=${p}`} />
                </>}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
