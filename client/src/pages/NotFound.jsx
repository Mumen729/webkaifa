import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="empty">
        <h3>404 — Page not found</h3>
        <p>The page you're looking for doesn't exist.</p>
        <p><Link to="/" style={{ color: 'var(--accent)' }}>← Back to home</Link></p>
      </div>
    </div>
  );
}
