import React from 'react';
import { Link } from 'react-router-dom';

export default function Pagination({ page, pages, base }) {
  if (pages <= 1) return null;
  const items = [];
  for (let i = 1; i <= pages; i++) {
    if (pages > 9 && i > 2 && i < pages - 1 && Math.abs(i - page) > 1) {
      if (items[items.length - 1] !== '…') items.push('…');
      continue;
    }
    items.push(i);
  }
  return (
    <div className="pager">
      {page > 1
        ? <Link to={base({ page: page - 1 })}>‹</Link>
        : <span className="disabled">‹</span>}
      {items.map((it, idx) =>
        it === '…'
          ? <span key={`e${idx}`}>…</span>
          : it === page
            ? <span key={it} className="on">{it}</span>
            : <Link key={it} to={base({ page: it })}>{it}</Link>
      )}
      {page < pages
        ? <Link to={base({ page: page + 1 })}>›</Link>
        : <span className="disabled">›</span>}
    </div>
  );
}
