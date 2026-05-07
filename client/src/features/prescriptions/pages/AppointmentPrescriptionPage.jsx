import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAppointmentById } from '../../appointments/services/appointmentApi';
import { getPrescriptionByAppointment, savePrescriptionByAppointment } from '../services/prescriptionApi';
import { downloadPrescriptionPdf } from '../utils/prescriptionPdf';
import { getUser } from '../../auth/utils/auth';
import SiteLayout from '../../../components/SiteLayout';
import { formatFriendlyDate } from '../../../utils/date';

const createMedicineRow = () => ({
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
});

function AppointmentPrescriptionPage() {
  const { appointmentId } = useParams();
  const currentUser = getUser();
  const isPrescriptionEditor = ['vet', 'admin'].includes(currentUser?.role);

  const [appointment, setAppointment] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMedicineIndex, setSelectedMedicineIndex] = useState(0);
  const [formData, setFormData] = useState({
    diagnosis: '',
    notes: '',
    medicines: [createMedicineRow()],
  });

  const loadPageData = useCallback(async () => {
    setLoading(true);

    try {
      const [appointmentResponse, prescriptionResponse] = await Promise.all([
        getAppointmentById(appointmentId),
        getPrescriptionByAppointment(appointmentId),
      ]);

      const appointmentData = appointmentResponse.data;
      const prescriptionData = prescriptionResponse.data;
      const medicines = prescriptionData?.medicines?.length ? prescriptionData.medicines : [createMedicineRow()];

      setAppointment(appointmentData);
      setPrescription(prescriptionData);
      setFormData({
        diagnosis: prescriptionData?.diagnosis || '',
        notes: prescriptionData?.notes || '',
        medicines,
      });
      setSelectedMedicineIndex(0);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to load prescription page');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const canEditPrescription = useMemo(() => {
    return isPrescriptionEditor && appointment?.status === 'completed';
  }, [appointment?.status, isPrescriptionEditor]);

  const activeMedicine = formData.medicines[selectedMedicineIndex] || createMedicineRow();

  const handleFieldChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleMedicineChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, medicineIndex) =>
        medicineIndex === selectedMedicineIndex ? { ...medicine, [field]: value } : medicine
      ),
    }));
  };

  const addMedicine = () => {
    setFormData((prev) => {
      const nextMedicines = [...prev.medicines, createMedicineRow()];
      setSelectedMedicineIndex(nextMedicines.length - 1);
      return {
        ...prev,
        medicines: nextMedicines,
      };
    });
  };

  const removeMedicine = (index) => {
    setFormData((prev) => {
      const nextMedicines =
        prev.medicines.length === 1
          ? [createMedicineRow()]
          : prev.medicines.filter((_, medicineIndex) => medicineIndex !== index);

      setSelectedMedicineIndex((currentIndex) => {
        if (nextMedicines.length === 1) return 0;
        if (currentIndex > index) return currentIndex - 1;
        if (currentIndex >= nextMedicines.length) return nextMedicines.length - 1;
        return currentIndex;
      });

      return {
        ...prev,
        medicines: nextMedicines,
      };
    });
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      const response = await savePrescriptionByAppointment(appointmentId, formData);
      setPrescription(response.data);
      alert('Prescription saved successfully');
      await loadPageData();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to save prescription');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SiteLayout compact backTo="/appointments" backLabel="Back to appointments" title="Prescription workspace" subtitle="Loading prescription information...">
        <div className="card"><div className="card-body helper-text">Loading prescription workspace...</div></div>
      </SiteLayout>
    );
  }

  if (!appointment) {
    return (
      <SiteLayout compact backTo="/appointments" backLabel="Back to appointments" title="Appointment not found" subtitle="The selected appointment could not be loaded.">
        <div className="card"><div className="card-body empty-state">Appointment not found.</div></div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout
      compact
      backTo="/appointments"
      backLabel="Back to appointments"
      eyebrow="Digital prescription"
      title="Prescription workspace"
      subtitle="Create, update, and organize medicines in a clearer prescription editor."
    >
      <section className="prescription-shell">
        <div className="prescription-patient-card">
          <div className="prescription-patient-main">
            <div className="prescription-avatar">
              {(appointment.petName || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="prescription-patient-copy">
              <div className="prescription-patient-topline">
                <h2>{appointment.petName}</h2>
                <span className="prescription-chip">{appointment.petType || 'Pet'}</span>
              </div>
              <p>
                <span>{appointment.clinic?.clinicName || 'Clinic not available'}</span>
                <span className="prescription-dot" />
                <span>{formatFriendlyDate(appointment.appointmentDate)}</span>
                <span className="prescription-dot" />
                <span>{appointment.slotLabel}</span>
              </p>
            </div>
          </div>

          <div className="prescription-patient-side">
            <div className="prescription-owner-label">Owner</div>
            <div className="prescription-owner-name">{appointment.petOwner?.name || 'Not available'}</div>
            <div className="prescription-status-row">
              <span className="prescription-status-pill">{appointment.status}</span>
              <span className="prescription-owner-date">
                {prescription ? `Issued ${new Date(prescription.issuedAt || prescription.createdAt).toLocaleDateString()}` : 'Not issued yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="prescription-main-grid">
          <div className="prescription-editor-column">
            {canEditPrescription ? (
              <form id="prescription-editor-form" onSubmit={handleSavePrescription} className="prescription-form-stack">
                <section className="prescription-panel">
                  <div className="prescription-panel-head">
                    <div>
                      <p className="prescription-section-kicker">Medication</p>
                      <h3>Add medication</h3>
                    </div>
                    <button type="button" className="prescription-ghost-button" onClick={addMedicine}>
                      + New medicine
                    </button>
                  </div>

                  <div className="prescription-editor-grid">
                    <div className="prescription-field prescription-field-full">
                      <label>Medicine name</label>
                      <input
                        className="prescription-entry-input"
                        value={activeMedicine.name}
                        onChange={(e) => handleMedicineChange('name', e.target.value)}
                        placeholder="Search drug database or type medicine name"
                        required
                      />
                    </div>

                    <div className="prescription-field">
                      <label>Dosage</label>
                      <input
                        className="prescription-entry-input"
                        value={activeMedicine.dosage}
                        onChange={(e) => handleMedicineChange('dosage', e.target.value)}
                        placeholder="e.g. 50mg or 1 tablet"
                        required
                      />
                    </div>

                    <div className="prescription-field">
                      <label>Frequency</label>
                      <input
                        className="prescription-entry-input"
                        value={activeMedicine.frequency}
                        onChange={(e) => handleMedicineChange('frequency', e.target.value)}
                        placeholder="e.g. BID or twice daily"
                      />
                    </div>

                    <div className="prescription-field">
                      <label>Duration</label>
                      <input
                        className="prescription-entry-input"
                        value={activeMedicine.duration}
                        onChange={(e) => handleMedicineChange('duration', e.target.value)}
                        placeholder="e.g. 5 days"
                      />
                    </div>

                    <div className="prescription-field prescription-field-full">
                      <label>Special instructions</label>
                      <textarea
                        className="prescription-entry-input prescription-entry-textarea"
                        value={activeMedicine.instructions}
                        onChange={(e) => handleMedicineChange('instructions', e.target.value)}
                        rows="5"
                        placeholder="Give with food, avoid on empty stomach, shake before use, or any other instructions"
                      />
                    </div>
                  </div>
                </section>

                <section className="prescription-panel">
                  <div className="prescription-panel-head">
                    <div>
                      <p className="prescription-section-kicker">Clinical notes</p>
                      <h3>Diagnosis and follow-up notes</h3>
                    </div>
                  </div>

                  <div className="prescription-notes-grid">
                    <div className="prescription-field">
                      <label>Diagnosis</label>
                      <textarea
                        name="diagnosis"
                        className="prescription-entry-input prescription-entry-textarea"
                        rows="5"
                        value={formData.diagnosis}
                        onChange={handleFieldChange}
                        placeholder="Enter diagnosis, symptoms, and clinical findings"
                        required
                      />
                    </div>

                    <div className="prescription-field">
                      <label>Additional notes</label>
                      <textarea
                        name="notes"
                        className="prescription-entry-input prescription-entry-textarea"
                        rows="5"
                        value={formData.notes}
                        onChange={handleFieldChange}
                        placeholder="Dietary advice, warning signs, revisit plan, or extra comments"
                      />
                    </div>
                  </div>
                </section>
              </form>
            ) : (
              <section className="prescription-panel">
                <div className="prescription-panel-head">
                  <div>
                    <p className="prescription-section-kicker">Saved record</p>
                    <h3>Prescription details</h3>
                  </div>
                </div>

                <div className="prescription-readonly-copy">
                  <p><strong>Diagnosis:</strong> {prescription?.diagnosis || 'No diagnosis recorded yet.'}</p>
                  <p><strong>Notes:</strong> {prescription?.notes || 'No additional notes.'}</p>
                  {!prescription && (
                    <p>Only the assigned vet or admin can create a prescription after the appointment is completed.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="prescription-sidebar">
            <section className="prescription-panel prescription-list-panel">
              <div className="prescription-panel-head">
                <div>
                  <p className="prescription-section-kicker">Prescription list</p>
                  <h3>Medicines</h3>
                </div>
                <span className="prescription-count-pill">{formData.medicines.length} item{formData.medicines.length === 1 ? '' : 's'}</span>
              </div>

              <div className="prescription-list-scroll">
                {formData.medicines.map((medicine, index) => (
                  <div
                    key={index}
                    className={`prescription-list-card ${selectedMedicineIndex === index ? 'active' : ''}`}
                    onClick={() => setSelectedMedicineIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedMedicineIndex(index);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="prescription-list-card-top">
                      <div>
                        <h4>{medicine.name || `Medicine ${index + 1}`}</h4>
                        <p>{medicine.dosage || 'Dosage not added yet'}</p>
                      </div>
                      {canEditPrescription && (
                        <button
                          type="button"
                          className="prescription-delete-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMedicine(index);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="prescription-list-meta">
                      <span>{medicine.frequency || 'Frequency pending'}</span>
                      <span>{medicine.duration || 'Duration pending'}</span>
                    </div>

                    {medicine.instructions ? (
                      <div className="prescription-list-instructions">{medicine.instructions}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="prescription-panel prescription-action-panel">
              <div className="prescription-panel-head">
                <div>
                  <p className="prescription-section-kicker">Actions</p>
                  <h3>Complete prescription</h3>
                </div>
              </div>

              <div className="prescription-status-copy">
                <p>{prescription ? 'A prescription already exists for this appointment.' : 'No prescription has been saved yet.'}</p>
                <p><strong>Status:</strong> {prescription ? 'Prescription ready for download' : 'Pending creation'}</p>
              </div>

              <div className="prescription-action-stack">
                {canEditPrescription && (
                  <button type="submit" form="prescription-editor-form" className="prescription-primary-button" disabled={saving}>
                    {saving ? 'Saving prescription...' : prescription ? 'Update prescription' : 'Issue prescription'}
                  </button>
                )}

                {prescription ? (
                  <button type="button" className="prescription-secondary-button" onClick={() => downloadPrescriptionPdf(prescription)}>
                    Download PDF prescription
                  </button>
                ) : null}

                {!canEditPrescription && !prescription ? (
                  <div className="prescription-readonly-note">
                    Only the assigned vet or admin can create a prescription after the appointment is completed.
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

export default AppointmentPrescriptionPage;
