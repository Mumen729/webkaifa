import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('atlas_token', data.token);
      localStorage.setItem('atlas_user', JSON.stringify(data.user));
      navigate('/admin');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Atlas Publishing</h1>
        <div className="sub">Sign in to manage stories, categories and tags.</div>
        <div className="f-field">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
        </div>
        <div className="f-field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {err && <div className="msg err show">{err}</div>}
        <button className="btn primary" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="auth-hint">
          Default account — username: <b>admin</b>, password: <b>admin123</b>
          <br />(run <code>npm run seed</code> to reset sample data)
        </div>
      </form>
    </div>
  );
}
