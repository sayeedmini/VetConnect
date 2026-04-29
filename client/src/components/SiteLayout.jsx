import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getUser, isLoggedIn, logout } from '../features/auth/utils/auth';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/vets', label: 'Find Clinics' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/prescriptions', label: 'Prescriptions' },
];

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'rounded-full px-4 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-[#002045]',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  );
}

function SiteLayout({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  backTo,
  backLabel = 'Back',
  compact = false,
}) {
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#002045] text-lg font-black text-white shadow-[0_16px_40px_rgba(0,32,69,0.18)]">
              P
            </div>
            <div>
              <div className="font-display text-xl font-extrabold tracking-tight text-[#002045]">VetConnect</div>
              <div className="text-xs text-slate-500">Trusted veterinary care platform</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {loggedIn ? (
              <>
                <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 md:block">
                  <span className="font-semibold text-[#002045]">{user?.name || 'User'}</span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="capitalize">{user?.role || 'member'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-semibold text-slate-700 transition hover:text-teal-700 sm:inline-block">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#002045] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,32,69,0.2)] transition hover:bg-[#1A365D]"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {(title || subtitle || eyebrow || actions || backTo) && (
          <section className={`mx-auto w-full max-w-7xl px-4 ${compact ? 'pt-10' : 'pt-14'} sm:px-6 lg:px-8`}>
            <div className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-8 lg:px-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  {backTo && (
                    <Link to={backTo} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800">
                      <span aria-hidden="true">←</span>
                      {backLabel}
                    </Link>
                  )}
                  {eyebrow && (
                    <div className="mb-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 ring-1 ring-teal-200">
                      {eyebrow}
                    </div>
                  )}
                  {title && <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#002045] sm:text-5xl">{title}</h1>}
                  {subtitle && <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{subtitle}</p>}
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
              </div>
            </div>
          </section>
        )}

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-2">
            <div className="font-display text-2xl font-extrabold text-[#002045]">VetConnect</div>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
              Connecting pet owners with trusted veterinary clinics, seamless appointment booking,
              digital prescriptions, and verified care records.
            </p>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Platform</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <Link className="block hover:text-teal-700" to="/vets">Find a Vet</Link>
              <Link className="block hover:text-teal-700" to="/appointments">Book Appointment</Link>
              <Link className="block hover:text-teal-700" to="/prescriptions">Prescription History</Link>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Company</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <span className="block">About Us</span>
              <span className="block">Contact Support</span>
              <span className="block">Bangladesh-focused pet care</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Legal</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <span className="block">Privacy Policy</span>
              <span className="block">Terms of Service</span>
              <span className="block">Clinic verification policy</span>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
          © 2026 VetConnect. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default SiteLayout;
