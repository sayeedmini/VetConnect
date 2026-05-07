import { useEffect, useMemo, useState } from 'react';
import SiteLayout from '../../../components/SiteLayout';
import { getUser, isLoggedIn } from '../../auth/utils/auth';
import { createPost, getPosts, updatePost } from '../services/postApi';

function PostsPage() {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'published',
  });

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await getPosts();
      setPosts(response.data || []);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to load posts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const myPosts = useMemo(
    () => posts.filter((post) => post.author?._id === user?._id),
    [posts, user?._id]
  );

  const visiblePosts = useMemo(
    () => posts.filter((post) => post.status === 'published' || post.author?._id === user?._id),
    [posts, user?._id]
  );

  const resetForm = () => {
    setEditingPostId('');
    setFormData({
      title: '',
      content: '',
      status: 'published',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingPostId) {
        await updatePost(editingPostId, formData);
        alert('Post updated successfully');
      } else {
        await createPost(formData);
        alert('Post created successfully');
      }

      resetForm();
      await loadPosts();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to save post');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (post) => {
    setEditingPostId(post._id);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      status: post.status || 'published',
    });
  };

  return (
    <SiteLayout
      eyebrow="Encrypted posts"
      title="Secure posts workspace"
      subtitle="Posts are stored encrypted at rest and automatically decrypted when authorized readers open them through the application."
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#002045]">Published feed</h2>
              <p className="mt-2 text-sm text-slate-600">
                Everyone sees published posts, while drafts remain private to their author and admins.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {visiblePosts.length}
            </span>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Loading posts...</div>
          ) : visiblePosts.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">No posts available yet.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {visiblePosts.map((post) => {
                const canEdit = loggedIn && (post.author?._id === user?._id || user?.role === 'admin');

                return (
                  <article key={post._id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-bold text-[#002045]">{post.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          By {post.author?.name || 'Unknown author'} • {post.status}
                        </p>
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => beginEdit(post)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {post.content}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          {!loggedIn ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
              Log in to create or edit posts.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-3xl font-bold text-[#002045]">
                    {editingPostId ? 'Edit post' : 'Create post'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Your drafts stay private until you publish them.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
                  Your posts: {myPosts.length}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
                  <input
                    value={formData.title}
                    onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Content</span>
                  <textarea
                    rows={8}
                    value={formData.content}
                    onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))}
                    className="w-full rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-[#002045] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? 'Saving post...'
                      : editingPostId
                        ? 'Update post'
                        : 'Create post'}
                  </button>
                  {editingPostId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}

export default PostsPage;
