import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../context/AuthSessionContext';
import { loginUser, verifyTwoFactor } from '../services/authApi';
import { saveAuth } from '../utils/auth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/vets';
  const prefillEmail = location.state?.prefillEmail || '';
  const { isLoggedIn, isReady } = useAuthSession();

  const [formData, setFormData] = useState({ email: prefillEmail, password: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState([]);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  useEffect(() => {
    let ignore = false;

    const buildQrCode = async () => {
      if (!challenge?.otpauthUrl) {
        setQrCodeDataUrl('');
        return;
      }

      try {
        const nextQrCodeDataUrl = await QRCode.toDataURL(challenge.otpauthUrl, {
          width: 220,
          margin: 1,
        });

        if (!ignore) {
          setQrCodeDataUrl(nextQrCodeDataUrl);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setQrCodeDataUrl('');
        }
      }
    };

    buildQrCode();
    return () => {
      ignore = true;
    };
  }, [challenge?.otpauthUrl]);

  useEffect(() => {
    if (isReady && isLoggedIn && generatedBackupCodes.length === 0) {
      navigate(redirectTo, { replace: true });
    }
  }, [generatedBackupCodes.length, isLoggedIn, isReady, navigate, redirectTo]);

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handlePrimarySubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await loginUser(formData);
      setChallenge(data);
      setVerificationCode('');

      if (data.requiresTwoFactorSetup) {
        alert(
          'Scan the QR code with Microsoft Authenticator, then enter the 6-digit code to finish signing in.'
        );
      } else {
        alert('Open your authenticator app and enter the current code or one of your backup codes.');
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Login failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await verifyTwoFactor({
        challengeId: challenge?.challengeId,
        code: verificationCode,
      });

      saveAuth(data.user);

      if (Array.isArray(data.backupCodes) && data.backupCodes.length > 0) {
        setGeneratedBackupCodes(data.backupCodes);
        setCopiedBackupCodes(false);
        setChallenge(null);
        setVerificationCode('');
        alert('Authenticator setup complete. Save your backup codes before continuing.');
        return;
      }

      alert(data.message || 'Login successful');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      alert(error?.response?.data?.message || 'Verification failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetLogin = () => {
    setChallenge(null);
    setVerificationCode('');
    setQrCodeDataUrl('');
    setGeneratedBackupCodes([]);
    setCopiedBackupCodes(false);
  };

  const handleCopyBackupCodes = async () => {
    if (!generatedBackupCodes.length || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedBackupCodes.join('\n'));
      setCopiedBackupCodes(true);
    } catch (error) {
      console.error(error);
      alert('Failed to copy backup codes');
    }
  };

  const handleContinueAfterBackupCodes = () => {
    setGeneratedBackupCodes([]);
    navigate(redirectTo, { replace: true });
  };

  const isSetupFlow = Boolean(challenge?.requiresTwoFactorSetup);

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="flex flex-col justify-between bg-[#EAF0FB] px-8 py-10 lg:px-10">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#002045] text-lg font-black text-white">
                P
              </div>
              <div>
                <div className="font-display text-xl font-extrabold text-[#002045]">VetConnect</div>
                <div className="text-xs text-slate-500">Smarter pet care access</div>
              </div>
            </Link>

            <div className="mt-16 max-w-xl">
              <div className="inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-700 ring-1 ring-teal-200">
                Welcome back
              </div>
              <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-[#002045]">
                Sign in to manage clinics and appointments beautifully.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Continue with a cleaner dashboard for discovering veterinary clinics, tracking
                schedules, and keeping every visit organized in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="font-semibold text-[#002045]">Authenticator protected</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                Use Microsoft Authenticator or any compatible TOTP app for stronger two-step
                security.
              </div>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="font-semibold text-[#002045]">Recovery ready</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                Backup codes give you a safe fallback if your authenticator device is unavailable.
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
            <h2 className="font-display text-4xl font-extrabold text-[#002045]">
              {generatedBackupCodes.length > 0
                ? 'Save backup codes'
                : challenge
                  ? isSetupFlow
                    ? 'Set up authenticator'
                    : 'Two-step verification'
                  : 'Login'}
            </h2>
            <p className="mt-3 text-slate-600">
              {generatedBackupCodes.length > 0
                ? 'These backup codes are shown once. Store them somewhere safe before continuing.'
                : challenge
                  ? isSetupFlow
                    ? 'Scan the QR code in Microsoft Authenticator, then enter the 6-digit code it generates.'
                    : 'Open your authenticator app and enter the current code, or use one of your backup codes.'
                  : 'Enter your account details to continue.'}
            </p>

            {generatedBackupCodes.length > 0 ? (
              <div className="mt-8 space-y-5">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    One-time backup codes
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {generatedBackupCodes.map((code) => (
                      <div
                        key={code}
                        className="rounded-2xl bg-white px-4 py-3 font-mono text-base font-semibold text-[#002045] ring-1 ring-slate-200"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Each code works once. You can regenerate a new set later from your profile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {copiedBackupCodes ? 'Backup codes copied' : 'Copy backup codes'}
                </button>

                <button
                  type="button"
                  onClick={handleContinueAfterBackupCodes}
                  className="w-full rounded-2xl bg-[#002045] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1A365D]"
                >
                  I have saved these codes
                </button>
              </div>
            ) : challenge ? (
              <form onSubmit={handleVerificationSubmit} className="mt-8 space-y-5">
                {isSetupFlow ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col items-center gap-4">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Authenticator QR code"
                          className="rounded-2xl border border-slate-200 bg-white p-3"
                        />
                      ) : (
                        <div className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                          Generating QR code...
                        </div>
                      )}
                      <div className="w-full rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          Manual entry key
                        </div>
                        <div className="mt-2 break-all font-mono text-sm font-semibold text-[#002045]">
                          {challenge.manualEntryKey}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          In Microsoft Authenticator, add a new account and choose the generic
                          authenticator or other account option before scanning this QR code or
                          entering the key manually.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    {isSetupFlow ? 'Verification code' : 'Authenticator or backup code'}
                  </span>
                  <input
                    type="text"
                    inputMode={isSetupFlow ? 'numeric' : 'text'}
                    placeholder={isSetupFlow ? 'Enter the 6-digit code' : 'Enter a 6-digit or backup code'}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />
                </label>

                {!isSetupFlow ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Backup codes are one-time recovery codes in the format `ABCD-EFGH`.
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#002045] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading
                    ? isSetupFlow
                      ? 'Activating authenticator...'
                      : 'Verifying...'
                    : isSetupFlow
                      ? 'Activate and sign in'
                      : 'Verify and continue'}
                </button>

                <button
                  type="button"
                  onClick={resetLogin}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Start over
                </button>
              </form>
            ) : (
              <form onSubmit={handlePrimarySubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </span>
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

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    state={{ from: redirectTo, prefillEmail: formData.email }}
                    className="text-sm font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#002045] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Checking credentials...' : 'Continue to verification'}
                </button>
              </form>
            )}

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
