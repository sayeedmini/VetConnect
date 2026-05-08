import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword, validatePasswordResetToken } from '../services/authApi';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    let ignore = false;

    const validateToken = async () => {
      if (!token) {
        setTokenError('This password reset link is missing a token.');
        setValidating(false);
        return;
      }

      try {
        await validatePasswordResetToken(token);
        if (!ignore) {
          setTokenError('');
        }
      } catch (error) {
        if (!ignore) {
          setTokenError(
            error?.response?.data?.message || 'This password reset link is invalid or has expired'
          );
        }
      } finally {
        if (!ignore) {
          setValidating(false);
        }
      }
    };

    validateToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await resetPassword({ token, password });
      alert(data.message);
      navigate('/login', { replace: true });
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const isTokenValid = !validating && !tokenError;

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="flex flex-col justify-between bg-[#EAF0FB] px-8 py-10 lg:px-10">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#002045] text-lg font-black text-white">P</div>
              <div>
                <div className="font-display text-xl font-extrabold text-[#002045]">VetConnect</div>
                <div className="text-xs text-slate-500">Choose a new password</div>
              </div>
            </Link>

            <div className="mt-16 max-w-xl">
              <div className="inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-700 ring-1 ring-teal-200">
                One-time reset link
              </div>
              <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-[#002045]">
                Create a fresh password and get back in securely.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Once your password is changed, previous active sessions are signed out and future
                logins continue to use your authenticator app as usual.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="font-semibold text-[#002045]">Password tips</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              Choose something memorable, unique to this account, and at least 6 characters long.
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
            <h2 className="font-display text-4xl font-extrabold text-[#002045]">
              Reset password
            </h2>
            <p className="mt-3 text-slate-600">
              {validating
                ? 'Checking your password reset link...'
                : isTokenValid
                  ? 'Enter your new password below.'
                  : 'This reset link cannot be used anymore.'}
            </p>

            {validating ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Validating link...
              </div>
            ) : isTokenValid ? (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    New password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a new password"
                    required
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm new password
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter the new password"
                    required
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#002045] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Saving new password...' : 'Save new password'}
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
                {tokenError}
              </div>
            )}

            <p className="mt-6 text-sm text-slate-600">
              Need a fresh link?{' '}
              <Link to="/forgot-password" className="font-semibold text-teal-700 hover:text-teal-800">
                Request another reset email
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
