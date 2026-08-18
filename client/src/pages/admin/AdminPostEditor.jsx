import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client.js';
import MarkdownView from '../../components/MarkdownView.jsx';

const empty = {
  title: '', slug: '', excerpt: '', content_md: '', cover_image: '',
  category_id: '', status: 'draft', is_featured: false, is_top: false, tags: ''
};

export default function AdminPostEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/categories').then(r => {
      const cats = r.data;
      setCategories(cats);
      // New posts default to "Press Releases" — the category for the site's own uploads
      if (!isEdit) {
        const pr = cats.find(c => c.slug === 'press-releases');
        if (pr) setForm(f => ({ ...f, category_id: String(pr.id) }));
      }
    }).catch(() => {});
    if (isEdit) {
      api.get(`/admin/posts/${id}`).then(r => {
        const p = r.data;
        setForm({
          title: p.title, slug: p.slug, excerpt: p.excerpt, content_md: p.content_md || '',
          cover_image: p.cover_image || '', category_id: p.category_id || '',
          status: p.status, is_featured: !!p.is_featured, is_top: !!p.is_top,
          tags: (p.tags || []).map(t => t.name).join(', ')
        });
      }).catch(() => navigate('/admin'));
    }
  }, [id, isEdit, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 3500); };

  const upload = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/admin/upload', fd);
    return data.url;
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      set('cover_image', url);
      flash('ok', 'Cover uploaded.');
    } catch (ex) {
      flash('err', ex.response?.data?.error || 'Upload failed');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async (statusOverride) => {
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || form.title,
        excerpt: form.excerpt,
        content_md: form.content_md,
        cover_image: form.cover_image,
        category_id: form.category_id ? Number(form.category_id) : null,
        status: statusOverride || form.status,
        is_featured: form.is_featured,
        is_top: form.is_top,
        tags: form.tags
      };
      if (isEdit) {
        await api.put(`/admin/posts/${id}`, payload);
      } else {
        const { data } = await api.post('/admin/posts', payload);
        return navigate(`/admin/posts/${data.id}/edit`, { state: { saved: true } });
      }
      flash('ok', 'Saved.');
    } catch (ex) {
      flash('err', ex.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1>{isEdit ? 'Edit Post' : 'New Post'}</h1>
      <div className={`msg ${msg.type}` + (msg.text ? ' show' : '')}>{msg.text}</div>

      <div className="panel">
        <div className="f-field" style={{ marginBottom: 16 }}>
          <label>Title *</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Story headline" />
        </div>

        <div className="f-row">
          <div className="f-field">
            <label>Slug (URL)</label>
            <input type="text" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="auto-generated from title" />
          </div>
          <div className="f-field">
            <label>Category</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">— None —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="f-field">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="f-field" style={{ marginBottom: 16 }}>
          <label>Excerpt</label>
          <textarea rows={2} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="Short summary shown on cards" />
        </div>

        <div className="f-row">
          <div className="f-field">
            <label>Cover image</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} />
            {form.cover_image && (
              <div className="cover-preview">
                <img src={form.cover_image} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
          <div className="f-field">
            <label>Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="timber, minimal, japan" />
            <div style={{ marginTop: 14, display: 'flex', gap: 18 }}>
              <label className="f-check"><input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} /> Featured (homepage hero)</label>
              <label className="f-check"><input type="checkbox" checked={form.is_top} onChange={e => set('is_top', e.target.checked)} /> Top (sticky order)</label>
            </div>
          </div>
        </div>

        <div className="markdown-split">
          <div className="f-field">
            <label>Content (Markdown)</label>
            <textarea value={form.content_md} onChange={e => set('content_md', e.target.value)} placeholder={'## Heading\n\nWrite your story in Markdown…'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333' }}>Preview</label>
            <div className="preview-pane">
              <MarkdownView md={form.content_md} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={() => navigate('/admin')}>Cancel</button>
        {form.status !== 'draft' && <button className="btn" disabled={saving} onClick={() => save('draft')}>Save as Draft</button>}
        <button className="btn primary" disabled={saving} onClick={() => save()}>
          {saving ? 'Saving…' : (form.status === 'published' ? 'Save & Publish' : 'Save')}
        </button>
      </div>
    </>
  );
}
