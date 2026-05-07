import { jsPDF } from 'jspdf';

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 6) => {
  const lines = doc.splitTextToSize(text || '-', maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

export const downloadPrescriptionPdf = async (prescription) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('VetConnect Digital Prescription', 14, 18);

  doc.setFontSize(10);
  doc.text(`Issued At: ${new Date(prescription.issuedAt || prescription.createdAt).toLocaleString()}`, 14, 26);

  doc.setFontSize(12);
  doc.text('Clinic Information', 14, 38);
  doc.setFontSize(10);
  doc.text(`Clinic: ${prescription.clinic?.clinicName || '-'}`, 14, 44);
  doc.text(`Address: ${prescription.clinic?.address || '-'}`, 14, 50);
  doc.text(`Contact: ${prescription.clinic?.contactNumber || '-'}`, 14, 56);
  doc.text(`Vet: ${prescription.vet?.name || '-'}`, 14, 62);

  doc.setFontSize(12);
  doc.text('Pet Information', 14, 74);
  doc.setFontSize(10);
  doc.text(`Pet Name: ${prescription.petName || '-'}`, 14, 80);
  doc.text(`Pet Type: ${prescription.petType || '-'}`, 14, 86);
  doc.text(`Owner: ${prescription.petOwner?.name || '-'}`, 14, 92);
  doc.text(`Appointment Date: ${prescription.appointment?.appointmentDate || '-'}`, 14, 98);
  doc.text(`Slot: ${prescription.appointment?.slotLabel || '-'}`, 14, 104);

  doc.setFontSize(12);
  doc.text('Diagnosis', 14, 116);
  doc.setFontSize(10);
  let y = addWrappedText(doc, prescription.diagnosis, 14, 122, 180);

  y += 4;
  doc.setFontSize(12);
  doc.text('Medicines', 14, y);
  y += 6;
  doc.setFontSize(10);

  if (!prescription.medicines?.length) {
    y = addWrappedText(doc, 'No medicines prescribed.', 14, y, 180);
  } else {
    prescription.medicines.forEach((medicine, index) => {
      y = addWrappedText(
        doc,
        `${index + 1}. ${medicine.name} | Dosage: ${medicine.dosage} | Frequency: ${medicine.frequency || '-'} | Duration: ${medicine.duration || '-'}`,
        14,
        y,
        180
      );

      if (medicine.instructions) {
        y = addWrappedText(doc, `Instructions: ${medicine.instructions}`, 20, y, 174);
      }

      y += 2;
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
    });
  }

  y += 4;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text('Additional Notes', 14, y);
  doc.setFontSize(10);
  y = addWrappedText(doc, prescription.notes || 'No additional notes.', 14, y + 6, 180);

  y += 8;
  doc.save(`prescription-${prescription.petName || 'pet'}-${prescription._id}.pdf`);
};
