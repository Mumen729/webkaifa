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

  useEffect(() => {
    setData(null);
    api.get('/posts', { params: { category: slug, page, limit: 12 } })
      .then(r => setData(r.data))
      .catch(() => setData({ items: [], total: 0, page: 1, pages: 1 }));
  }, [slug, page]);

  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  useEffect(() => { setSEO(`${title} News`, `All stories in ${title}.`); }, [title]);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="breadcrumb"><Link to="/">Home</Link> / Category</div>
          <h1>{title}</h1>
          <div className="desc">{data ? `${data.total} stories` : 'Loading…'}</div>
        </div>
      </div>

      <div className="wrap cols">
        <div className="main-col">
          {!data
            ? <div className="loading"><div className="spinner" /><p>Loading…</p></div>
            : data.items.length === 0
              ? <div className="empty"><h3>No stories here yet</h3><p>Check back soon, or browse another category.</p></div>
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
