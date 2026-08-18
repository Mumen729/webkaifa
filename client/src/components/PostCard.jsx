import React from 'react';
import { Link } from 'react-router-dom';
import Cover from './Cover.jsx';
import { timeAgo } from '../utils/format.js';

/** News grid card (thumbnail, category chip, title, meta). */
export default function PostCard({ post, glyph = '▣' }) {
  return (
    <Link className="card" to={`/post/${post.slug}`}>
      <Cover src={post.cover_image} label={post.category_name || ''} glyph={glyph} />
      <div className="body">
        <div className="cat">{post.category_name || 'Warta'}</div>
        <h3>{post.title}</h3>
        <div className="foot">
          <span>{post.author_name}</span>
          <span>{timeAgo(post.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}
