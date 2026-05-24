import { describe, it, expect } from "vitest";
import { calculateResultatFiscal } from "../src/calculators/resultatFiscalCalculator";
import { Transaction } from "../src/types";

const sampleTransactions: Transaction[] = [
  { id: "r1", type: "RECETTE", amount: 100000, date: "2026-01-15", category: "consultation" },
  { id: "r2", type: "RECETTE", amount: 200000, date: "2026-02-15", category: "consultation" },
  { id: "c1", type: "CHARGE", amount: 30000, date: "2026-01-10", category: "loyer", deductibilityStatus: "FULLY_DEDUCTIBLE" },
  { id: "c2", type: "CHARGE", amount: 10000, date: "2026-02-10", category: "carburant", deductibilityStatus: "PARTIALLY_DEDUCTIBLE", professionalUseRatio: 0.6 },
  { id: "c3", type: "CHARGE", amount: 5000, date: "2026-03-10", category: "personal", deductibilityStatus: "NOT_DEDUCTIBLE" },
];

describe("calculateResultatFiscal", () => {
  it("sums recettes correctly", () => {
    const result = calculateResultatFiscal(sampleTransactions);
    expect(result.totalRecettes).toBe(300000);
  });

  it("sums all charges including non-deductible", () => {
    const result = calculateResultatFiscal(sampleTransactions);
    expect(result.totalCharges).toBe(45000);
  });

  it("computes deductible charges with partial ratio", () => {
    const result = calculateResultatFiscal(sampleTransactions);
    // 30000 (loyer 100%) + 6000 (carburant 60%) = 36000
    expect(result.totalChargesDeductibles).toBe(36000);
  });

  it("computes réintégrations as the non-deductible portion", () => {
    const result = calculateResultatFiscal(sampleTransactions);
    // 45000 total − 36000 deductible = 9000
    expect(result.totalReintegrations).toBe(9000);
  });

  it("computes résultat fiscal as comptable + réintégrations", () => {
    const result = calculateResultatFiscal(sampleTransactions);
    // comptable: 300000 − 45000 = 255000
    // fiscal: 255000 + 9000 = 264000
    expect(result.resultatComptable).toBe(255000);
    expect(result.resultatFiscal).toBe(264000);
  });

  it("excludes NEEDS_REVIEW charges from deductible total", () => {
    const txs: Transaction[] = [
      { id: "r1", type: "RECETTE", amount: 100000, date: "2026-01-15", category: "consultation" },
      { id: "c1", type: "CHARGE", amount: 50000, date: "2026-01-10", category: "equipment", deductibilityStatus: "NEEDS_REVIEW" },
    ];
    const result = calculateResultatFiscal(txs);
    expect(result.totalChargesDeductibles).toBe(0);
    expect(result.resultatFiscal).toBe(100000);
  });

  it("defaults missing deductibility status to FULLY_DEDUCTIBLE", () => {
    const txs: Transaction[] = [
      { id: "r1", type: "RECETTE", amount: 100000, date: "2026-01-15", category: "consultation" },
      { id: "c1", type: "CHARGE", amount: 20000, date: "2026-01-10", category: "loyer" },
    ];
    const result = calculateResultatFiscal(txs);
    expect(result.totalChargesDeductibles).toBe(20000);
  });

  it("rejects negative amounts", () => {
    const txs: Transaction[] = [
      { id: "bad", type: "CHARGE", amount: -100, date: "2026-01-10", category: "loyer" },
    ];
    expect(() => calculateResultatFiscal(txs)).toThrow();
  });

  it("handles empty transaction list", () => {
    const result = calculateResultatFiscal([]);
    expect(result.totalRecettes).toBe(0);
    expect(result.resultatFiscal).toBe(0);
  });
});