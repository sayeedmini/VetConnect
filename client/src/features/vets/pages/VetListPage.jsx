import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteLayout from '../../../components/SiteLayout';
import { useAuthSession } from '../../auth/context/AuthSessionContext';
import { getAllVets } from '../services/vetApi';

const defaultFilters = {
  search: '',
  service: '',
  minRating: '',
  lat: '',
  lng: '',
  radiusKm: '',
};

const DEFAULT_CLINIC_IMAGE = '/clinic-default.svg';

const serviceOptions = [
  { value: '', label: 'All Services' },
  { value: 'General Checkup', label: 'General Checkup' },
  { value: 'Vaccination', label: 'Vaccination' },
  { value: 'Surgery', label: 'Surgery' },
  { value: 'Dental', label: 'Dental Care' },
  { value: 'Emergency', label: 'Emergency' },
];

function VetListPage() {
  const [vets, setVets] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recommended');
  const { user: currentUser } = useAuthSession();

  const fetchVets = async (activeFilters = {}) => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(activeFilters).filter(([, value]) => value !== '' && value !== null && value !== undefined)
      );
      const data = await getAllVets(cleanFilters);
      setVets(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVets();
  }, []);

  const normalizedVets = useMemo(
    () =>
      vets.map((vet, index) => {
        const clinic = vet?.clinic || vet || {};
        const clinicId = vet?._id || clinic?._id || `clinic-${index}`;
        const services = clinic.servicesOffered || [];
        const ratingValue =
          typeof clinic.averageRating === 'number'
            ? clinic.averageRating
            : typeof clinic.rating === 'number'
              ? clinic.rating
              : 0;
        const totalReviews = Number(clinic.totalReviews || 0);
        const hasReviews = totalReviews > 0;
        const isOpen = Boolean(vet?.isCurrentlyOpen || clinic?.isOpenNow);

        return {
          clinic,
          clinicId,
          services,
          thumbnailImage: clinic.clinicImage || DEFAULT_CLINIC_IMAGE,
          ratingValue,
          totalReviews,
          hasReviews,
          isOpen,
        };
      }),
    [vets]
  );

  const sortedVets = useMemo(() => {
    const next = [...normalizedVets];

    if (sortBy === 'rating') {
      next.sort((a, b) => b.ratingValue - a.ratingValue);
    } else if (sortBy === 'distance') {
      next.sort((a, b) => String(a.clinic.address || '').localeCompare(String(b.clinic.address || '')));
    }

    return next;
  }, [normalizedVets, sortBy]);

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchVets(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    fetchVets(defaultFilters);
  };

  return (
    <SiteLayout compact>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-5xl font-extrabold tracking-tight text-[#002045]">
                Find Veterinary Clinics
              </h1>
              <p className="text-lg text-slate-600">Discover top-rated veterinary care near you.</p>
            </div>

            {currentUser?.role === 'vet' && (
              <Link
                to="/vets/add"
                className="inline-flex items-center justify-center rounded-xl bg-[#002045] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1A365D]"
              >
                Add Clinic
              </Link>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_40px_rgba(26,54,93,0.05)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <label className="flex-1">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Location
                </span>
                <input
                  name="search"
                  placeholder="Enter city or zip code"
                  value={filters.search}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </label>

              <label className="flex-1">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Service Type
                </span>
                <select
                  name="service"
                  value={filters.service}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  {serviceOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex-1">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Minimum Rating
                </span>
                <select
                  name="minRating"
                  value={filters.minRating}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5 & Above</option>
                  <option value="4.0">4.0 & Above</option>
                  <option value="3.5">3.5 & Above</option>
                </select>
              </label>

              <button
                className="flex h-[46px] items-center justify-center rounded-xl bg-[#002045] px-8 text-sm font-semibold text-white transition hover:bg-[#1A365D]"
                type="submit"
              >
                Search
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="flex h-[46px] items-center justify-center rounded-xl bg-teal-600 px-8 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <div className="flex flex-col gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-3xl font-bold text-[#002045]">
                {loading ? 'Loading clinics...' : `${sortedVets.length} Clinics Found`}
              </h2>

              <label className="flex items-center gap-2 text-sm text-slate-500">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-[#002045] outline-none focus:border-teal-500"
                >
                  <option value="recommended">Recommended</option>
                  <option value="distance">Distance</option>
                  <option value="rating">Rating</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-[420px] animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : !sortedVets.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                No vet clinics matched your current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sortedVets.map((item) => {
                  const {
                    clinic,
                    clinicId,
                    services,
                    hasReviews,
                    ratingValue,
                    totalReviews,
                    isOpen,
                  } = item;

                  return (
                    <article
                      key={clinicId}
                      className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#F8FAFC] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={item.thumbnailImage}
                          alt={clinic.clinicName || 'Veterinary clinic'}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#002045] shadow-sm">
                          {hasReviews ? `★ ${ratingValue.toFixed(1)}` : 'No reviews yet'}
                        </div>
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          <span
                            className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm ${
                              isOpen ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-white'
                            }`}
                          >
                            {isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div>
                          <h3 className="font-display text-2xl font-bold text-[#002045]">
                            {clinic.clinicName || 'Unnamed Clinic'}
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">
                            {clinic.address || 'Address not provided'}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {services.length > 0 ? (
                            services.slice(0, 3).map((service, index) => (
                              <span
                                key={`${clinicId}-${index}`}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                              >
                                {service}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                              No services listed
                            </span>
                          )}
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Consultation</div>
                            <div className="mt-1 text-xl font-bold text-[#002045]">৳ {clinic.consultationFee ?? 'N/A'}</div>
                          </div>
                          <Link
                            to={`/vets/${clinicId}`}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#002045] transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

export default VetListPage;
