import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';

export default function AdminTags() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => api.get('/tags').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3000); };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/admin/tags', { name });
      setName('');
      flash('ok', 'Tag added.');
      load();
    } catch (ex) { flash('err', ex.response?.data?.error || 'Failed'); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete tag “${t.name}”?`)) return;
    await api.delete(`/admin/tags/${t.id}`).catch(() => {});
    flash('ok', 'Tag deleted.');
    load();
  };

  return (
    <>
      <h1>Tags</h1>
      <div className={`msg ${msg.type}` + (msg.text ? ' show' : '')}>{msg.text}</div>

      <form className="panel" onSubmit={add} style={{ marginBottom: 18, display: 'flex', gap: 12 }}>
        <div className="f-field" style={{ flex: 1 }}>
          <label>Tag name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. sustainability" required />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn primary" type="submit">Add tag</button></div>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        {!items
          ? <div className="loading"><div className="spinner" /></div>
          : items.length === 0
            ? <div className="empty"><h3>No tags</h3></div>
            : (
              <table className="tbl">
                <thead><tr><th>Name</th><th>Slug</th><th>Stories</th><th></th></tr></thead>
                <tbody>
                  {items.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td style={{ color: '#888' }}>#{t.slug}</td>
                      <td>{t.post_count}</td>
                      <td><button className="btn sm danger" onClick={() => remove(t)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </>
  );
}
