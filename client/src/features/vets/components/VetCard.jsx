import { Link } from 'react-router-dom';
import { useAuthSession } from '../../auth/context/AuthSessionContext';

const clinicCardImage =
  '/clinic-default.svg';

function VetCard({ vet, index = 0 }) {
  const { user: currentUser } = useAuthSession();
  const clinic = vet?.clinic || vet || {};
  const services = clinic.servicesOffered || [];
  const ratingValue =
    typeof clinic.averageRating === 'number'
      ? clinic.averageRating
      : typeof clinic.rating === 'number'
        ? clinic.rating
        : 0;
  const hasReviews = Number(clinic.totalReviews || 0) > 0;

  const clinicId = vet?._id || clinic?._id;
  const canBook = !currentUser || ['petOwner', 'admin'].includes(currentUser.role);
  const bookingTarget = currentUser ? `/vets/${clinicId}/book` : '/login';
  const appointmentsEnabled = clinic.appointmentsEnabled !== false;

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
      <div className="relative">
        <img
          src={clinic.clinicImage || clinicCardImage}
          alt={clinic.clinicName || 'Veterinary clinic'}
          className="h-56 w-full object-cover"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#002045] shadow">
          {hasReviews ? `★ ${ratingValue.toFixed(1)}` : 'No reviews yet'}
        </div>
        <div
          className={`absolute bottom-4 left-4 rounded-full px-3 py-1 text-xs font-bold ${
            vet?.isCurrentlyOpen || clinic?.isOpenNow
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-800 text-white'
          }`}
        >
          {vet?.isCurrentlyOpen || clinic?.isOpenNow ? 'Open now' : 'Closed now'}
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-display text-3xl font-bold leading-tight text-[#002045]">
          {clinic.clinicName || 'Unnamed Clinic'}
        </h3>
        <p className="mt-3 text-sm text-slate-600">
          {clinic.address || 'No address provided'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {clinic.contactNumber || 'No phone provided'}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {services.length > 0 ? (
            services.slice(0, 4).map((service, serviceIndex) => (
              <span
                key={`${clinic._id || index}-${serviceIndex}`}
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Consultation</div>
            <div className="mt-2 text-2xl font-extrabold text-[#002045]">৳ {clinic.consultationFee ?? 'N/A'}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Working hours</div>
            <div className="mt-2 text-sm font-semibold text-slate-700">
              {clinic.workingHours?.openTime && clinic.workingHours?.closeTime
                ? `${clinic.workingHours.openTime} - ${clinic.workingHours.closeTime}`
                : 'Not provided'}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {appointmentsEnabled ? 'Appointments available' : 'Appointments currently paused'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#002045] transition hover:border-slate-400 hover:bg-slate-50"
            to={`/vets/${clinicId}`}
          >
            View details
          </Link>

          {canBook &&
            (appointmentsEnabled ? (
              <Link
                className="rounded-xl bg-[#002045] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A365D]"
                to={bookingTarget}
                state={!currentUser ? { from: `/vets/${clinicId}/book` } : undefined}
              >
                Book appointment
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">
                Appointments off
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}

export default VetCard;
