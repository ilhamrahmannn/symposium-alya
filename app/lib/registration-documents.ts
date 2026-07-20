import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type RegistrationDocumentData = {
  referenceNumber: string;
  fullName: string;
  attendanceLabel: string;
  feeInSen: number;
  date: string | Date;
};

const EVENT_TITLE = "Symposium on Management of Pierre Robin Sequence in Infants 2026";
const EVENT_SUBTITLE = "Connecting Disciplines, Transforming Care: A Integrated Approach to Pierre Robin Sequence";

function addHeader(pdf: jsPDF, documentTitle: string) {
  pdf.setFillColor(7, 7, 7);
  pdf.rect(0, 0, 210, 48, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("PRS SYMPOSIUM & WORKSHOP 2026", 18, 17);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(documentTitle, 18, 30);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(EVENT_SUBTITLE, 18, 39);
}

async function addQr(pdf: jsPDF, referenceNumber: string, x = 145, y = 62) {
  const qr = await QRCode.toDataURL(referenceNumber, { width: 320, margin: 1, errorCorrectionLevel: "H" });
  pdf.addImage(qr, "PNG", x, y, 42, 42);
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(7.5);
  pdf.text("Scan for registration reference", x + 21, y + 47, { align: "center" });
}

function addDetails(pdf: jsPDF, data: RegistrationDocumentData, status: string) {
  const date = new Date(data.date).toLocaleDateString("en-MY", { day: "2-digit", month: "long", year: "numeric" });
  pdf.setTextColor(35, 35, 35);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(EVENT_TITLE, 18, 63, { maxWidth: 118 });
  const rows = [
    ["Participant", data.fullName],
    ["Reference Number", data.referenceNumber],
    ["Attendance", data.attendanceLabel],
    ["Registration Fee", `RM ${(data.feeInSen / 100).toFixed(2)}`],
    ["Document Date", date],
    ["Status", status],
  ];
  let y = 94;
  for (const [label, value] of rows) {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(110, 105, 100);
    pdf.setFontSize(8.5);
    pdf.text(label.toUpperCase(), 18, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(35, 35, 35);
    pdf.setFontSize(10.5);
    pdf.text(value, 18, y + 7, { maxWidth: 112 });
    y += 21;
  }
}

function addFooter(pdf: jsPDF) {
  pdf.setDrawColor(212, 175, 55);
  pdf.line(18, 274, 192, 274);
  pdf.setTextColor(110, 105, 100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text("Keep this document and registration reference for future communication and event check-in.", 18, 282);
  pdf.text("Generated electronically by the PRS Symposium 2026 registration system.", 18, 287);
}

export async function downloadAcknowledgementPdf(data: RegistrationDocumentData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addHeader(pdf, "Registration Acknowledgement");
  addDetails(pdf, data, "Pending Payment Verification");
  await addQr(pdf, data.referenceNumber);
  pdf.setFillColor(250, 247, 235);
  pdf.roundedRect(18, 221, 174, 37, 3, 3, "F");
  pdf.setTextColor(75, 66, 40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Submission received", 25, 233);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("This acknowledgement is not a confirmed reservation. Confirmation is issued only after payment verification and organiser approval.", 25, 241, { maxWidth: 158 });
  addFooter(pdf);
  pdf.save(`${data.referenceNumber}-acknowledgement.pdf`);
}

export async function downloadConfirmationLetterPdf(data: RegistrationDocumentData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addHeader(pdf, "Registration Confirmation Letter");
  addDetails(pdf, data, "CONFIRMED - PAYMENT VERIFIED");
  await addQr(pdf, data.referenceNumber);
  pdf.setFillColor(237, 249, 243);
  pdf.roundedRect(18, 221, 174, 37, 3, 3, "F");
  pdf.setTextColor(22, 112, 80);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Registration confirmed", 25, 233);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("Payment has been verified and a place has been confirmed for the attendance option shown above. Present this letter or its QR reference during event check-in.", 25, 241, { maxWidth: 158 });
  addFooter(pdf);
  pdf.save(`${data.referenceNumber}-confirmation-letter.pdf`);
}
