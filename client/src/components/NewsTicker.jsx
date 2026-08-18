import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

/** Scrolling breaking-news ticker with the latest published headlines. */
export default function NewsTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/posts', { params: { limit: 8 } })
      .then(r => setItems(r.data.items || []))
      .catch(() => {});
  }, []);

  if (!items.length) return null;

  // duplicate the list so the CSS scroll loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div className="breaking">
      <div className="wrap">
        <span className="label">Terkini</span>
        <div className="track-wrap">
          <div className="track">
            {doubled.map((p, i) => (
              <Link key={`${p.id}-${i}`} to={`/post/${p.slug}`}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
