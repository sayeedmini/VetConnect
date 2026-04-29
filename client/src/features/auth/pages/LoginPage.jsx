import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authApi';
import { saveAuth } from '../utils/auth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/vets';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await loginUser(formData);
      saveAuth(data.token, data.user);
      alert('Login successful');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      alert(error?.response?.data?.message || 'Login failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="flex flex-col justify-between bg-[#EAF0FB] px-8 py-10 lg:px-10">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#002045] text-lg font-black text-white">P</div>
              <div>
                <div className="font-display text-xl font-extrabold text-[#002045]">VetConnect</div>
                <div className="text-xs text-slate-500">Smarter pet care access</div>
              </div>
            </Link>

            <div className="mt-16 max-w-xl">
              <div className="inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-700 ring-1 ring-teal-200">Welcome back</div>
              <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-[#002045]">Sign in to manage clinics and appointments beautifully.</h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Continue with a cleaner dashboard for discovering veterinary clinics, tracking schedules,
                and keeping every visit organized in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="font-semibold text-[#002045]">Appointments in one view</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">Track upcoming, completed, and cancelled visits easily.</div>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="font-semibold text-[#002045]">Role-based workflow</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">Pet owners and vets see actions that fit their tasks.</div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
            <h2 className="font-display text-4xl font-extrabold text-[#002045]">Login</h2>
            <p className="mt-3 text-slate-600">Enter your account details to continue.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                />
              </label>

              <button type="submit" className="w-full rounded-2xl bg-[#002045] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-600">
              No account yet?{' '}
              <Link
                to="/register"
                state={{ from: redirectTo }}
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Register here
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default LoginPage;
