import React, { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import TagPage from './pages/TagPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import PostPage from './pages/PostPage.jsx';
import AuthorPage from './pages/AuthorPage.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminPosts from './pages/admin/AdminPosts.jsx';
import AdminPostEditor from './pages/admin/AdminPostEditor.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminTags from './pages/admin/AdminTags.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/post/:slug" element={<PostPage />} />
          <Route path="/author/:id" element={<AuthorPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostEditor />} />
          <Route path="posts/:id/edit" element={<AdminPostEditor />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </>
  );
}
