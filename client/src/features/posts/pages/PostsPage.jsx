import { useEffect, useMemo, useState } from 'react';
import SiteLayout from '../../../components/SiteLayout';
import { useAuthSession } from '../../auth/context/AuthSessionContext';
import {
  createComment,
  createPost,
  deleteComment,
  getPosts,
  updateComment,
  updatePost,
} from '../services/postApi';

function PostsPage() {
  const { user, isLoggedIn: loggedIn } = useAuthSession();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [commentSavingKey, setCommentSavingKey] = useState('');
  const [editingComment, setEditingComment] = useState({ postId: '', commentId: '' });
  const [commentDrafts, setCommentDrafts] = useState({});
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

  const isVet = user?.role === 'vet';

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

  const applyUpdatedPost = (updatedPost) => {
    setPosts((current) =>
      current.map((post) => (post._id === updatedPost._id ? updatedPost : post))
    );
  };

  const getCommentDraftKey = (postId, commentId = 'new') => `${postId}:${commentId}`;

  const startCommentEdit = (postId, comment) => {
    const draftKey = getCommentDraftKey(postId, comment._id);
    setEditingComment({ postId, commentId: comment._id });
    setCommentDrafts((current) => ({
      ...current,
      [draftKey]: comment.content || '',
    }));
  };

  const cancelCommentEdit = () => {
    setEditingComment({ postId: '', commentId: '' });
  };

  const handleCommentDraftChange = (postId, commentId, value) => {
    const draftKey = getCommentDraftKey(postId, commentId);
    setCommentDrafts((current) => ({
      ...current,
      [draftKey]: value,
    }));
  };

  const handleCreateComment = async (postId) => {
    const draftKey = getCommentDraftKey(postId);
    const content = String(commentDrafts[draftKey] || '').trim();

    if (!content) {
      alert('Comment content is required');
      return;
    }

    setCommentSavingKey(draftKey);

    try {
      const response = await createComment(postId, { content });
      applyUpdatedPost(response.data);
      setCommentDrafts((current) => ({
        ...current,
        [draftKey]: '',
      }));
      alert('Comment added successfully');
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to add comment');
      console.error(error);
    } finally {
      setCommentSavingKey('');
    }
  };

  const handleUpdateComment = async (postId, commentId) => {
    const draftKey = getCommentDraftKey(postId, commentId);
    const content = String(commentDrafts[draftKey] || '').trim();

    if (!content) {
      alert('Comment content is required');
      return;
    }

    setCommentSavingKey(draftKey);

    try {
      const response = await updateComment(postId, commentId, { content });
      applyUpdatedPost(response.data);
      setEditingComment({ postId: '', commentId: '' });
      alert('Comment updated successfully');
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to update comment');
      console.error(error);
    } finally {
      setCommentSavingKey('');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    setCommentSavingKey(getCommentDraftKey(postId, commentId));

    try {
      const response = await deleteComment(postId, commentId);
      applyUpdatedPost(response.data);
      if (
        editingComment.postId === postId &&
        editingComment.commentId === commentId
      ) {
        setEditingComment({ postId: '', commentId: '' });
      }
      alert('Comment deleted successfully');
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete comment');
      console.error(error);
    } finally {
      setCommentSavingKey('');
    }
  };

  return (
    <SiteLayout
      eyebrow="Encrypted posts"
      title="Secure posts workspace"
      subtitle="Posts and post comments are stored encrypted at rest and automatically decrypted when authorized readers open them through the application."
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#002045]">Published feed</h2>
              <p className="mt-2 text-sm text-slate-600">
                Everyone sees published posts, while drafts remain private to their author and
                admins. Only vets can add comments.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {visiblePosts.length}
            </span>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
              Loading posts...
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
              No posts available yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {visiblePosts.map((post) => {
                const canEditPost =
                  loggedIn && (post.author?._id === user?._id || user?.role === 'admin');
                const comments = Array.isArray(post.comments) ? post.comments : [];
                const newCommentDraftKey = getCommentDraftKey(post._id);

                return (
                  <article
                    key={post._id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-bold text-[#002045]">
                          {post.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          By {post.author?.name || 'Unknown author'} • {post.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {comments.length} comment{comments.length === 1 ? '' : 's'}
                        </span>
                        {canEditPost ? (
                          <button
                            type="button"
                            onClick={() => beginEdit(post)}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {post.content}
                    </p>

                    <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                          Discussion
                        </h4>
                        {post.status !== 'published' ? (
                          <span className="text-xs font-semibold text-slate-500">
                            Comments disabled for drafts
                          </span>
                        ) : null}
                      </div>

                      {comments.length === 0 ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          No comments yet.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {comments.map((comment) => {
                            const isEditing =
                              editingComment.postId === post._id &&
                              editingComment.commentId === comment._id;
                            const canManageComment =
                              loggedIn &&
                              (comment.author?._id === user?._id || user?.role === 'admin');
                            const commentDraftKey = getCommentDraftKey(post._id, comment._id);

                            return (
                              <div
                                key={comment._id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-[#002045]">
                                      {comment.author?.name || 'Unknown vet'}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {comment.author?.role || 'user'} •{' '}
                                      {new Date(comment.updatedAt || comment.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                  {canManageComment ? (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => startCommentEdit(post._id, comment)}
                                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(post._id, comment._id)}
                                        disabled={commentSavingKey === commentDraftKey}
                                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                {isEditing ? (
                                  <div className="mt-4 space-y-3">
                                    <textarea
                                      rows={4}
                                      value={commentDrafts[commentDraftKey] ?? comment.content ?? ''}
                                      onChange={(event) =>
                                        handleCommentDraftChange(
                                          post._id,
                                          comment._id,
                                          event.target.value
                                        )
                                      }
                                      className="w-full rounded-[20px] border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                                    />
                                    <div className="flex flex-wrap gap-3">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateComment(post._id, comment._id)}
                                        disabled={commentSavingKey === commentDraftKey}
                                        className="rounded-2xl bg-[#002045] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {commentSavingKey === commentDraftKey
                                          ? 'Saving comment...'
                                          : 'Save comment'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelCommentEdit}
                                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                    {comment.content}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {post.status === 'published' && isVet ? (
                        <div className="mt-5 space-y-3">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">
                              Add a vet comment
                            </span>
                            <textarea
                              rows={4}
                              value={commentDrafts[newCommentDraftKey] || ''}
                              onChange={(event) =>
                                handleCommentDraftChange(post._id, 'new', event.target.value)
                              }
                              placeholder="Share clinical advice or a professional response"
                              className="w-full rounded-[20px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCreateComment(post._id)}
                            disabled={commentSavingKey === newCommentDraftKey}
                            className="rounded-2xl bg-[#002045] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {commentSavingKey === newCommentDraftKey
                              ? 'Posting comment...'
                              : 'Post comment'}
                          </button>
                        </div>
                      ) : post.status === 'published' ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          {loggedIn
                            ? 'Only users with the vet role can comment on posts.'
                            : 'Log in as a vet to join the discussion.'}
                        </div>
                      ) : null}
                    </div>
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
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Content</span>
                  <textarea
                    rows={8}
                    value={formData.content}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, content: event.target.value }))
                    }
                    className="w-full rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, status: event.target.value }))
                    }
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
