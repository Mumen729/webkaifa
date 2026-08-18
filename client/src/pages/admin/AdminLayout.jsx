import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('atlas_token');
    if (!token) { navigate('/admin/login', { replace: true }); return; }
    api.get('/auth/me').catch(() => {
      localStorage.removeItem('atlas_token');
      localStorage.removeItem('atlas_user');
      navigate('/admin/login', { replace: true });
    });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('atlas_token');
    localStorage.removeItem('atlas_user');
    navigate('/admin/login');
  };

  const linkCls = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <div className="admin-body">
      <div className="admin-shell">
        <aside className="admin-side">
          <div className="brand">Atlas<b>.</b></div>
          <nav>
            <NavLink to="/admin" end className={linkCls}>Posts</NavLink>
            <NavLink to="/admin/posts/new" className={linkCls}>New Post</NavLink>
            <NavLink to="/admin/categories" className={linkCls}>Categories</NavLink>
            <NavLink to="/admin/tags" className={linkCls}>Tags</NavLink>
            <NavLink to="/admin/settings" className={linkCls}>Settings</NavLink>
            <a href="/" target="_blank" rel="noreferrer">View site ↗</a>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a>
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
