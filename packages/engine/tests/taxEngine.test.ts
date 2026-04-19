
import { describe, it, expect } from "vitest";
import { computeTaxFromTransactions } from "../src/calculators/taxEngine";
import { DoctorProfile, Transaction } from "../src/types";

const dentistCasablanca: DoctorProfile = {
  id: "doc-001",
  legalForm: "PERSONNE_PHYSIQUE",
  practiceType: "CABINET_ONLY",
  activityStartDate: "2018-03-01",
  commune: "Casablanca",
  communeType: "URBAN",
  maritalStatus: "MARRIED",
  dependentsCount: 2,
  tpRegistered: true,
};

// A realistic year for a Casablanca dentist
const yearTransactions: Transaction[] = [
  // Recettes - simplified to a few large blocks for testing
  { id: "r-q1", type: "RECETTE", amount: 110000, date: "2026-03-31", category: "consultation" },
  { id: "r-q2", type: "RECETTE", amount: 125000, date: "2026-06-30", category: "consultation" },
  { id: "r-q3", type: "RECETTE", amount: 95000, date: "2026-09-30", category: "consultation" },
  { id: "r-q4", type: "RECETTE", amount: 130000, date: "2026-12-31", category: "consultation" },
  // Total CA = 460,000 MAD → RNS

  // Charges
  { id: "c-loyer", type: "CHARGE", amount: 60000, date: "2026-12-31", category: "loyer", deductibilityStatus: "FULLY_DEDUCTIBLE" },
  { id: "c-salaire", type: "CHARGE", amount: 72000, date: "2026-12-31", category: "salaires", deductibilityStatus: "FULLY_DEDUCTIBLE" },
  { id: "c-materiel", type: "CHARGE", amount: 18000, date: "2026-05-15", category: "consommables", deductibilityStatus: "FULLY_DEDUCTIBLE" },
  { id: "c-carburant", type: "CHARGE", amount: 12000, date: "2026-12-31", category: "carburant", deductibilityStatus: "PARTIALLY_DEDUCTIBLE", professionalUseRatio: 0.6 },
  { id: "c-rcpro", type: "CHARGE", amount: 8000, date: "2026-01-15", category: "assurance", deductibilityStatus: "FULLY_DEDUCTIBLE" },
  { id: "c-comptable", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "honoraires_comptable", deductibilityStatus: "FULLY_DEDUCTIBLE" },
];

describe("computeTaxFromTransactions (end-to-end)", () => {
  it("processes a full year for a Casablanca dentist", () => {
    const result = computeTaxFromTransactions(
      dentistCasablanca,
      yearTransactions,
      2026,
      "2026-12-31"
    );

    // Sanity checks on the breakdown
    expect(result.breakdown.totalRecettes).toBe(460000);
    expect(result.breakdown.totalCharges).toBe(188000);

    // Deductible: 60k + 72k + 18k + 7.2k (carburant 60%) + 8k + 18k = 183,200
    expect(result.breakdown.totalChargesDeductibles).toBe(183200);

    // Réintégrations: 188k − 183.2k = 4,800 (the 40% non-pro carburant)
    expect(result.breakdown.totalReintegrations).toBe(4800);

    // Résultat comptable: 460k − 188k = 272,000
    // Résultat fiscal: 272k + 4.8k = 276,800
    expect(result.breakdown.resultatFiscal).toBe(276800);

    // Tax should be in the 37% bracket
    expect(result.tax.ir.bracketApplied.rate).toBe(0.37);
  });

  it("includes config version in the result", () => {
    const result = computeTaxFromTransactions(
      dentistCasablanca,
      yearTransactions,
      2026,
      "2026-12-31"
    );
    expect(result.configVersion).toBe("2026.1.0-draft");
  });

  it("produces a single readable trace from start to finish", () => {
    const result = computeTaxFromTransactions(
      dentistCasablanca,
      yearTransactions,
      2026,
      "2026-12-31"
    );
    const traceText = result.tax.trace.join("\n");
    expect(traceText).toContain("Calcul du résultat fiscal");
    expect(traceText).toContain("Calcul de l'impôt");
    expect(traceText).toContain("impôt payable");
  });

  it("classifies this dentist as RNS (CA < 500k)", () => {
    const result = computeTaxFromTransactions(
      dentistCasablanca,
      yearTransactions,
      2026,
      "2026-12-31"
    );
    expect(result.tax.regime).toBe("RNS");
  });

  it("applies family deduction for 2 dependents", () => {
    const result = computeTaxFromTransactions(
      dentistCasablanca,
      yearTransactions,
      2026,
      "2026-12-31"
    );
    expect(result.tax.familyDeduction).toBe(1200);
  });

  it("a brand-new doctor (1 year of activity) is exempted from CM", () => {
    const newDoctor: DoctorProfile = {
      ...dentistCasablanca,
      activityStartDate: "2025-06-01",
    };
    const result = computeTaxFromTransactions(
      newDoctor,
      yearTransactions,
      2026,
      "2026-06-01"
    );
    expect(result.tax.cm.exempted).toBe(true);
    expect(result.tax.payableRule).toBe("IR");
  });

  it("throws on unknown fiscal year", () => {
    expect(() =>
      computeTaxFromTransactions(dentistCasablanca, yearTransactions, 1999, "2026-12-31")
    ).toThrow();
  });
});