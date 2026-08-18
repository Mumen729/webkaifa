import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';

export default function AdminSettings() {
  const [form, setForm] = useState({ site_name: '', site_tagline: '', site_footer: '', contact_email: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/settings').then(r => {
      setForm({ site_name: r.data.site_name, site_tagline: r.data.site_tagline, site_footer: r.data.site_footer, contact_email: r.data.contact_email });
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      setMsg({ type: 'ok', text: 'Settings saved.' });
    } catch (ex) {
      setMsg({ type: 'err', text: ex.response?.data?.error || 'Failed to save' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    }
  };

  return (
    <>
      <h1>Site Settings</h1>
      <div className={`msg ${msg.type}` + (msg.text ? ' show' : '')}>{msg.text}</div>
      <form className="panel" onSubmit={save} style={{ maxWidth: 640 }}>
        <div className="f-field" style={{ marginBottom: 16 }}>
          <label>Site name</label>
          <input type="text" value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} />
        </div>
        <div className="f-field" style={{ marginBottom: 16 }}>
          <label>Tagline</label>
          <input type="text" value={form.site_tagline} onChange={e => setForm(f => ({ ...f, site_tagline: e.target.value }))} />
        </div>
        <div className="f-field" style={{ marginBottom: 16 }}>
          <label>Footer text</label>
          <input type="text" value={form.site_footer} onChange={e => setForm(f => ({ ...f, site_footer: e.target.value }))} />
        </div>
        <div className="f-field" style={{ marginBottom: 20 }}>
          <label>Contact email</label>
          <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
        </div>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
      </form>
    </>
  );
}
