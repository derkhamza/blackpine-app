import { FullTaxComputation, DoctorProfile, TraceEvent, Transaction, loadFiscalYearConfig, getCategoryById } from "blackpine-engine";
import type { DoctorProfile as CabinetProfile } from "./cabinetTypes";

/** Escape user-supplied strings before injecting into HTML. */
function h(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
        <div class="info-row"><span class="info-label">Profession</span><span class="info-value">${h(specialtyLabels[profile.specialty || ""] || "Professionnel de santé")}</span></div>
        <div class="info-row"><span class="info-label">Commune</span><span class="info-value">${h(profile.commune)}</span></div>
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
      <tr><td>Cotisation minimale (${(loadFiscalYearConfig(year).cotisationMinimale.rateMedical * 100).toFixed(1)}%)</td><td class="amt">${fmt(tax.cm.cmDue)}${tax.cm.exempted ? " (exemptée)" : ""}</td></tr>
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

// ── Accountant bilan PDF ─────────────────────────────────────────────────────

export async function generateAccountantBilanPdf(
  transactions: Transaction[],
  computation: FullTaxComputation,
  cabinetProfile: CabinetProfile,
  fiscalYear: number,
): Promise<void> {
  const Print   = require("expo-print");
  const Sharing = require("expo-sharing");

  const dr = cabinetProfile.fullName ? `Dr. ${h(cabinetProfile.fullName)}` : "Docteur";
  const specialty = h(cabinetProfile.specialtyLabel);
  const inpe = cabinetProfile.inpe ? `N° INPE : ${h(cabinetProfile.inpe)}` : "";
  const address = h(cabinetProfile.address);
  const phone = h(cabinetProfile.phone);
  const generated = fmtDate(new Date().toISOString());

  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const recettes = yearTx.filter(tx => tx.type === "RECETTE");
  const charges  = yearTx.filter(tx => tx.type === "CHARGE");

  const totalRecettes = recettes.reduce((s, tx) => s + tx.amount, 0);
  const totalCharges  = charges.reduce((s, tx) => s + tx.amount, 0);

  // Group charges by category
  const chargesByCategory = new Map<string, { label: string; total: number; count: number }>();
  for (const tx of charges) {
    const cat = getCategoryById(fiscalYear, tx.category);
    const label = cat?.labelFr || tx.category;
    const entry = chargesByCategory.get(tx.category) ?? { label, total: 0, count: 0 };
    entry.total += tx.amount;
    entry.count++;
    chargesByCategory.set(tx.category, entry);
  }
  const catRows = [...chargesByCategory.values()]
    .sort((a, b) => b.total - a.total)
    .map(c => `<tr><td>${h(c.label)}</td><td class="amt">${c.count} op.</td><td class="amt">${fmt(c.total)}</td></tr>`)
    .join("");

  // Monthly summary
  const MONTHS = ["Jan","Fév","Mar","Apr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const monthlyRows = MONTHS.map((m, idx) => {
    const prefix = `${fiscalYear}-${String(idx + 1).padStart(2, "0")}`;
    const rec = yearTx.filter(tx => tx.type === "RECETTE" && tx.date.startsWith(prefix)).reduce((s, tx) => s + tx.amount, 0);
    const chg = yearTx.filter(tx => tx.type === "CHARGE" && tx.date.startsWith(prefix)).reduce((s, tx) => s + tx.amount, 0);
    if (rec === 0 && chg === 0) return "";
    return `<tr>
      <td>${m}</td>
      <td class="amt rec">${fmt(rec)}</td>
      <td class="amt chg">${fmt(chg)}</td>
      <td class="amt">${fmt(rec - chg)}</td>
    </tr>`;
  }).filter(Boolean).join("");

  // Transaction list (most recent first, max 500)
  const txSorted = [...yearTx]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 500);
  const txRows = txSorted.map(tx => {
    const cat = getCategoryById(fiscalYear, tx.category);
    const catLabel = cat?.labelFr || tx.category;
    const color = tx.type === "RECETTE" ? "#22863a" : "#d73a49";
    const sign  = tx.type === "RECETTE" ? "+" : "−";
    return `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td>${h(tx.description) || "—"}</td>
      <td><span style="font-size:9px;background:#f0f0f0;padding:2px 6px;border-radius:3px">${h(catLabel)}</span></td>
      <td class="amt" style="color:${color};font-weight:700">${sign} ${fmt(tx.amount)}</td>
    </tr>`;
  }).join("");

  const { breakdown, tax } = computation;
  const irNet = Math.max(0, tax.ir.grossIR - tax.familyDeduction);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 15mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; font-size: 10.5px; line-height: 1.5; }
  .page { padding: 0; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1B4F72; padding-bottom: 12px; margin-bottom: 18px; }
  .doctor-name { font-size: 18pt; font-weight: 800; color: #1B4F72; }
  .doctor-meta { font-size: 9pt; color: #555; line-height: 1.7; margin-top: 4px; }
  .header-right { text-align: right; }
  .bilan-title { font-size: 11pt; font-weight: 700; color: #1B4F72; }
  .bilan-year { font-size: 26pt; font-weight: 900; color: #1B4F72; line-height: 1; }
  .bilan-gen { font-size: 8pt; color: #999; margin-top: 4px; }

  /* Summary boxes */
  .summary-row { display: flex; gap: 12px; margin-bottom: 18px; }
  .summary-box { flex: 1; border-radius: 8px; padding: 12px 16px; }
  .summary-box.rec { background: #e8f5e9; border: 1px solid #a5d6a7; }
  .summary-box.chg { background: #fce4ec; border: 1px solid #f48fb1; }
  .summary-box.net { background: #e3f2fd; border: 1px solid #90caf9; }
  .summary-box.tax { background: #fff3e0; border: 1px solid #ffcc80; }
  .summary-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.8px; color: #666; margin-bottom: 4px; }
  .summary-value { font-size: 15pt; font-weight: 800; }
  .summary-box.rec .summary-value { color: #1b5e20; }
  .summary-box.chg .summary-value { color: #880e4f; }
  .summary-box.net .summary-value { color: #0d47a1; }
  .summary-box.tax .summary-value { color: #e65100; }

  h2 { font-size: 11pt; font-weight: 700; color: #1B4F72; border-bottom: 1px solid #dde; padding-bottom: 6px; margin: 20px 0 10px; letter-spacing: 0.5px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; page-break-inside: auto; }
  thead th { background: #1B4F72; color: white; padding: 7px 10px; font-size: 9pt; text-align: left; }
  td { padding: 6px 10px; font-size: 9.5pt; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; }
  .rec { color: #1b5e20; }
  .chg { color: #880e4f; }

  tfoot td { font-weight: 700; background: #f0f4f8; border-top: 2px solid #1B4F72; font-size: 10pt; }

  .disclaimer { font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 8px; margin-top: 20px; }
  .footer { font-size: 8pt; color: #bbb; text-align: center; margin-top: 10px; }
  .page-break { page-break-before: always; }
</style>
</head><body><div class="page">

  <div class="header">
    <div>
      <div class="doctor-name">${dr}</div>
      <div class="doctor-meta">
        ${specialty ? specialty + "<br>" : ""}
        ${inpe ? inpe + "<br>" : ""}
        ${address ? address + "<br>" : ""}
        ${phone || ""}
      </div>
    </div>
    <div class="header-right">
      <div class="bilan-title">BILAN FISCAL</div>
      <div class="bilan-year">${fiscalYear}</div>
      <div class="bilan-gen">Généré le ${generated}</div>
    </div>
  </div>

  <div class="summary-row">
    <div class="summary-box rec">
      <div class="summary-label">Recettes totales</div>
      <div class="summary-value">${fmt(totalRecettes)}</div>
    </div>
    <div class="summary-box chg">
      <div class="summary-label">Charges totales</div>
      <div class="summary-value">${fmt(totalCharges)}</div>
    </div>
    <div class="summary-box net">
      <div class="summary-label">Résultat fiscal</div>
      <div class="summary-value">${fmt(breakdown.resultatFiscal)}</div>
    </div>
    <div class="summary-box tax">
      <div class="summary-label">IR estimé</div>
      <div class="summary-value">${fmt(irNet)}</div>
    </div>
  </div>

  <h2>Récapitulatif mensuel</h2>
  <table>
    <thead><tr><th>Mois</th><th>Recettes</th><th>Charges</th><th>Solde</th></tr></thead>
    <tbody>${monthlyRows}</tbody>
    <tfoot><tr>
      <td>TOTAL ${fiscalYear}</td>
      <td class="amt rec">${fmt(totalRecettes)}</td>
      <td class="amt chg">${fmt(totalCharges)}</td>
      <td class="amt">${fmt(totalRecettes - totalCharges)}</td>
    </tr></tfoot>
  </table>

  <h2>Répartition des charges par catégorie</h2>
  <table>
    <thead><tr><th>Catégorie</th><th>Nb. opérations</th><th>Montant</th></tr></thead>
    <tbody>${catRows || "<tr><td colspan='3' style='text-align:center;color:#999'>Aucune charge enregistrée</td></tr>"}</tbody>
  </table>

  <div class="page-break"></div>

  <h2>Détail des opérations (${yearTx.length} au total)</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead>
    <tbody>${txRows || "<tr><td colspan='4' style='text-align:center;color:#999'>Aucune opération</td></tr>"}</tbody>
  </table>

  <div class="disclaimer">
    ⚠️ Ce document est généré automatiquement à partir des données saisies dans BLACKPINE Cabinet.
    Il est destiné à faciliter le travail de votre expert-comptable et ne remplace pas une déclaration fiscale officielle.
  </div>
  <div class="footer">BLACKPINE Cabinet · Bilan fiscal ${fiscalYear} · ${generated}</div>
</div></body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Bilan fiscal ${fiscalYear} — ${dr}`,
      UTI: "com.adobe.pdf",
    });
  }
}

// ── Liasse fiscale helper PDF ─────────────────────────────────────────────────
// Moroccan DAS helper: compte de résultat + IR barème breakdown for the accountant

export async function generateLiasseFiscalePdf(
  transactions: Transaction[],
  computation: FullTaxComputation,
  profile: DoctorProfile,
  cabinetProfile: CabinetProfile,
  fiscalYear: number,
): Promise<void> {
  const Print   = require("expo-print");
  const Sharing = require("expo-sharing");

  const dr = cabinetProfile.fullName ? `Dr. ${h(cabinetProfile.fullName)}` : "Docteur";
  const generated = fmtDate(new Date().toISOString());
  const { breakdown, tax } = computation;

  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const recettes = yearTx.filter(tx => tx.type === "RECETTE");
  const charges  = yearTx.filter(tx => tx.type === "CHARGE");

  const totalRecettes = recettes.reduce((s, tx) => s + tx.amount, 0);
  const totalCharges  = charges.reduce((s, tx) => s + tx.amount, 0);

  // Group recettes by category
  const recByCategory = new Map<string, { label: string; total: number }>();
  for (const tx of recettes) {
    const cat = getCategoryById(fiscalYear, tx.category);
    const label = cat?.labelFr || tx.category;
    const e = recByCategory.get(tx.category) ?? { label, total: 0 };
    e.total += tx.amount;
    recByCategory.set(tx.category, e);
  }

  // Group charges by category
  const chgByCategory = new Map<string, { label: string; total: number; deductible: boolean }>();
  for (const tx of charges) {
    const cat = getCategoryById(fiscalYear, tx.category);
    const label = cat?.labelFr || tx.category;
    const deductible = tx.deductibilityStatus !== "NOT_DEDUCTIBLE";
    const e = chgByCategory.get(tx.category) ?? { label, total: 0, deductible };
    e.total += tx.amount;
    chgByCategory.set(tx.category, e);
  }

  const recRows = [...recByCategory.values()].sort((a, b) => b.total - a.total)
    .map(r => `<tr><td>${h(r.label)}</td><td class="amt gr">${fmt(r.total)}</td></tr>`).join("") ||
    `<tr><td colspan="2" class="empty">Aucune recette</td></tr>`;

  const chgRows = [...chgByCategory.values()].sort((a, b) => b.total - a.total)
    .map(c => `<tr>
      <td>${h(c.label)}</td>
      <td style="text-align:center;font-size:9pt">${c.deductible ? "✓" : "✗"}</td>
      <td class="amt rd">${fmt(c.total)}</td>
    </tr>`).join("") ||
    `<tr><td colspan="3" class="empty">Aucune charge</td></tr>`;

  // IR barème table
  const slabs = [
    { from: 0,      to: 30_000,  rate: "0%",   abat: 0 },
    { from: 30_001, to: 50_000,  rate: "10%",  abat: 3_000 },
    { from: 50_001, to: 60_000,  rate: "20%",  abat: 8_000 },
    { from: 60_001, to: 80_000,  rate: "30%",  abat: 14_000 },
    { from: 80_001, to: 180_000, rate: "34%",  abat: 17_200 },
    { from: 180_001, to: Infinity, rate: "38%", abat: 24_400 },
  ];
  const rf = breakdown.resultatFiscal;
  const irBrut = tax.ir.grossIR;
  const familyDed = tax.familyDeduction;
  const irNet = Math.max(0, irBrut - familyDed);

  const slabRows = slabs.map(s => {
    const active = rf > s.from;
    const style = active ? `font-weight:700;background:#f0f6fb` : `color:#bbb`;
    const toLabel = s.to === Infinity ? "∞" : s.to.toLocaleString("fr-FR");
    return `<tr style="${style}">
      <td>${s.from.toLocaleString("fr-FR")} — ${toLabel} MAD</td>
      <td style="text-align:center">${s.rate}</td>
      <td style="text-align:right">${s.abat.toLocaleString("fr-FR")} MAD</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 15mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.5; }

  .header { display:flex; justify-content:space-between; align-items:flex-start;
            border-bottom:3px solid #1B4F72; padding-bottom:12px; margin-bottom:18px; }
  .doc-left .dr-name { font-size:17pt; font-weight:800; color:#1B4F72; }
  .doc-left .dr-meta { font-size:9pt; color:#555; margin-top:4px; line-height:1.7; }
  .doc-right { text-align:right; }
  .doc-right .doc-title { font-size:9pt; text-transform:uppercase; letter-spacing:1px; color:#888; }
  .doc-right .doc-year { font-size:28pt; font-weight:900; color:#1B4F72; line-height:1; }
  .doc-right .doc-gen { font-size:8pt; color:#bbb; margin-top:4px; }

  .hero-row { display:flex; gap:10px; margin-bottom:18px; }
  .hero-box { flex:1; border-radius:8px; padding:12px 14px; }
  .hero-box.rec { background:#e8f5e9; border:1px solid #a5d6a7; }
  .hero-box.chg { background:#fce4ec; border:1px solid #f48fb1; }
  .hero-box.rf  { background:#e3f2fd; border:1px solid #90caf9; }
  .hero-box.ir  { background:#fff3e0; border:1px solid #ffcc80; }
  .hero-lbl { font-size:8pt; text-transform:uppercase; letter-spacing:0.7px; color:#666; margin-bottom:3px; }
  .hero-val { font-size:14pt; font-weight:800; }
  .hero-box.rec .hero-val { color:#1b5e20; }
  .hero-box.chg .hero-val { color:#880e4f; }
  .hero-box.rf  .hero-val { color:#0d47a1; }
  .hero-box.ir  .hero-val { color:#e65100; }

  h2 { font-size:11pt; font-weight:700; color:#1B4F72; border-bottom:2px solid #d0e4f0;
       padding-bottom:5px; margin:20px 0 8px; text-transform:uppercase; letter-spacing:0.5px; }

  table { width:100%; border-collapse:collapse; margin-bottom:14px; }
  thead th { background:#1B4F72; color:white; padding:7px 10px; font-size:9pt; text-align:left; }
  td { padding:6px 10px; font-size:9.5pt; border-bottom:1px solid #eee; }
  tr:nth-child(even) td { background:#fafaf8; }
  .amt { text-align:right; font-variant-numeric:tabular-nums; font-weight:600; }
  .gr { color:#1b5e20; }
  .rd { color:#880e4f; }
  .empty { text-align:center; color:#bbb; font-style:italic; padding:16px; }
  tfoot td { font-weight:700; background:#f0f4f8; border-top:2px solid #1B4F72; font-size:10.5pt; }

  .compte-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }
  .compte-side { }
  .compte-total { display:flex; justify-content:space-between; font-weight:700; font-size:11pt;
                  padding:8px 10px; border-top:2px solid #1B4F72; margin-top:4px; }

  .resultat-box { background:#0A4E7E; color:white; border-radius:8px; padding:14px 18px;
                  display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .resultat-label { font-size:10pt; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:0.5px; }
  .resultat-value { font-size:20pt; font-weight:900; }

  .ir-box { background:#fff3e0; border:1px solid #ffcc80; border-radius:8px;
            padding:14px 18px; margin-top:10px; }
  .ir-row { display:flex; justify-content:space-between; padding:4px 0; font-size:10pt; }
  .ir-row.total { font-weight:700; font-size:12pt; border-top:2px solid #e65100;
                  margin-top:8px; padding-top:8px; color:#e65100; }

  .notice { font-size:8pt; color:#888; background:#f9f9f9; border:1px solid #eee;
            border-radius:5px; padding:10px 12px; margin-top:16px; text-align:center; }
  .footer { font-size:8pt; color:#bbb; text-align:center; margin-top:14px; padding-top:8px;
            border-top:1px solid #eee; }
</style>
</head><body>

<div class="header">
  <div class="doc-left">
    <div class="dr-name">${dr}</div>
    <div class="dr-meta">
      ${cabinetProfile.specialtyLabel ? h(cabinetProfile.specialtyLabel) + "<br>" : ""}
      ${cabinetProfile.inpe ? `N° INPE : ${h(cabinetProfile.inpe)}<br>` : ""}
      ${cabinetProfile.address ? h(cabinetProfile.address) + "<br>" : ""}
      ${h(cabinetProfile.phone)}
    </div>
  </div>
  <div class="doc-right">
    <div class="doc-title">Liasse Fiscale — DAS</div>
    <div class="doc-year">${fiscalYear}</div>
    <div class="doc-gen">Édité le ${generated}</div>
  </div>
</div>

<div class="hero-row">
  <div class="hero-box rec">
    <div class="hero-lbl">Recettes totales</div>
    <div class="hero-val">${fmt(totalRecettes)}</div>
  </div>
  <div class="hero-box chg">
    <div class="hero-lbl">Charges totales</div>
    <div class="hero-val">${fmt(totalCharges)}</div>
  </div>
  <div class="hero-box rf">
    <div class="hero-lbl">Résultat fiscal</div>
    <div class="hero-val">${fmt(breakdown.resultatFiscal)}</div>
  </div>
  <div class="hero-box ir">
    <div class="hero-lbl">IR estimé</div>
    <div class="hero-val">${fmt(irNet)}</div>
  </div>
</div>

<h2>Compte de résultat simplifié</h2>
<div class="compte-grid">
  <div class="compte-side">
    <table>
      <thead><tr><th colspan="2">Produits (Recettes)</th></tr></thead>
      <tbody>${recRows}</tbody>
      <tfoot><tr><td>Total recettes</td><td class="amt gr">${fmt(totalRecettes)}</td></tr></tfoot>
    </table>
  </div>
  <div class="compte-side">
    <table>
      <thead><tr><th>Charges</th><th style="text-align:center">Ded.</th><th>Montant</th></tr></thead>
      <tbody>${chgRows}</tbody>
      <tfoot><tr><td colspan="2">Total charges</td><td class="amt rd">${fmt(totalCharges)}</td></tr></tfoot>
    </table>
  </div>
</div>

<div class="resultat-box">
  <div class="resultat-label">Résultat fiscal net imposable</div>
  <div class="resultat-value">${fmt(breakdown.resultatFiscal)}</div>
</div>

<h2>Calcul de l'IR — Barème annuel progressif</h2>
<table>
  <thead><tr><th>Tranche de revenu</th><th style="text-align:center">Taux</th><th style="text-align:right">Abattement</th></tr></thead>
  <tbody>${slabRows}</tbody>
</table>

<div class="ir-box">
  <div class="ir-row"><span>IR brut (barème)</span><span>${fmt(irBrut)}</span></div>
  <div class="ir-row"><span>Déduction charges de famille (${profile.dependentsCount} pers. × 500 MAD)</span><span>− ${fmt(familyDed)}</span></div>
  <div class="ir-row"><span>Cotisation minimale</span><span>${fmt(tax.cm.cmDue)}${tax.cm.exempted ? " (exemptée)" : ""}</span></div>
  <div class="ir-row"><span>Règle appliquée</span><span>${tax.payableRule}</span></div>
  <div class="ir-row total"><span>IR NET À PAYER</span><span>${fmt(tax.taxDue)}</span></div>
</div>

<div class="notice">
  Ce document est un outil d'aide à la déclaration. Il ne remplace pas la déclaration officielle DAS
  à déposer avant le 31 mars ${fiscalYear + 1} auprès de votre CDI/Percepteur.
  Vérifiez toujours avec votre expert-comptable.
</div>
<div class="footer">
  BLACKPINE Cabinet · Liasse fiscale ${fiscalYear} · ${generated} · Régime ${tax.regime}
</div>

</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Liasse fiscale ${fiscalYear} — ${dr}`,
      UTI: "com.adobe.pdf",
    });
  }
}