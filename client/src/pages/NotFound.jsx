import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="empty">
        <h3>404 — Halaman tidak dijumpai</h3>
        <p>Halaman yang anda cari tidak wujud.</p>
        <p><Link to="/" style={{ color: 'var(--accent)' }}>← Kembali ke laman utama</Link></p>
      </div>
    </div>
  );
}
