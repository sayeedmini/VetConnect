import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestPasswordReset } from '../services/authApi';

function ForgotPasswordPage() {
  const location = useLocation();
  const prefillEmail = location.state?.prefillEmail || '';
  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await requestPasswordReset(email);
      setResult({
        success: true,
        message: data.message,
        debugResetUrl: data.debugResetUrl || '',
      });
    } catch (error) {
      setResult({
        success: false,
        message: error?.response?.data?.message || 'Failed to request password reset',
      });
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
                <div className="text-xs text-slate-500">Secure account recovery</div>
              </div>
            </Link>

            <div className="mt-16 max-w-xl">
              <div className="inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-700 ring-1 ring-teal-200">
                Password recovery
              </div>
              <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-[#002045]">
                Reset access without losing your account.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Enter the email attached to your VetConnect account and we will send a secure reset
                link if the account exists.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="font-semibold text-[#002045]">What happens next</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              The reset link expires after 30 minutes. After you choose a new password, existing
              signed-in sessions will need to log in again.
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
            <h2 className="font-display text-4xl font-extrabold text-[#002045]">
              Forgot password
            </h2>
            <p className="mt-3 text-slate-600">
              We will send recovery instructions to your registered email address.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Email address
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              {result ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    result.success
                      ? 'border-teal-200 bg-teal-50 text-teal-800'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  <div>{result.message}</div>
                  {result.debugResetUrl ? (
                    <a
                      href={result.debugResetUrl}
                      className="mt-2 inline-block font-semibold text-[#002045] underline"
                    >
                      Open development reset link
                    </a>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#002045] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending reset link...' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-600">
              Remembered it?{' '}
              <Link
                to="/login"
                state={{ ...location.state, prefillEmail: email }}
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Back to login
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
