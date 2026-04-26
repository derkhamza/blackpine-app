import XLSX from "xlsx";
import { Transaction, FullTaxComputation, DoctorProfile, getCategoryById } from "blackpine-engine";

function catLabel(id: string, year: number): string {
  const cat = getCategoryById(year, id);
  return cat?.labelFr ?? id;
}

function deductLabel(status: string | undefined): string {
  const m: Record<string, string> = {
    FULLY_DEDUCTIBLE: "Déductible 100%",
    PARTIALLY_DEDUCTIBLE: "Partiellement déductible",
    NOT_DEDUCTIBLE: "Non déductible",
    NEEDS_REVIEW: "À vérifier",
  };
  return m[status || ""] || "Déductible 100%";
}

function monthName(m: number): string {
  return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][m];
}

export async function generateTransactionsExcel(
  transactions: Transaction[],
  computation?: FullTaxComputation,
  profile?: DoctorProfile,
  fiscalYear?: number
): Promise<void> {
  const Sharing = require("expo-sharing");
  const FileSystem = require("expo-file-system/legacy");
  const year = fiscalYear || 2026;
  const recettes = transactions.filter((t) => t.type === "RECETTE");
  const charges = transactions.filter((t) => t.type === "CHARGE");
  const totalRecettes = recettes.reduce((s, t) => s + t.amount, 0);
  const totalCharges = charges.reduce((s, t) => s + t.amount, 0);
  const totalDeductible = charges.reduce((s, t) => {
    const ratio = t.professionalUseRatio ?? 1;
    if (t.deductibilityStatus === "NOT_DEDUCTIBLE" || t.deductibilityStatus === "NEEDS_REVIEW") return s;
    return s + t.amount * ratio;
  }, 0);

  const wb = XLSX.utils.book_new();

  // ===== SHEET 1: Résumé =====
  const summaryRows: any[][] = [
    ["BLACKPINE CABINET"],
    [`Résumé fiscal — Exercice ${year}`],
    [],
    ["RUBRIQUE", "MONTANT (MAD)"],
    ["Chiffre d'affaires (recettes)", totalRecettes],
    ["Nombre d'opérations de recettes", recettes.length],
    [],
    ["Total des charges", totalCharges],
    ["Nombre d'opérations de charges", charges.length],
    ["Charges déductibles", Math.round(totalDeductible * 100) / 100],
    ["Réintégrations fiscales", Math.round((totalCharges - totalDeductible) * 100) / 100],
    [],
    ["Résultat comptable", totalRecettes - totalCharges],
    ["Résultat fiscal", totalRecettes - totalDeductible],
  ];

  if (computation) {
    const { tax } = computation;
    summaryRows.push(
      [],
      ["CALCUL DE L'IMPÔT", ""],
      ["Régime fiscal", tax.regime],
      ["IR brut", tax.ir.grossIR],
      ["Déduction familiale", tax.familyDeduction],
      ["IR net", Math.max(0, tax.ir.grossIR - tax.familyDeduction)],
      ["Cotisation minimale", tax.cm.cmDue],
      ["Règle appliquée", tax.payableRule],
      ["IMPÔT DÛ", tax.taxDue],
    );
  }

  if (profile) {
    summaryRows.push(
      [],
      ["PROFIL", ""],
      ["Commune", profile.commune],
      ["Zone", profile.communeType === "URBAN" ? "Urbain" : "Rural"],
      ["Situation familiale", profile.maritalStatus === "MARRIED" ? "Marié(e)" : "Célibataire"],
      ["Personnes à charge", profile.dependentsCount],
      ["Début d'activité", profile.activityStartDate],
    );
  }

  summaryRows.push([], ["Document généré le", new Date().toISOString().split("T")[0]]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 35 }, { wch: 22 }];
  // Bold the title
  if (wsSummary["A1"]) wsSummary["A1"].s = { font: { bold: true, sz: 14 } };
  XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

  // ===== SHEET 2: Recettes =====
  const recetteRows: any[][] = [
    [`RECETTES — Exercice ${year}`],
    [],
    ["N°", "Date", "Catégorie", "Description", "Montant (MAD)", "Source"],
    ...recettes.map((t, i) => [
      i + 1,
      t.date,
      catLabel(t.category, year),
      t.description || "",
      t.amount,
      t.source ?? "CABINET",
    ]),
    [],
    ["", "", "", "TOTAL", totalRecettes, ""],
  ];

  const wsRecettes = XLSX.utils.aoa_to_sheet(recetteRows);
  wsRecettes["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 25 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsRecettes, "Recettes");

  // ===== SHEET 3: Charges =====
  const chargeRows: any[][] = [
    [`CHARGES — Exercice ${year}`],
    [],
    ["N°", "Date", "Catégorie", "Description", "Montant (MAD)", "Déductibilité", "Part pro (%)", "Montant déductible (MAD)"],
    ...charges.map((t, i) => {
      const ratio = t.professionalUseRatio ?? 1;
      const deductible =
        t.deductibilityStatus === "NOT_DEDUCTIBLE" || t.deductibilityStatus === "NEEDS_REVIEW"
          ? 0
          : t.amount * ratio;
      return [
        i + 1,
        t.date,
        catLabel(t.category, year),
        t.description || "",
        t.amount,
        deductLabel(t.deductibilityStatus),
        Math.round(ratio * 100),
        Math.round(deductible * 100) / 100,
      ];
    }),
    [],
    ["", "", "", "TOTAL", totalCharges, "", "", Math.round(totalDeductible * 100) / 100],
  ];

  const wsCharges = XLSX.utils.aoa_to_sheet(chargeRows);
  wsCharges["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsCharges, "Charges");

  // ===== SHEET 4: Mensuel =====
  const monthlyMap = new Map<number, { recettes: number; charges: number; count: number }>();
  transactions.forEach(tx => {
    const m = new Date(tx.date).getMonth();
    const entry = monthlyMap.get(m) || { recettes: 0, charges: 0, count: 0 };
    if (tx.type === "RECETTE") entry.recettes += tx.amount;
    else entry.charges += tx.amount;
    entry.count++;
    monthlyMap.set(m, entry);
  });

  const monthlyRows: any[][] = [
    [`ACTIVITÉ MENSUELLE — Exercice ${year}`],
    [],
    ["Mois", "Recettes (MAD)", "Charges (MAD)", "Résultat (MAD)", "Nb opérations"],
    ...Array.from({ length: 12 }, (_, i) => {
      const d = monthlyMap.get(i) || { recettes: 0, charges: 0, count: 0 };
      return [monthName(i), d.recettes, d.charges, d.recettes - d.charges, d.count];
    }),
    [],
    ["TOTAL", totalRecettes, totalCharges, totalRecettes - totalCharges, transactions.length],
  ];

  const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyRows);
  wsMonthly["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsMonthly, "Mensuel");

  // ===== SHEET 5: Par catégorie =====
  const catMap = new Map<string, { label: string; type: string; total: number; count: number }>();
  transactions.forEach(tx => {
    const key = tx.category;
    const entry = catMap.get(key) || { label: catLabel(key, year), type: tx.type, total: 0, count: 0 };
    entry.total += tx.amount;
    entry.count++;
    catMap.set(key, entry);
  });

  const catRows: any[][] = [
    [`VENTILATION PAR CATÉGORIE — Exercice ${year}`],
    [],
    ["Catégorie", "Type", "Montant total (MAD)", "Nb opérations", "% du total"],
    ...Array.from(catMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([_, v]) => [
        v.label,
        v.type === "RECETTE" ? "Recette" : "Charge",
        v.total,
        v.count,
        `${((v.total / (v.type === "RECETTE" ? totalRecettes || 1 : totalCharges || 1)) * 100).toFixed(1)}%`,
      ]),
  ];

  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  wsCat["!cols"] = [{ wch: 32 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsCat, "Catégories");

  // Write
  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const filename = `blackpine_${year}_${Date.now()}.xlsx`;
  const filepath = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(filepath, wbout, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filepath, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Transactions Excel",
    });
  }
}