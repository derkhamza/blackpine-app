import { FullTaxComputation, DoctorProfile, TraceEvent } from "blackpine-engine";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " MAD";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function kindLabel(kind: TraceEvent["kind"]): string {
  const m: Record<string, string> = { INPUT: "Donnée", COMPUTATION: "Calcul", RULE_APPLIED: "Règle fiscale", COMPARISON: "Comparaison", CONCLUSION: "Conclusion", WARNING: "Attention" };
  return m[kind] || "Info";
}

function kindColor(kind: TraceEvent["kind"]): string {
  const m: Record<string, string> = { INPUT: "#6B6F6B", COMPUTATION: "#1F3A2E", RULE_APPLIED: "#B8923A", COMPARISON: "#6B6F6B", CONCLUSION: "#2D6A2D", WARNING: "#A37B1F" };
  return m[kind] || "#6B6F6B";
}

export async function generateTaxSummaryPdf(
  computation: FullTaxComputation,
  profile: DoctorProfile,
  fiscalYear?: number
): Promise<void> {
  const Print = require("expo-print");
  const Sharing = require("expo-sharing");
  const { breakdown, tax, events, configVersion } = computation;
  const year = fiscalYear || 2026;

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

  const eventsHtml = sections.map((section) => `
    <div class="section-block">
      <h2>${section.title}</h2>
      ${section.events.map((ev) => `
        <div class="event-card" style="border-left-color: ${kindColor(ev.kind)}">
          <div class="event-kind" style="color: ${kindColor(ev.kind)}">${kindLabel(ev.kind)}</div>
          <div class="event-title">${ev.title}</div>
          ${ev.formula ? `<div class="event-formula">${ev.formula}</div>` : ""}
          ${typeof ev.value === "number" ? `<div class="event-value">${fmt(ev.value)}</div>` : ""}
          ${ev.detail ? `<div class="event-detail">${ev.detail}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `).join("");

  const specialtyLabels: Record<string, string> = {
    medecin_generaliste: "Médecin généraliste", medecin_specialiste: "Médecin spécialiste",
    dentiste: "Dentiste", kinesitherapeute: "Kinésithérapeute",
    sage_femme: "Sage-femme", autre: "Autre",
  };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    @page { margin: 12mm; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1A1F1B; margin: 0; padding: 0; font-size: 11px; line-height: 1.5; }

    .page { padding: 10px; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1F3A2E; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: 4px; color: #1F3A2E; }
    .brand-sub { font-size: 10px; letter-spacing: 3px; color: #B8923A; margin-top: 2px; }
    .doc-title { font-size: 14px; font-weight: 600; color: #333; margin-top: 10px; }

    .hero { background: linear-gradient(135deg, #0E1410, #1F3A2E); color: white; padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
    .hero-label { font-size: 11px; color: #9DA39E; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .hero-amount { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; }
    .hero-meta { font-size: 10px; color: #9DA39E; margin-top: 10px; }
    .hero-chips { display: flex; justify-content: center; gap: 8px; margin-top: 8px; }
    .hero-chip { background: rgba(255,255,255,0.1); padding: 3px 10px; border-radius: 12px; font-size: 9px; color: #ccc; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .info-card { background: #fff; border: 1px solid #E6E2D8; border-radius: 8px; padding: 14px; }
    .info-card-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; font-weight: 600; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
    .info-label { color: #6B6F6B; }
    .info-value { font-weight: 600; color: #1A1F1B; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    table th { background: #1F3A2E; color: white; text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    table td { padding: 8px 12px; font-size: 11px; border-bottom: 1px solid #E6E2D8; }
    table .amt { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    table tr.total td { font-weight: 700; font-size: 12px; border-top: 2px solid #1F3A2E; background: #F5F4EF; }
    table tr.highlight td { font-weight: 700; font-size: 13px; background: #E6EDE9; color: #1F3A2E; }
    table tr:nth-child(even) td { background: #FAFAF8; }
    table tr.total td, table tr.highlight td { background: #F5F4EF; }

    .section-block { margin-top: 24px; }
    .section-block h2 { font-size: 13px; color: #1F3A2E; border-bottom: 2px solid #E6E2D8; padding-bottom: 6px; margin-bottom: 10px; }

    .event-card { background: #fff; border-left: 3px solid #ccc; padding: 10px 14px; margin-bottom: 6px; border-radius: 4px; border: 1px solid #f0ede5; }
    .event-kind { font-size: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px; }
    .event-title { font-size: 12px; font-weight: 600; color: #1A1F1B; }
    .event-formula { font-family: 'Courier New', monospace; font-size: 10px; color: #6B6F6B; margin-top: 3px; background: #F5F4EF; padding: 4px 8px; border-radius: 3px; display: inline-block; }
    .event-value { font-size: 16px; font-weight: 700; color: #1F3A2E; margin-top: 4px; }
    .event-detail { font-size: 10px; color: #6B6F6B; margin-top: 4px; line-height: 1.5; }

    .footer { text-align: center; font-size: 9px; color: #999; margin-top: 30px; padding-top: 12px; border-top: 1px solid #E6E2D8; }
    .disclaimer { background: #FBF3DE; border: 1px solid #E8C470; border-radius: 6px; padding: 10px 14px; margin-top: 20px; font-size: 10px; color: #8B6914; text-align: center; }
  </style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">BLACKPINE</div>
      <div class="brand-sub">CABINET</div>
      <div class="doc-title">Résumé fiscal · Exercice ${year}</div>
    </div>

    <div class="hero">
      <div class="hero-label">Impôt à payer · estimation ${year}</div>
      <div class="hero-amount">${fmt(tax.taxDue)}</div>
      <div class="hero-chips">
        <span class="hero-chip">Régime ${tax.regime}</span>
        <span class="hero-chip">${tax.payableRule}</span>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">Profil fiscal</div>
        <div class="info-row"><span class="info-label">Profession</span><span class="info-value">${specialtyLabels[profile.specialty || ""] || "Professionnel de santé"}</span></div>
        <div class="info-row"><span class="info-label">Commune</span><span class="info-value">${profile.commune}</span></div>
        <div class="info-row"><span class="info-label">Zone</span><span class="info-value">${profile.communeType === "URBAN" ? "Urbaine" : "Rurale"}</span></div>
        <div class="info-row"><span class="info-label">Régime</span><span class="info-value">${tax.regime}</span></div>
      </div>
      <div class="info-card">
        <div class="info-card-title">Situation personnelle</div>
        <div class="info-row"><span class="info-label">Statut</span><span class="info-value">${profile.maritalStatus === "MARRIED" ? "Marié(e)" : "Célibataire"}</span></div>
        <div class="info-row"><span class="info-label">Personnes à charge</span><span class="info-value">${profile.dependentsCount}</span></div>
        <div class="info-row"><span class="info-label">Début d'activité</span><span class="info-value">${fmtDate(profile.activityStartDate)}</span></div>
        <div class="info-row"><span class="info-label">Déduction familiale</span><span class="info-value">${fmt(tax.familyDeduction)}</span></div>
      </div>
    </div>

    <table>
      <tr><th colspan="2">Résultat fiscal</th></tr>
      <tr><td>Chiffre d'affaires (recettes)</td><td class="amt">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>Total des charges</td><td class="amt">${fmt(breakdown.totalCharges)}</td></tr>
      <tr><td>Charges déductibles</td><td class="amt">${fmt(breakdown.totalChargesDeductibles)}</td></tr>
      <tr><td>Réintégrations fiscales</td><td class="amt">${fmt(breakdown.totalReintegrations)}</td></tr>
      <tr class="highlight"><td>Résultat fiscal net</td><td class="amt">${fmt(breakdown.resultatFiscal)}</td></tr>
    </table>

    <table>
      <tr><th colspan="2">Calcul de l'impôt</th></tr>
      <tr><td>IR brut (barème progressif)</td><td class="amt">${fmt(tax.ir.grossIR)}</td></tr>
      <tr><td>Déduction pour charges de famille</td><td class="amt">− ${fmt(tax.familyDeduction)}</td></tr>
      <tr><td>IR net</td><td class="amt">${fmt(Math.max(0, tax.ir.grossIR - tax.familyDeduction))}</td></tr>
      <tr><td>Cotisation minimale (${(tax.cm.cmRate * 100).toFixed(1)}%)</td><td class="amt">${fmt(tax.cm.cmDue)}${tax.cm.exempted ? " (exemptée)" : ""}</td></tr>
      <tr><td>Règle appliquée</td><td class="amt">${tax.payableRule}</td></tr>
      <tr class="highlight"><td>Impôt dû</td><td class="amt">${fmt(tax.taxDue)}</td></tr>
    </table>

    ${eventsHtml}

    <div class="disclaimer">
      ⚠️ Cette estimation ne remplace pas l'avis de votre expert-comptable. Les montants sont indicatifs et basés sur les données saisies dans l'application.
    </div>

    <div class="footer">
      Document généré le ${fmtDate(new Date().toISOString())} · Blackpine Cabinet · Config fiscale ${configVersion}
    </div>
  </div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Résumé fiscal", UTI: "com.adobe.pdf" });
  }
}