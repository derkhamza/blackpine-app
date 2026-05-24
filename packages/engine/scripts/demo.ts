import { computeTaxFromTransactions } from "../src";
import { DoctorProfile, Transaction } from "../src/types";

const profile: DoctorProfile = {
  id: "demo",
  legalForm: "PERSONNE_PHYSIQUE",
  practiceType: "CABINET_ONLY",
  activityStartDate: "2018-03-01",
  commune: "Casablanca",
  communeType: "URBAN",
  maritalStatus: "MARRIED",
  dependentsCount: 2,
  tpRegistered: true,
};

const transactions: Transaction[] = [
  { id: "r1", type: "RECETTE", amount: 460000, date: "2026-12-31", category: "consultation" },
  { id: "c1", type: "CHARGE", amount: 60000, date: "2026-12-31", category: "loyer" },
  { id: "c2", type: "CHARGE", amount: 72000, date: "2026-12-31", category: "salaires" },
  { id: "c3", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "consommables" },
  { id: "c4", type: "CHARGE", amount: 12000, date: "2026-12-31", category: "carburant", deductibilityStatus: "PARTIALLY_DEDUCTIBLE", professionalUseRatio: 0.6 },
  { id: "c5", type: "CHARGE", amount: 8000, date: "2026-12-31", category: "assurance" },
  { id: "c6", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "honoraires_comptable" },
];

const result = computeTaxFromTransactions(profile, transactions, 2026, "2026-12-31");

console.log("\n========= RÉSULTAT FISCAL =========");
console.log(`Recettes:            ${result.breakdown.totalRecettes.toLocaleString()} MAD`);
console.log(`Charges:             ${result.breakdown.totalCharges.toLocaleString()} MAD`);
console.log(`Charges déductibles: ${result.breakdown.totalChargesDeductibles.toLocaleString()} MAD`);
console.log(`Réintégrations:      ${result.breakdown.totalReintegrations.toLocaleString()} MAD`);
console.log(`Résultat fiscal:     ${result.breakdown.resultatFiscal.toLocaleString()} MAD`);

console.log("\n========= IMPÔT =========");
console.log(`Régime:              ${result.tax.regime}`);
console.log(`IR brut:             ${result.tax.ir.grossIR.toLocaleString()} MAD`);
console.log(`Déduction familiale: ${result.tax.familyDeduction.toLocaleString()} MAD`);
console.log(`CM due:              ${result.tax.cm.cmDue.toLocaleString()} MAD`);
console.log(`Règle:               ${result.tax.payableRule}`);
console.log(`IMPÔT À PAYER:       ${result.tax.taxDue.toLocaleString()} MAD`);

console.log("\n========= TRACE =========");
result.tax.trace.forEach((line) => console.log(`  ${line}`));