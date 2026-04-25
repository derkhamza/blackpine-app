import { FullTaxComputation, DoctorProfile, TraceEvent } from "blackpine-engine";

function formatMAD(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " MAD";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function eventKindLabel(kind: TraceEvent["kind"]): string {
  switch (kind) {
    case "INPUT": return "Donnée";
    case "COMPUTATION": return "Calcul";
    case "RULE_APPLIED": return "Règle fiscale";
    case "COMPARISON": return "Comparaison";
    case "CONCLUSION": return "Conclusion";
    case "WARNING": return "Attention";
    default: return "Info";
  }
}

function eventKindColor(kind: TraceEvent["kind"]): string {
  switch (kind) {
    case "INPUT": return "#6B6F6B";
    case "COMPUTATION": return "#1F3A2E";
    case "RULE_APPLIED": return "#B8923A";
    case "COMPARISON": return "#6B6F6B";
    case "CONCLUSION": return "#2D6A2D";
    case "WARNING": return "#A37B1F";
    default: return "#6B6F6B";
  }
}

export async function generateTaxSummaryPdf(
  computation: FullTaxComputation,
  profile: DoctorProfile
): Promise<void> {
  const Print = require("expo-print");
  const Sharing = require("expo-sharing");
  const { breakdown, tax, events, configVersion } = computation;

  // Split events into sections
  const sections: { title: string; events: TraceEvent[] }[] = [];
  let current: { title: string; events: TraceEvent[] } | null = null;
  for (const ev of events) {
    if (ev.kind === "SECTION") {
      if (current) sections.push(current);
      current = { title: ev.title, events: [] };
    } else if (current) {
      current.events.push(ev);
    }
  }
  if (current) sections.push(current);

  const eventsHtml = sections
    .map(
      (section) => `
      <h2 style="color: #1F3A2E; border-bottom: 2px solid #E6E2D8; padding-bottom: 8px; margin-top: 30px;">
        ${section.title}
      </h2>
      ${section.events
        .map(
          (ev) => `
        <div style="background: #fff; border-left: 3px solid ${eventKindColor(ev.kind)}; padding: 12px 16px; margin-bottom: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: ${eventKindColor(ev.kind)}; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">
            ${eventKindLabel(ev.kind)}
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #1A1F1B;">${ev.title}</div>
          ${ev.formula ? `<div style="font-family: monospace; font-size: 12px; color: #6B6F6B; margin-top: 4px;">${ev.formula}</div>` : ""}
          ${typeof ev.value === "number" ? `<div style="font-size: 18px; font-weight: 700; color: #1A1F1B; margin-top: 6px;">${formatMAD(ev.value)}</div>` : ""}
          ${ev.detail ? `<div style="font-size: 12px; color: #6B6F6B; margin-top: 6px; line-height: 1.5;">${ev.detail}</div>` : ""}
        </div>
      `
        )
        .join("")}
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 40px;
          color: #1A1F1B;
          background: #F5F4EF;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .brand {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #1F3A2E;
        }
        .subtitle {
          font-size: 12px;
          color: #6B6F6B;
          margin-top: 4px;
        }
        .hero {
          background: #0E1410;
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
        }
        .hero-label {
          font-size: 12px;
          color: #9DA39E;
          margin-bottom: 8px;
        }
        .hero-amount {
          font-size: 36px;
          font-weight: 700;
        }
        .hero-meta {
          font-size: 12px;
          color: #9DA39E;
          margin-top: 12px;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        .summary-table th {
          background: #F5F4EF;
          text-align: left;
          padding: 10px 16px;
          font-size: 11px;
          text-transform: uppercase;
          color: #6B6F6B;
          letter-spacing: 0.5px;
        }
        .summary-table td {
          padding: 10px 16px;
          font-size: 14px;
          border-top: 1px solid #E6E2D8;
        }
        .summary-table .amount {
          text-align: right;
          font-weight: 600;
        }
        .summary-table .total td {
          font-weight: 700;
          font-size: 15px;
          border-top: 2px solid #1F3A2E;
        }
        .profile-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .profile-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
        }
        .profile-label { color: #6B6F6B; }
        .profile-value { font-weight: 500; }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #9CA09C;
          margin-top: 40px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">BLACKPINE CABINET</div>
        <div class="subtitle">Résumé fiscal · Exercice 2026</div>
      </div>

      <div class="hero">
        <div class="hero-label">Impôt à payer · estimation 2026</div>
        <div class="hero-amount">${formatMAD(tax.taxDue)}</div>
        <div class="hero-meta">Régime ${tax.regime} · Calculé sur ${tax.payableRule}</div>
      </div>

      <div class="profile-info">
        <div class="profile-row">
          <span class="profile-label">Commune</span>
          <span class="profile-value">${profile.commune} (${profile.communeType === "URBAN" ? "urbain" : "rural"})</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Début d'activité</span>
          <span class="profile-value">${formatDate(profile.activityStartDate)}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Personnes à charge</span>
          <span class="profile-value">${profile.dependentsCount}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Régime fiscal</span>
          <span class="profile-value">${tax.regime}</span>
        </div>
      </div>

      <table class="summary-table">
        <tr><th colspan="2">Résultat fiscal</th></tr>
        <tr><td>Total recettes</td><td class="amount">${formatMAD(breakdown.totalRecettes)}</td></tr>
        <tr><td>Total charges</td><td class="amount">${formatMAD(breakdown.totalCharges)}</td></tr>
        <tr><td>Charges déductibles</td><td class="amount">${formatMAD(breakdown.totalChargesDeductibles)}</td></tr>
        <tr><td>Réintégrations</td><td class="amount">${formatMAD(breakdown.totalReintegrations)}</td></tr>
        <tr class="total"><td>Résultat fiscal</td><td class="amount">${formatMAD(breakdown.resultatFiscal)}</td></tr>
      </table>

      <table class="summary-table">
        <tr><th colspan="2">Calcul de l'impôt</th></tr>
        <tr><td>IR brut</td><td class="amount">${formatMAD(tax.ir.grossIR)}</td></tr>
        <tr><td>Déduction familiale</td><td class="amount">− ${formatMAD(tax.familyDeduction)}</td></tr>
        <tr><td>Cotisation minimale</td><td class="amount">${formatMAD(tax.cm.cmDue)}${tax.cm.exempted ? " (exemptée)" : ""}</td></tr>
        <tr class="total"><td>Impôt à payer (${tax.payableRule})</td><td class="amount">${formatMAD(tax.taxDue)}</td></tr>
      </table>

      ${eventsHtml}

      <div class="footer">
        Document généré le ${formatDate(new Date().toISOString())} · Config fiscale ${configVersion}<br>
        Cette estimation ne remplace pas l'avis de votre expert-comptable.
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Partager le résumé fiscal",
      UTI: "com.adobe.pdf",
    });
  }
}