import React from 'react';
import { Link } from 'react-router-dom';
import Cover from './Cover.jsx';
import { timeAgo } from '../utils/format.js';

/** Compact horizontal news row (thumbnail + category + title + meta). */
export default function NewsRow({ post }) {
  return (
    <Link className="nrow" to={`/post/${post.slug}`}>
      <Cover src={post.cover_image} label="" glyph="▣" />
      <div>
        <div className="cat">{post.category_name || 'Atlas'}</div>
        <h4>{post.title}</h4>
        <div className="m">
          {post.author_name} · {timeAgo(post.published_at)}
        </div>
      </div>
    </Link>
  );
}
