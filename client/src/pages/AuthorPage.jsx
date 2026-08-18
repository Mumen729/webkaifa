import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client.js';
import NewsRow from '../components/NewsRow.jsx';
import Pagination from '../components/Pagination.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { setSEO } from '../utils/seo.js';

export default function AuthorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1', 10);
  const [author, setAuthor] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setAuthor(null); setData(null);
    api.get(`/authors/${id}`)
      .then(r => setAuthor(r.data))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, [id, page]);

  useEffect(() => {
    if (author) setSEO(author.display_name, author.bio || '');
  }, [author]);

  useEffect(() => {
    if (!author) return;
    setData(null);
    api.get('/posts', { params: { author: author.username, page, limit: 12 } })
      .then(r => setData(r.data))
      .catch(() => setData({ items: [], total: 0, page: 1, pages: 1 }));
  }, [author, page]);

  if (error) return <div className="wrap"><div className="empty"><h3>Penulis tidak dijumpai</h3><p>{error}</p></div></div>;
  if (!author) return <div className="loading"><div className="spinner" /><p>Memuatkan…</p></div>;

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="breadcrumb"><Link to="/">Laman Utama</Link> / Penulis</div>
          <h1>{author.display_name}</h1>
          <div className="desc">
            {author.bio || 'Penulis di Malaysia Times.'}
            {' '}{author.post_count} {author.post_count === 1 ? 'cerita' : 'cerita'} diterbitkan.
          </div>
        </div>
      </div>

      <div className="wrap cols">
        <div className="main-col">
          {!data
            ? <div className="loading"><div className="spinner" /><p>Memuatkan…</p></div>
            : data.items.length === 0
              ? <div className="empty"><h3>Tiada cerita diterbitkan</h3></div>
              : <>
                  <div className="nlist">
                    {data.items.map(p => <NewsRow key={p.id} post={p} />)}
                  </div>
                  <Pagination page={data.page} pages={data.pages} base={({ page: p }) => `/author/${id}?page=${p}`} />
                </>}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
