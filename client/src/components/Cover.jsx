import React, { useState } from 'react';
import { gradientFor } from '../utils/format.js';

/**
 * Cover image with graceful fallback:
 * - no cover → deterministic gradient + glyph
 * - broken remote image → gradient
 */
export default function Cover({ src, label = '', glyph = '⌂', style, className = '' }) {
  const [failed, setFailed] = useState(false);
  const bg = gradientFor(label || String(src || ''));
  if (!src || failed) {
    return (
      <div className={`cover ${className}`} style={{ background: bg, ...style }}>
        <span className="glyph">{glyph}</span>
        {label && <span className="chip">{label}</span>}
      </div>
    );
  }
  return (
    <div className={`cover ${className}`} style={style}>
      <img
        src={src}
        alt={label || 'cover'}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {label && <span className="chip">{label}</span>}
    </div>
  );
}
