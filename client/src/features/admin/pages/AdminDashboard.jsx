import { useEffect, useState } from 'react';
import SiteLayout from '../../../components/SiteLayout';
import apiClient from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/runtimeConfig';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotatingAlgorithm, setRotatingAlgorithm] = useState('');

  const loadAdminData = async () => {
    setLoading(true);

    try {
      const [usersResponse, postsResponse, keysResponse] = await Promise.all([
        apiClient.get(`${API_BASE_URL}/admin/users`),
        apiClient.get(`${API_BASE_URL}/admin/posts`),
        apiClient.get(`${API_BASE_URL}/admin/keys`),
      ]);

      setUsers(usersResponse.data?.data || []);
      setPosts(postsResponse.data?.data || []);
      setKeys(keysResponse.data?.data || []);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to load admin dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const rotateKey = async (algorithm) => {
    setRotatingAlgorithm(algorithm);

    try {
      const response = await apiClient.post(`${API_BASE_URL}/admin/keys/rotate/${algorithm}`);
      alert(response.data?.message || 'Key rotated successfully');
      await loadAdminData();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to rotate key');
      console.error(error);
    } finally {
      setRotatingAlgorithm('');
    }
  };

  return (
    <SiteLayout
      eyebrow="Admin control"
      title="Security administration"
      subtitle="Inspect users, posts, and managed asymmetric keys from one controlled dashboard."
    >
      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          Loading admin dashboard...
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-6 md:grid-cols-3">
            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Users</div>
              <div className="mt-3 text-4xl font-extrabold text-[#002045]">{users.length}</div>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Posts</div>
              <div className="mt-3 text-4xl font-extrabold text-[#002045]">{posts.length}</div>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Managed keys</div>
              <div className="mt-3 text-4xl font-extrabold text-[#002045]">{keys.length}</div>
            </article>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl font-bold text-[#002045]">Managed keys</h2>
              <div className="flex gap-3">
                {['rsa', 'ecc'].map((algorithm) => (
                  <button
                    key={algorithm}
                    type="button"
                    onClick={() => rotateKey(algorithm)}
                    disabled={rotatingAlgorithm === algorithm}
                    className="rounded-2xl bg-[#002045] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rotatingAlgorithm === algorithm
                      ? `Rotating ${algorithm.toUpperCase()}...`
                      : `Rotate ${algorithm.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {keys.map((key) => (
                <div key={key.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#002045]">
                        {key.algorithm.toUpperCase()} • {key.id}
                      </div>
                      <div className="text-sm text-slate-500">
                        Version {key.version} • {key.status}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      Created {new Date(key.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <h2 className="font-display text-3xl font-bold text-[#002045]">Users</h2>
            <div className="mt-6 grid gap-4">
              {users.map((item) => (
                <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#002045]">{item.name}</div>
                      <div className="text-sm text-slate-500">{item.email}</div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {item.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <h2 className="font-display text-3xl font-bold text-[#002045]">Posts</h2>
            <div className="mt-6 grid gap-4">
              {posts.map((post) => (
                <div key={post._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#002045]">{post.title}</div>
                      <div className="text-sm text-slate-500">
                        {post.author?.name || 'Unknown author'} • {post.status} • {(post.comments || []).length} comments
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      Updated {new Date(post.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </SiteLayout>
  );
}

export default AdminDashboard;
