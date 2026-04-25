import XLSX from "xlsx";
import { Transaction, getCategoryById } from "blackpine-engine";

function getCategoryLabel(categoryId: string): string {
  const cat = getCategoryById(2026, categoryId);
  return cat?.labelFr ?? categoryId;
}

function deductibilityLabel(status: string | undefined): string {
  switch (status) {
    case "FULLY_DEDUCTIBLE": return "Déductible";
    case "PARTIALLY_DEDUCTIBLE": return "Partielle";
    case "NOT_DEDUCTIBLE": return "Non déductible";
    case "NEEDS_REVIEW": return "À vérifier";
    default: return "Déductible";
  }
}

export async function generateTransactionsExcel(
  transactions: Transaction[]
): Promise<void> {
  const Sharing = require("expo-sharing");
  const FileSystem = require("expo-file-system/legacy");
  // Separate recettes and charges
  const recettes = transactions.filter((t) => t.type === "RECETTE");
  const charges = transactions.filter((t) => t.type === "CHARGE");

  // Build recettes sheet data
  const recettesData = [
    ["Date", "Catégorie", "Montant (MAD)", "Source"],
    ...recettes.map((t) => [
      t.date,
      getCategoryLabel(t.category),
      t.amount,
      t.source ?? "CABINET",
    ]),
    [],
    ["Total", "", recettes.reduce((s, t) => s + t.amount, 0), ""],
  ];

  // Build charges sheet data
  const chargesData = [
    ["Date", "Catégorie", "Montant (MAD)", "Déductibilité", "Part pro (%)", "Montant déductible (MAD)"],
    ...charges.map((t) => {
      const ratio = t.professionalUseRatio ?? 1;
      const deductible =
        t.deductibilityStatus === "NOT_DEDUCTIBLE" || t.deductibilityStatus === "NEEDS_REVIEW"
          ? 0
          : t.amount * ratio;
      return [
        t.date,
        getCategoryLabel(t.category),
        t.amount,
        deductibilityLabel(t.deductibilityStatus),
        Math.round(ratio * 100),
        Math.round(deductible * 100) / 100,
      ];
    }),
    [],
    [
      "Total",
      "",
      charges.reduce((s, t) => s + t.amount, 0),
      "",
      "",
      charges.reduce((s, t) => {
        const ratio = t.professionalUseRatio ?? 1;
        if (t.deductibilityStatus === "NOT_DEDUCTIBLE" || t.deductibilityStatus === "NEEDS_REVIEW") return s;
        return s + t.amount * ratio;
      }, 0),
    ],
  ];

  // Build summary sheet
  const totalRecettes = recettes.reduce((s, t) => s + t.amount, 0);
  const totalCharges = charges.reduce((s, t) => s + t.amount, 0);
  const totalDeductible = charges.reduce((s, t) => {
    const ratio = t.professionalUseRatio ?? 1;
    if (t.deductibilityStatus === "NOT_DEDUCTIBLE" || t.deductibilityStatus === "NEEDS_REVIEW") return s;
    return s + t.amount * ratio;
  }, 0);

  const summaryData = [
    ["Résumé fiscal — Exercice 2026"],
    [],
    ["Total recettes", totalRecettes],
    ["Total charges", totalCharges],
    ["Charges déductibles", Math.round(totalDeductible * 100) / 100],
    ["Réintégrations", Math.round((totalCharges - totalDeductible) * 100) / 100],
    ["Résultat comptable", totalRecettes - totalCharges],
    ["Résultat fiscal", totalRecettes - totalDeductible],
    [],
    ["Document généré le", new Date().toISOString().split("T")[0]],
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

  const wsRecettes = XLSX.utils.aoa_to_sheet(recettesData);
  wsRecettes["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsRecettes, "Recettes");

  const wsCharges = XLSX.utils.aoa_to_sheet(chargesData);
  wsCharges["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 16 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsCharges, "Charges");

  // Write to file
  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const filename = `blackpine_transactions_2026_${Date.now()}.xlsx`;
  const filepath = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(filepath, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filepath, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Partager les transactions",
    });
  }
}