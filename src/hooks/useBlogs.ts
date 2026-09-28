import { useState, useEffect } from 'react';
import { Article } from '@/data/blogData';

export function useBlogs() {
  const [blogs, setBlogs] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/blogs');
      if (res.ok) {
        const data = await res.json();
        setBlogs(data);
      }
    } catch (e) {
      console.error('Unable to load blogs right now. Please try again later.', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);                           

  const addBlog = async (blogData: Partial<Article>) => {
    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blogData)
      });
      if (res.ok) {
        await fetchBlogs();
      }
    } catch (e) {
      console.error('Failed to add blog. Please try again later.', e);
    }
  };

  const updateBlog = async (id: string, updates: Partial<Article>) => {
    try {
      const res = await fetch(`/api/blogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        await fetchBlogs();
      }
    } catch (e) {
      console.error('Failed to update blog. Please try again later.', e);
    }
  };

  const deleteBlog = async (id: string) => {
    try {
      const res = await fetch(`/api/blogs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchBlogs();
      }
    } catch (e) {
      console.error('Failed to delete blog. Please try again later.', e);
    }
  };

  return { blogs, loading, addBlog, updateBlog, deleteBlog, refreshBlogs: fetchBlogs };
}
