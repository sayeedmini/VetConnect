import { useEffect, useState } from 'react';
import SiteLayout from '../../../components/SiteLayout';
import { saveAuth, getToken } from '../../auth/utils/auth';
import { getMyProfile, updateMyProfile } from '../services/profileApi';

function ProfilePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactInfo: '',
  });
  const [twoFactorConfigured, setTwoFactorConfigured] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('totp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      try {
        const response = await getMyProfile();
        if (!ignore) {
          setFormData({
            name: response.data?.name || '',
            email: response.data?.email || '',
            contactInfo: response.data?.contactInfo || '',
          });
          setTwoFactorConfigured(Boolean(response.data?.twoFactorConfigured));
          setTwoFactorMethod(response.data?.twoFactorMethod || 'totp');
        }
      } catch (error) {
        alert(error?.response?.data?.message || 'Failed to load profile');
        console.error(error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await updateMyProfile(formData);
      saveAuth(getToken(), response.data);
      setTwoFactorConfigured(Boolean(response.data?.twoFactorConfigured));
      setTwoFactorMethod(response.data?.twoFactorMethod || 'totp');
      alert('Profile updated successfully');
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to update profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout
      eyebrow="Encrypted profile"
      title="Your secure profile"
      subtitle="Profile fields are encrypted before storage and decrypted only when the app reads them back for an authorized session."
    >
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Loading profile...</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Two-factor security</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${twoFactorConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {twoFactorConfigured ? 'Configured' : 'Setup required'}
                </span>
                <span className="text-sm text-slate-600">
                  Method: {twoFactorMethod === 'totp' ? 'Authenticator app' : twoFactorMethod}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Authenticator setup is enforced at login. If this shows “Setup required,” sign out and sign in again to complete Microsoft Authenticator setup.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Name</span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Contact info</span>
                <input
                  name="contactInfo"
                  value={formData.contactInfo}
                  onChange={handleChange}
                  placeholder="Phone number or backup email"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#002045] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving profile...' : 'Save profile'}
              </button>
            </form>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export default ProfilePage;
