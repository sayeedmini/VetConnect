import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteLayout from '../../../components/SiteLayout';
import { useAuthSession } from '../../auth/context/AuthSessionContext';
import { getMyPrescriptions } from '../services/prescriptionApi';
import { downloadPrescriptionPdf } from '../utils/prescriptionPdf';

function PrescriptionHistoryPage() {
  const { user: currentUser } = useAuthSession();
  const [prescriptions, setPrescriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getMyPrescriptions();
      setPrescriptions(response.data || []);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to load prescription history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return prescriptions;

    return prescriptions.filter((item) => {
      return [
        item.petName,
        item.petType,
        item.clinic?.clinicName,
        item.diagnosis,
        ...(item.medicines || []).map((medicine) => medicine.name),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword));
    });
  }, [prescriptions, search]);

  const activeCount = filteredPrescriptions.filter((item) => (item.medicines || []).length > 0).length;
  const latestIssued = filteredPrescriptions[0]?.issuedAt || filteredPrescriptions[0]?.createdAt;

  return (
    <SiteLayout
      eyebrow="Medical records"
      title="Prescription History"
      subtitle={
        currentUser?.role === 'petOwner'
          ? 'All prescriptions issued for your pets, with download and follow-up actions.'
          : currentUser?.role === 'vet'
            ? 'A clean record of the prescriptions you created across completed consultations.'
            : 'A platform-wide prescription overview with search and follow-up actions.'
      }
      actions={
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pet, clinic, diagnosis, or medicine"
            className="w-72 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-400"
          />
          <Link className="rounded-xl bg-[#002045] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A365D]" to="/appointments">
            Back to appointments
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">Loading prescription history...</div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">No prescriptions found.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredPrescriptions.map((prescription) => {
                const statusTone = (prescription.medicines?.length || 0) > 0
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-700 ring-slate-200';

                return (
                  <article key={prescription._id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E4EAFB] text-xl font-bold text-[#002045]">
                            {prescription.petName?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <h3 className="font-display text-3xl font-bold text-[#002045]">{prescription.petName}</h3>
                            <p className="text-sm text-slate-600">{prescription.petType || 'Pet'} • {prescription.clinic?.clinicName || 'Clinic not available'}</p>
                          </div>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone}`}>
                        {(prescription.medicines?.length || 0) > 0 ? 'Active' : 'Completed'}
                      </span>
                    </div>

                    <div className="mt-6 rounded-[24px] bg-slate-50 p-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Diagnosis</div>
                          <div className="mt-2 text-lg font-semibold text-[#002045]">{prescription.diagnosis}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Date issued</div>
                          <div className="mt-2 text-lg font-semibold text-[#002045]">{new Date(prescription.issuedAt || prescription.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-200 pt-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prescribed medication</div>
                        <div className="mt-3 space-y-3">
                          {(prescription.medicines || []).slice(0, 2).map((medicine, index) => (
                            <div key={`${prescription._id}-${index}`} className="rounded-2xl bg-white p-4">
                              <div className="font-semibold text-[#002045]">{medicine.name}</div>
                              <div className="mt-1 text-sm text-slate-600">
                                {[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(' • ') || 'Medication details available in full record'}
                              </div>
                            </div>
                          ))}
                          {(prescription.medicines || []).length === 0 && (
                            <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">No medicine rows recorded.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => downloadPrescriptionPdf(prescription)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        Download PDF
                      </button>
                      <Link
                        to={`/appointments/${prescription.appointment?._id}/prescription`}
                        className="rounded-xl bg-[#002045] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A365D]"
                      >
                        Open record
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</div>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Visible prescriptions</div>
                <div className="mt-2 text-4xl font-extrabold text-[#002045]">{filteredPrescriptions.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Active medication plans</div>
                <div className="mt-2 text-4xl font-extrabold text-[#002045]">{activeCount}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Latest issued</div>
                <div className="mt-2 text-lg font-semibold text-[#002045]">
                  {latestIssued ? new Date(latestIssued).toLocaleDateString() : 'No records yet'}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}

export default PrescriptionHistoryPage;
