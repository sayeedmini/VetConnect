import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SiteLayout from '../../../components/SiteLayout';
import { formatFriendlyDate } from '../../../utils/date';
import { useAuthSession } from '../../auth/context/AuthSessionContext';
import { cancelAppointment, completeAppointment, getMyAppointments } from '../services/appointmentApi';

function StatusBadge({ status }) {
  const styles = {
    scheduled: 'bg-amber-50 text-amber-700 ring-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${styles[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
      <div className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold ${tone}`}>{label}</div>
      <div className="mt-5 font-display text-5xl font-extrabold text-[#002045]">{value}</div>
    </div>
  );
}

function MyAppointmentsPage() {
  const location = useLocation();
  const { user: currentUser } = useAuthSession();
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async (status = '') => {
    setLoading(true);
    try {
      const response = await getMyAppointments(status);
      setAppointments(response.data || []);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to fetch appointments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(statusFilter);
  }, [fetchAppointments, statusFilter]);

  useEffect(() => {
    if (location.state?.newAppointment?._id) {
      fetchAppointments(statusFilter);
    }
  }, [fetchAppointments, location.state, statusFilter]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      alert('Appointment cancelled');
      fetchAppointments(statusFilter);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to cancel appointment');
      console.error(error);
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeAppointment(id);
      alert('Appointment marked as completed');
      fetchAppointments(statusFilter);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to mark appointment as completed');
      console.error(error);
    }
  };

  const scheduledCount = appointments.filter((item) => item.status === 'scheduled').length;
  const completedCount = appointments.filter((item) => item.status === 'completed').length;
  const cancelledCount = appointments.filter((item) => item.status === 'cancelled').length;
  const nextAppointment = useMemo(
    () => appointments.find((item) => item.status === 'scheduled') || null,
    [appointments]
  );

  return (
    <SiteLayout
      eyebrow="Appointment dashboard"
      title={currentUser?.role === 'vet' ? 'Clinic schedule overview' : 'Your appointment timeline'}
      subtitle={
        currentUser?.role === 'vet'
          ? 'Manage scheduled visits, complete consultations, and open prescription workspaces.'
          : 'Track upcoming visits, manage rescheduling, and jump straight into prescription history.'
      }
      actions={
        <>
          <Link to="/prescriptions" className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100">
            View prescriptions
          </Link>
          <Link to="/vets" className="rounded-xl bg-[#002045] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A365D]">
            Browse clinics
          </Link>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Scheduled" value={scheduledCount} tone="bg-amber-50 text-amber-700 ring-1 ring-amber-200" />
            <StatCard label="Completed" value={completedCount} tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" />
            <StatCard label="Cancelled" value={cancelledCount} tone="bg-rose-50 text-rose-700 ring-1 ring-rose-200" />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold text-[#002045]">Recent appointments</h2>
                <p className="mt-2 text-sm text-slate-600">Filter and manage every appointment from one clean view.</p>
              </div>
              <label className="block min-w-[220px]">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Status filter</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                >
                  <option value="">All</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Loading appointments...</div>
            ) : appointments.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">No appointments found.</div>
            ) : (
              <div className="mt-6 space-y-4">
                {appointments.map((appointment) => {
                  const canReschedule = appointment.status === 'scheduled' && ['petOwner', 'admin'].includes(currentUser?.role);
                  const canComplete = appointment.status === 'scheduled' && ['vet', 'admin'].includes(currentUser?.role);
                  const canManagePrescription = appointment.status === 'completed' && ['vet', 'admin', 'petOwner'].includes(currentUser?.role);
                  const canReviewClinic = appointment.status === 'completed' && ['petOwner', 'admin'].includes(currentUser?.role);

                  return (
                    <article key={appointment._id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-display text-2xl font-bold text-[#002045]">{appointment.clinic?.clinicName || 'Clinic not available'}</h3>
                            <StatusBadge status={appointment.status} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            Pet: {appointment.petName} • {appointment.petType || 'Not specified'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                          <div className="font-semibold text-[#002045]">{formatFriendlyDate(appointment.appointmentDate)}</div>
                          <div>{appointment.slotLabel}</div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Reason</div>
                          <div className="mt-2 text-sm font-medium text-slate-700">{appointment.reason || 'Not specified'}</div>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Reminder</div>
                          <div className="mt-2 text-sm font-medium text-slate-700">
                            {appointment.reminderAt ? new Date(appointment.reminderAt).toLocaleString() : 'Not scheduled'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                          to={`/messages?appointment=${appointment._id}`}
                        >
                          {['vet', 'admin'].includes(currentUser?.role)
                            ? 'Message pet owner'
                            : 'Message vet'}
                        </Link>
                        {canReschedule && (
                          <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#002045] transition hover:border-slate-400 hover:bg-slate-100" to={`/appointments/${appointment._id}/reschedule`}>
                            Reschedule
                          </Link>
                        )}
                        {appointment.status === 'scheduled' && (
                          <button type="button" className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={() => handleCancel(appointment._id)}>
                            Cancel
                          </button>
                        )}
                        {canComplete && (
                          <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700" onClick={() => handleComplete(appointment._id)}>
                            Mark completed
                          </button>
                        )}
                        {canManagePrescription && (
                          <Link className="rounded-xl bg-[#002045] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A365D]" to={`/appointments/${appointment._id}/prescription`}>
                            {['vet', 'admin'].includes(currentUser?.role) ? 'Create / View prescription' : 'View prescription'}
                          </Link>
                        )}
                        {canReviewClinic && (
                          <Link className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100" to={`/vets/${appointment.clinic?._id}`}>
                            Review clinic
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Next up</div>
            {nextAppointment ? (
              <>
                <h3 className="mt-4 font-display text-3xl font-bold text-[#002045]">{nextAppointment.petName}</h3>
                <p className="mt-2 text-slate-600">{nextAppointment.clinic?.clinicName}</p>
                <div className="mt-6 rounded-[24px] bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-[#002045]">{formatFriendlyDate(nextAppointment.appointmentDate)}</div>
                  <div className="mt-1 text-slate-600">{nextAppointment.slotLabel}</div>
                  <div className="mt-4 text-sm text-slate-500">{nextAppointment.reason || 'Consultation'}</div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-600">No upcoming appointment yet.</p>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quick actions</div>
            <div className="mt-5 grid gap-3">
              <Link className="rounded-2xl bg-[#002045] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1A365D]" to="/vets">
                Book new appointment
              </Link>
              <Link className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" to="/prescriptions">
                Open prescription history
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}

export default MyAppointmentsPage;
