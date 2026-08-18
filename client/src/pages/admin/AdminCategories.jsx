import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';

export default function AdminCategories() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [desc, setDesc] = useState('');
  const [order, setOrder] = useState(0);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => api.get('/categories').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3000); };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/admin/categories', { name, slug, description: desc, sort_order: order });
      setName(''); setSlug(''); setDesc(''); setOrder(0);
      flash('ok', 'Category added.');
      load();
    } catch (ex) { flash('err', ex.response?.data?.error || 'Failed'); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category “${c.name}”? Its posts will keep but become uncategorized.`)) return;
    await api.delete(`/admin/categories/${c.id}`).catch(() => {});
    flash('ok', 'Category deleted.');
    load();
  };

  return (
    <>
      <h1>Categories</h1>
      <div className={`msg ${msg.type}` + (msg.text ? ' show' : '')}>{msg.text}</div>

      <form className="panel" onSubmit={add} style={{ marginBottom: 18 }}>
        <div className="f-row">
          <div className="f-field"><label>Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="f-field"><label>Slug</label><input type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto" /></div>
          <div className="f-field"><label>Description</label><input type="text" value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="f-field" style={{ maxWidth: 120 }}><label>Order</label><input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn primary" type="submit">Add</button></div>
        </div>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        {!items
          ? <div className="loading"><div className="spinner" /></div>
          : items.length === 0
            ? <div className="empty"><h3>No categories</h3></div>
            : (
              <table className="tbl">
                <thead><tr><th>Name</th><th>Slug</th><th>Stories</th><th>Order</th><th></th></tr></thead>
                <tbody>
                  {items.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: '#888' }}>/{c.slug}</td>
                      <td>{c.post_count}</td>
                      <td>{c.sort_order}</td>
                      <td><button className="btn sm danger" onClick={() => remove(c)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </>
  );
}
