import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Cover from './Cover.jsx';
import { timeAgo } from '../utils/format.js';

/** Sticky news sidebar: most read, categories, tags, subscribe. */
export default function Sidebar() {
  const [most, setMost] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    api.get('/posts', { params: { sort: 'views', limit: 5 } })
      .then(r => setMost(r.data.items || [])).catch(() => {});
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/tags').then(r => setTags((r.data || []).slice(0, 14))).catch(() => {});
  }, []);

  return (
    <aside className="side">
      {most.length > 0 && (
        <div className="sbox">
          <div className="bt">Most Read</div>
          <ol className="most">
            {most.map((p, i) => (
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

      {categories.length > 0 && (
        <div className="sbox">
          <div className="bt">Categories</div>
          <div className="scat">
            {categories.slice(0, 10).map(c => (
              <Link key={c.id} to={`/category/${c.slug}`}>
                {c.name}
                <span>{c.post_count}</span>
              </Link>
            ))}
          </div>
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
