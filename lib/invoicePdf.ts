/**
 * Note d'honoraires / Reçu médical PDF generation.
 * Uses expo-print to render an HTML page to PDF, then expo-sharing to share it.
 *
 * When cnopsNumber is provided a CNOPS/AMO reimbursement section is added,
 * showing the full amount, the reimbursable part (taux%), and the patient's share.
 */

import { Appointment, DoctorProfile } from "./cabinetTypes";
import { getNextInvoiceNumber } from "./storage";

/** Escape user-supplied strings before injecting into HTML to prevent XSS in the WebView renderer. */
function h(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPrint(): any {
  try { return require("expo-print"); } catch { return null; }
}
function getSharing(): any {
  try { return require("expo-sharing"); } catch { return null; }
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(
  appt: Appointment,
  doctor: DoctorProfile,
  amount: number,
  invoiceNumber: string,
  actLabel: string,
  cnopsNumber?: string,
  cin?: string,
  patientDob?: string,
  taux?: number,           // e.g. 70 for 70%
): string {
  const issueDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const apptDate = new Date(appt.date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const dobStr = patientDob
    ? new Date(patientDob + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;
  const amountFmt = amount.toLocaleString("fr-MA", { minimumFractionDigits: 2 });

  const doctorName  = doctor.fullName   ? `Dr. ${h(doctor.fullName)}` : "—";
  const specialty   = h(doctor.specialtyLabel);
  const address     = h(doctor.address);
  const phone       = h(doctor.phone);
  const inpe        = h(doctor.inpe);
  const ds          = doctor.documentSettings ?? {};
  const showInpe    = ds.showInpe !== false;
  const headerNote  = h(ds.headerNote);
  const footerNote  = h(ds.footerNote);

  // Reimbursement calculations
  const hasInsurance = !!(cnopsNumber && taux && taux > 0);
  const rembAmt   = hasInsurance ? (amount * taux!) / 100 : 0;
  const patientAmt = hasInsurance ? amount - rembAmt : 0;
  const rembFmt   = rembAmt.toLocaleString("fr-MA", { minimumFractionDigits: 2 });
  const patientFmt = patientAmt.toLocaleString("fr-MA", { minimumFractionDigits: 2 });

  const insuranceSection = hasInsurance ? `
  <div class="insurance-box">
    <div class="ins-title">Remboursement assurance maladie</div>
    <table class="ins-table">
      <tr>
        <td class="ins-lbl">N° immatriculation</td>
        <td class="ins-val">${h(cnopsNumber)}</td>
      </tr>
      ${cin ? `<tr><td class="ins-lbl">C.I.N.</td><td class="ins-val">${h(cin)}</td></tr>` : ""}
      ${dobStr ? `<tr><td class="ins-lbl">Date de naissance</td><td class="ins-val">${dobStr}</td></tr>` : ""}
      <tr>
        <td class="ins-lbl">Taux de couverture</td>
        <td class="ins-val ins-taux">${taux}%</td>
      </tr>
    </table>
    <div class="remb-row">
      <div class="remb-item">
        <div class="remb-lbl">Part remboursable</div>
        <div class="remb-amt remb-yes">${rembFmt} MAD</div>
      </div>
      <div class="remb-divider"></div>
      <div class="remb-item">
        <div class="remb-lbl">Part à charge patient</div>
        <div class="remb-amt remb-patient">${patientFmt} MAD</div>
      </div>
    </div>
  </div>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Note d'honoraires ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #1a1f1b;
      background: #fff;
      padding: 48px 56px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }
    .doctor h1 { font-size: 18px; font-weight: 800; letter-spacing: -0.4px; margin-bottom: 4px; }
    .doctor p  { font-size: 12px; color: #4a5568; line-height: 1.6; }
    .invoice-meta { text-align: right; }
    .invoice-meta .inv-num {
      font-size: 13px; font-weight: 700; color: #0a4e7e; margin-bottom: 4px;
    }
    .invoice-meta p { font-size: 12px; color: #4a5568; }

    /* ── Divider ── */
    hr { border: none; border-top: 2px solid #0a4e7e; margin-bottom: 28px; }

    /* ── Title ── */
    .title {
      font-size: 16px; font-weight: 800; letter-spacing: 2px;
      text-transform: uppercase; text-align: center;
      color: #0a4e7e; margin-bottom: 28px;
    }

    /* ── Patient box ── */
    .patient-box {
      background: #f0f7fc; border-radius: 8px;
      padding: 14px 18px; margin-bottom: 28px;
      border-left: 4px solid #0a4e7e;
    }
    .patient-box .label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: #4a5568; margin-bottom: 4px;
    }
    .patient-box .name  { font-size: 16px; font-weight: 700; color: #1a1f1b; }
    .patient-box .meta  { font-size: 12px; color: #4a5568; margin-top: 3px; }

    /* ── Services table ── */
    table {
      width: 100%; border-collapse: collapse; margin-bottom: 24px;
    }
    thead tr { background: #0a4e7e; }
    thead th {
      padding: 10px 14px; text-align: left;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.6px;
      color: #fff;
    }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #e2eef5; }
    tbody td { padding: 12px 14px; font-size: 13px; color: #1a1f1b; vertical-align: top; }
    tbody td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }

    /* ── Total row ── */
    .total-row td {
      padding: 14px 14px; font-weight: 800; font-size: 14px;
      border-top: 2px solid #0a4e7e;
    }
    .total-label { color: #0a4e7e; text-transform: uppercase; letter-spacing: 0.4px; }
    .total-amount { text-align: right; color: #0a4e7e; white-space: nowrap; }

    /* ── Insurance section ── */
    .insurance-box {
      background: #f8f4ff;
      border: 1px solid #c7b8ed;
      border-radius: 8px;
      padding: 16px 18px;
      margin-bottom: 28px;
    }
    .ins-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.7px; color: #6b46c1; margin-bottom: 12px;
    }
    .ins-table { width: auto; border-collapse: collapse; margin-bottom: 14px; }
    .ins-table tr { border-bottom: none; }
    .ins-table td { padding: 3px 8px 3px 0; font-size: 12px; border: none; }
    .ins-lbl { color: #718096; font-weight: 600; width: 160px; }
    .ins-val { color: #1a1f1b; font-weight: 700; }
    .ins-taux { color: #6b46c1; }
    .remb-row {
      display: flex; border-top: 1px solid #c7b8ed; padding-top: 12px; gap: 16px;
    }
    .remb-item { flex: 1; text-align: center; }
    .remb-divider { width: 1px; background: #c7b8ed; }
    .remb-lbl { font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .remb-amt { font-size: 15px; font-weight: 800; }
    .remb-yes { color: #6b46c1; }
    .remb-patient { color: #1a1f1b; }

    /* ── Signature ── */
    .sig-section {
      margin-top: 40px; display: flex; justify-content: flex-end;
    }
    .sig-box { width: 220px; text-align: center; }
    .sig-label { font-size: 11px; color: #4a5568; margin-bottom: 6px; font-weight: 600; }
    .sig-space { height: 64px; border-bottom: 1px solid #1a1f1b; }

    /* ── Footer ── */
    .footer {
      margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2eef5;
      font-size: 10px; color: #718096; text-align: center; line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="doctor">
      <h1>${doctorName}</h1>
      ${specialty ? `<p>${specialty}</p>` : ""}
      ${address   ? `<p>${address}</p>`   : ""}
      ${phone     ? `<p>Tél. : ${phone}</p>` : ""}
      ${showInpe && inpe ? `<p>N° INPE : ${inpe}</p>` : ""}
      ${headerNote ? `<p>${headerNote}</p>` : ""}
    </div>
    <div class="invoice-meta">
      <div class="inv-num">${invoiceNumber}</div>
      <p>Émise le ${issueDate}</p>
    </div>
  </div>

  <hr />

  <div class="title">Note d'Honoraires</div>

  <div class="patient-box">
    <div class="label">Patient</div>
    <div class="name">${h(appt.patientName)}</div>
    ${cin     ? `<div class="meta">C.I.N. : ${h(cin)}</div>`  : ""}
    ${dobStr  ? `<div class="meta">Né(e) le ${dobStr}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Date de consultation</th>
        <th>Honoraires</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${h(actLabel)}</td>
        <td>${apptDate}</td>
        <td>${amountFmt} MAD</td>
      </tr>
    </tbody>
    <tr class="total-row">
      <td colspan="2" class="total-label">Total honoraires</td>
      <td class="total-amount">${amountFmt} MAD</td>
    </tr>
  </table>

  ${insuranceSection}

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Signature et cachet du médecin</div>
      <div class="sig-space"></div>
    </div>
  </div>

  <div class="footer">
    ${footerNote ? `${footerNote}<br/>` : ""}Document généré par Blackpine Cabinet &nbsp;·&nbsp; ${issueDate}
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface InvoiceParams {
  appt: Appointment;
  doctor: DoctorProfile;
  amount: number;
  actLabel: string;
  /** Optional CNOPS/AMO/RAMED immatriculation number */
  cnopsNumber?: string;
  /** Patient national ID card number */
  cin?: string;
  /** Patient date of birth "YYYY-MM-DD" */
  patientDob?: string;
  /** Reimbursement rate (0–100). e.g. 70 means 70% covered by insurance. */
  taux?: number;
}

/**
 * Generates a PDF (Note d'honoraires, with optional CNOPS/AMO section)
 * and opens the system share sheet.
 * Returns the invoice number used, or null if something failed.
 */
export async function generateAndShareInvoice(
  params: InvoiceParams,
): Promise<string | null> {
  const Print   = getPrint();
  const Sharing = getSharing();
  if (!Print || !Sharing) return null;

  const invoiceNumber = await getNextInvoiceNumber();
  const html = buildHtml(
    params.appt,
    params.doctor,
    params.amount,
    invoiceNumber,
    params.actLabel,
    params.cnopsNumber,
    params.cin,
    params.patientDob,
    params.taux,
  );

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Note d'honoraires — ${params.appt.patientName}`, // plain text, not HTML — no escaping needed here
      UTI: "com.adobe.pdf",
    });
  }

  return invoiceNumber;
}
