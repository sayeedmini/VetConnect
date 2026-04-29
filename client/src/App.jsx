import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import BookAppointmentPage from './features/appointments/pages/BookAppointmentPage';
import MyAppointmentsPage from './features/appointments/pages/MyAppointmentsPage';
import RescheduleAppointmentPage from './features/appointments/pages/RescheduleAppointmentPage';
import { getUser, isLoggedIn } from './features/auth/utils/auth';
import AppointmentPrescriptionPage from './features/prescriptions/pages/AppointmentPrescriptionPage';
import PrescriptionHistoryPage from './features/prescriptions/pages/PrescriptionHistoryPage';
import PrescriptionVerificationPage from './features/prescriptions/pages/PrescriptionVerificationPage';
import AddVetPage from './features/vets/pages/AddVetPage';
import EditVetPage from './features/vets/pages/EditVetPage';
import VetDetailsPage from './features/vets/pages/VetDetailsPage';
import VetListPage from './features/vets/pages/VetListPage';
import { getAllVets } from './features/vets/services/vetApi';

const featureCards = [
  {
    title: 'Trusted Vets',
    description: 'Access verified clinics and compare service quality, ratings, and consultation details.',
    tone: 'bg-[#DDEAFE] text-[#002045]',
    icon: '+',
  },
  {
    title: 'Easy Booking',
    description: 'Choose a clinic, find an available slot, and confirm appointments in a polished flow.',
    tone: 'bg-[#D7F4F4] text-[#13696A]',
    icon: 'C',
  },
  {
    title: 'Digital Prescriptions',
    description: 'Keep treatment history, medicine details, PDF exports, and QR verification together.',
    tone: 'bg-[#E4EAFB] text-[#1A365D]',
    icon: 'Rx',
  },
  {
    title: 'Verified Reviews',
    description: 'Make informed choices with clinic reviews from completed appointments only.',
    tone: 'bg-[#D9F4EF] text-[#13696A]',
    icon: '*',
  },
];

const clinicImageFallbacks = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDdl-oJEfmj1-MRfk26dXhdEwOPHvNxWxvGWAw_3HOXVQh-EWdwvJ1drwZCXP4g1LDG5foK05H416Rx1O5MsKJWeiVOsvZBK2F_WfD4dV__EFufD_uDotup1t9lhHkVFuFEXaipadGakirdStwd8LJB836QpHRfGxc025EBrCbErp4kb-GWLcMNNiQ-jEwtHHFh9K74YfM42UoATv7fsXisCWXwrhyaaD5hjkdPQ45z9W3ZFl7wZMy0ODsO0iH1VPTSPBfe6IohBX3w',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDUG56S8CvUDLXxhtwxTtgF_UywOOBOvPRJFnpBeOskbBXT0HdpM9_PEoyc3M8bczL8_CXx1gLoKlt2QnTqci5x5BVq2d6BwEhYZ1EBbe38WtShbbxQVX_wvcA01_ZV67O9KqEbtDpHu4lONg5SJfgJbm75On54bJvD4RFbaz_kVWTLqTIL6HZZajeiouT824LPCuBdSAbsoTzCNFLTW54uOTJLolb1plQSvmHvmEoRvvEMOtnrpCPoelvP0Cljn2nwQng3miafqma5',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDpngRHz0IvgMb1gKh4yhzjHJZJ4RiBxBJAsdzBOmRVB8-LCOUZc852F5mzHVOgOiE7sykv_I_0YouueWQxnzkJsAOf-qZc2jg45yHuySQSmwLMnX815KBj6CWhJhPEd0d-ZLcAHdJblEH2gjplsxwQ5PlyIwgHZjTwQ4ns0yM4b9UYuc3PQm0jpdSywICUV5kRgW1jOZ_zXGfKGJbpPX6ad1DvcmmJQQ5G0ti3108yahd8JelcWb_NB4AJrsVUGMUI3zY8LiIfoXoQ',
];

function Home() {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadClinics = async () => {
      try {
        const response = await getAllVets();
        if (!ignore) {
          setClinics((response.data || []).slice(0, 3));
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setClinics([]);
        }
      } finally {
        if (!ignore) {
          setLoadingClinics(false);
        }
      }
    };

    loadClinics();
    return () => {
      ignore = true;
    };
  }, []);

  const greeting = useMemo(() => {
    if (!loggedIn) return 'Trusted Veterinary Care for Your Pets';
    return `Welcome back, ${user?.name?.split(' ')[0] || 'there'}.`;
  }, [loggedIn, user?.name]);

  return (
    <SiteLayout>
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[#EAF0FB] shadow-[0_26px_80px_rgba(15,23,42,0.08)]">
        <div className="grid gap-12 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-14">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-700 ring-1 ring-teal-200">
              {loggedIn ? 'Your pet care workspace is ready' : '#1 rated pet care platform'}
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#002045] sm:text-5xl lg:text-6xl">
              {greeting}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Connect with trusted clinics, manage health records, and book appointments in one
              calm, professional experience built for modern pet owners and vets in Bangladesh.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                className="rounded-2xl bg-[#002045] px-6 py-3.5 text-base font-semibold text-white shadow-[0_20px_50px_rgba(0,32,69,0.22)] transition hover:bg-[#1A365D]"
                to={loggedIn ? '/appointments' : '/register'}
              >
                {loggedIn ? 'View Appointments' : 'Book Appointment'}
              </Link>
              <Link
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                to="/vets"
              >
                Find a Vet
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
                <div className="text-2xl font-extrabold text-[#002045]">500+</div>
                <div className="text-sm text-slate-600">Verified clinics</div>
              </div>
              <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
                <div className="text-2xl font-extrabold text-[#002045]">24/7</div>
                <div className="text-sm text-slate-600">Care access workflow</div>
              </div>
              <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
                <div className="text-2xl font-extrabold text-[#002045]">QR</div>
                <div className="text-sm text-slate-600">Verified prescriptions</div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute -bottom-2 left-2 z-10 rounded-2xl border border-white/80 bg-white/90 px-5 py-4 shadow-xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-xl text-teal-700">+</div>
                <div>
                  <div className="text-sm font-bold text-[#002045]">500+ Verified Clinics</div>
                  <div className="text-sm text-slate-500">Trusted professionals across the platform</div>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-[32px] border-[6px] border-white bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF54t5-TDQB3XpdJxKjyp21dCA3FXE-MRywgNkD9J5aJJZqZhrqyTXtueZP76f45wlOpN619O8D5e-zqUsHiGj9zlfdpSh2g2WN7nQu6kan8GdPK9nw5ZvqutwGfLZkMw4VdAm45uAimcMVifWUwyYCI9w5jJEKA0pMHtH32g_hMWLLFcHj2dZVZqQSYCFb7I4andXU1sqVs17gr9c5AcwBdQHE-r6RZQ5d6X9G7vMl_4Bf6B2DlCvH96lwo2fjb_3-DTyYDB4DwL8"
                alt="Veterinarians with a dog in clinic"
                className="h-[300px] w-full object-cover sm:h-[420px] lg:w-[520px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.06)] lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-[#002045] sm:text-4xl">Why choose VetConnect</h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            A seamless clinical-friendly experience that helps pet owners move from discovery to
            booking to records without friction.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-[28px] border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold ${feature.tone}`}>
                {feature.icon}
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-[#002045]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.06)] lg:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#002045] sm:text-4xl">Top rated clinics</h2>
            <p className="mt-2 text-base leading-8 text-slate-600">Discover trusted veterinary care near you.</p>
          </div>
          <Link to="/vets" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            View all clinics {'->'}
          </Link>
        </div>

        {loadingClinics ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[340px] animate-pulse rounded-[28px] bg-slate-100" />
            ))}
          </div>
        ) : clinics.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
            Clinics will appear here once your backend returns live clinic data.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {clinics.map((clinic, index) => {
              const hasReviews = Number(clinic.totalReviews || 0) > 0;
              const ratingValue = typeof clinic.rating === 'number' ? clinic.rating : 0;
              const image = clinicImageFallbacks[index % clinicImageFallbacks.length];

              return (
                <article key={clinic._id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#F8FAFC] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <div className="relative">
                    <img src={image} alt={clinic.clinicName} className="h-52 w-full object-cover" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#002045] shadow-sm">
                      {hasReviews ? `★ ${ratingValue.toFixed(1)}` : 'No reviews yet'}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-2xl font-bold text-[#002045]">{clinic.clinicName}</h3>
                    <p className="mt-2 text-sm text-slate-600">{clinic.address || 'Address not provided'}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(clinic.servicesOffered || []).slice(0, 3).map((service, serviceIndex) => (
                        <span key={`${clinic._id}-${serviceIndex}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {service}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Consultation</div>
                        <div className="mt-1 text-xl font-bold text-[#002045]">৳ {clinic.consultationFee ?? 'N/A'}</div>
                      </div>
                      <Link
                        to={`/vets/${clinic._id}`}
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
      </section>
    </SiteLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vets" element={<VetListPage />} />
        <Route path="/vets/:id" element={<VetDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/prescriptions/verify/:verificationCode" element={<PrescriptionVerificationPage />} />

        <Route
          path="/vets/add"
          element={
            <ProtectedRoute allowedRoles={['vet']}>
              <AddVetPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vets/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['vet', 'admin']}>
              <EditVetPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vets/:clinicId/book"
          element={
            <ProtectedRoute allowedRoles={['petOwner', 'admin']}>
              <BookAppointmentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointments"
          element={
            <ProtectedRoute allowedRoles={['petOwner', 'vet', 'admin']}>
              <MyAppointmentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointments/:appointmentId/reschedule"
          element={
            <ProtectedRoute allowedRoles={['petOwner', 'admin']}>
              <RescheduleAppointmentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointments/:appointmentId/prescription"
          element={
            <ProtectedRoute allowedRoles={['petOwner', 'vet', 'admin']}>
              <AppointmentPrescriptionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prescriptions"
          element={
            <ProtectedRoute allowedRoles={['petOwner', 'vet', 'admin']}>
              <PrescriptionHistoryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
