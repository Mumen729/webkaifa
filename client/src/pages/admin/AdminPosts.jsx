import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';

export default function AdminPosts() {
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState(sp.get('q') || '');
  const status = sp.get('status') || '';
  const page = parseInt(sp.get('page') || '1', 10);

  const load = () => {
    setData(null);
    const params = { page, limit: 20 };
    if (status) params.status = status;
    if (q.trim()) params.q = q.trim();
    api.get('/admin/posts', { params }).then(r => setData(r.data)).catch(() => setData({ items: [], total: 0, pages: 1, page: 1 }));
  };

  useEffect(load, [page, status, sp]);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const doSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (status) p.set('status', status);
    p.set('page', '1');
    setSp(p);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    await api.delete(`/admin/posts/${id}`).catch(() => {});
    load();
  };

  return (
    <>
      <h1>Posts</h1>

      {stats && (
        <div className="panel" style={{ display: 'flex', gap: 34, flexWrap: 'wrap', padding: '14px 22px', marginBottom: 18 }}>
          <div><b style={{ fontSize: 20 }}>{stats.posts}</b><div style={{ fontSize: 12, color: '#888' }}>Total</div></div>
          <div><b style={{ fontSize: 20 }}>{stats.published}</b><div style={{ fontSize: 12, color: '#888' }}>Published</div></div>
          <div><b style={{ fontSize: 20 }}>{stats.drafts}</b><div style={{ fontSize: 12, color: '#888' }}>Drafts</div></div>
          <div><b style={{ fontSize: 20 }}>{stats.views.toLocaleString()}</b><div style={{ fontSize: 12, color: '#888' }}>Views</div></div>
        </div>
      )}

      <div className="toolbar">
        <form onSubmit={doSearch} style={{ display: 'contents' }}>
          <input type="text" placeholder="Search title or slug…" value={q} onChange={e => setQ(e.target.value)} />
          <select
            value={status}
            onChange={e => {
              const p = new URLSearchParams(sp);
              if (e.target.value) p.set('status', e.target.value); else p.delete('status');
              p.set('page', '1');
              setSp(p);
            }}
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <button className="btn" type="submit">Search</button>
        </form>
        <Link className="btn primary" to="/admin/posts/new" style={{ marginLeft: 'auto' }}>+ New Post</Link>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'auto' }}>
        {!data
          ? <div className="loading"><div className="spinner" /></div>
          : data.items.length === 0
            ? <div className="empty"><h3>No posts</h3><p>Create your first story with “+ New Post”.</p></div>
            : (
              <table className="tbl">
                <thead>
                  <tr><th>Title</th><th>Status</th><th>Category</th><th>Source</th><th>Views</th><th>Updated</th><th></th></tr>
                </thead>
                <tbody>
                  {data.items.map(p => (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 360 }}>
                        <Link to={`/admin/posts/${p.id}/edit`} style={{ fontWeight: 600 }}>{p.title}</Link>
                        <div style={{ fontSize: 12, color: '#999' }}>/{p.slug}</div>
                      </td>
                      <td><span className={`badge ${p.status === 'published' ? 'pub' : 'draft'}`}>{p.status}</span></td>
                      <td>{p.category_name || <span style={{ color: '#bbb' }}>—</span>}</td>
                      <td>
                        {p.is_crawled
                          ? <span className="badge cat">crawled</span>
                          : <span style={{ color: '#bbb' }}>own</span>}
                      </td>
                      <td>{p.views.toLocaleString()}</td>
                      <td style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>{p.updated_at?.slice(0, 10)}</td>
                      <td>
                        <div className="row-actions">
                          <Link className="btn sm" to={`/admin/posts/${p.id}/edit`}>Edit</Link>
                          <Link className="btn sm" to={`/post/${p.slug}`} target="_blank">View</Link>
                          <button className="btn sm danger" onClick={() => remove(p.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>

      {data && data.pages > 1 && (
        <div className="pager">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => {
            const params = new URLSearchParams(sp); params.set('page', p);
            return (
              <Link key={p} to={`/admin?${params.toString()}`} className={p === data.page ? 'on' : ''}>{p}</Link>
            );
          })}
        </div>
      )}
    </>
  );
}
