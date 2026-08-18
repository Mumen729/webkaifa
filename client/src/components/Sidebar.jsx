import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Cover from './Cover.jsx';
import { timeAgo } from '../utils/format.js';

/** Sticky news sidebar: recent hot articles, tags, subscribe. */
export default function Sidebar() {
  const [hot, setHot] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    api.get('/posts', { params: { sort: 'hot', limit: 5 } })
      .then(r => setHot(r.data.items || [])).catch(() => {});
    api.get('/tags').then(r => setTags((r.data || []).slice(0, 14))).catch(() => {});
  }, []);

  return (
    <aside className="side">
      {hot.length > 0 && (
        <div className="sbox">
          <div className="bt">Recent Hot Articles</div>
          <ol className="most">
            {hot.map((p, i) => (
              <li key={p.id}>
                <span className="no">{i + 1}</span>
                <div>
                  <Link to={`/post/${p.slug}`}><h4>{p.title}</h4></Link>
                  <div className="m">{timeAgo(p.published_at)} · {p.views?.toLocaleString?.()} views</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tags.length > 0 && (
        <div className="sbox">
          <div className="bt">Tags</div>
          <div className="tags">
            {tags.map(t => <Link key={t.id} to={`/tag/${t.slug}`}>#{t.name}</Link>)}
          </div>
        </div>
      )}

      <div className="sbox">
        <div className="bt">Newsletter</div>
        <div className="sub">
          <p>Get the top stories delivered to your inbox every morning.</p>
          <form className="row" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="your@email.com" required />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
