import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 6) => {
  const lines = doc.splitTextToSize(text || '-', maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

export const downloadPrescriptionPdf = async (prescription) => {
  const doc = new jsPDF();
  const verifyUrl = `${window.location.origin}/prescriptions/verify/${prescription.verificationCode}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl);

  doc.setFontSize(18);
  doc.text('VetConnect Digital Prescription', 14, 18);

  doc.setFontSize(10);
  doc.text(`Verification Code: ${prescription.verificationCode}`, 14, 26);
  doc.text(`Issued At: ${new Date(prescription.issuedAt || prescription.createdAt).toLocaleString()}`, 14, 32);

  doc.addImage(qrDataUrl, 'PNG', 155, 14, 40, 40);

  doc.setFontSize(12);
  doc.text('Clinic Information', 14, 46);
  doc.setFontSize(10);
  doc.text(`Clinic: ${prescription.clinic?.clinicName || '-'}`, 14, 52);
  doc.text(`Address: ${prescription.clinic?.address || '-'}`, 14, 58);
  doc.text(`Contact: ${prescription.clinic?.contactNumber || '-'}`, 14, 64);
  doc.text(`Vet: ${prescription.vet?.name || '-'}`, 14, 70);

  doc.setFontSize(12);
  doc.text('Pet Information', 14, 82);
  doc.setFontSize(10);
  doc.text(`Pet Name: ${prescription.petName || '-'}`, 14, 88);
  doc.text(`Pet Type: ${prescription.petType || '-'}`, 14, 94);
  doc.text(`Owner: ${prescription.petOwner?.name || '-'}`, 14, 100);
  doc.text(`Appointment Date: ${prescription.appointment?.appointmentDate || '-'}`, 14, 106);
  doc.text(`Slot: ${prescription.appointment?.slotLabel || '-'}`, 14, 112);

  doc.setFontSize(12);
  doc.text('Diagnosis', 14, 124);
  doc.setFontSize(10);
  let y = addWrappedText(doc, prescription.diagnosis, 14, 130, 180);

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
  doc.setFontSize(9);
  addWrappedText(
    doc,
    `Scan the QR code or visit ${verifyUrl} to verify authenticity.`,
    14,
    y,
    180,
    5
  );

  doc.save(`prescription-${prescription.petName || 'pet'}-${prescription.verificationCode}.pdf`);
};
