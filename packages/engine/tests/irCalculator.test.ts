import { describe, it, expect } from "vitest";
import { calculateIR } from "../src/calculators/irCalculator";
import { FiscalYearConfig } from "../src/types";

const config2026: FiscalYearConfig = {
  fiscalYear: 2026,
  version: "2026.1.0-draft",
  irBracketsProfessional: [
    { from: 0, to: 40000, rate: 0.0, deduction: 0 },
    { from: 40001, to: 60000, rate: 0.1, deduction: 4000 },
    { from: 60001, to: 80000, rate: 0.2, deduction: 10000 },
    { from: 80001, to: 100000, rate: 0.3, deduction: 18000 },
    { from: 100001, to: 180000, rate: 0.34, deduction: 22000 },
    { from: 180001, to: null, rate: 0.37, deduction: 27400 },
  ],
  familyDeductions: { perDependentAnnual: 600, maxDependents: 6 },
  cotisationMinimale: { rateMedical: 0.06, floorMad: 1500, exemptionMonths: 36 },
  retenueASource: { clinicsRate: 0.3 },
  regimeThresholds: { rnsMinCa: 250000, rnsMaxCa: 500000 },
};

describe("calculateIR", () => {
  it("returns 0 for income in the exempt bracket", () => {
    const result = calculateIR(30000, 0, config2026);
    expect(result.grossIR).toBe(0);
  });

  it("calculates IR for 150,000 MAD at 34% bracket", () => {
    const result = calculateIR(150000, 0, config2026);
    expect(result.grossIR).toBe(29000); // 150000 × 0.34 − 22000
    expect(result.bracketApplied.rate).toBe(0.34);
  });

  it("calculates IR for 250,000 MAD at 37% bracket", () => {
    const result = calculateIR(250000, 0, config2026);
    expect(result.grossIR).toBe(65100); // 250000 × 0.37 − 27400
  });

  it("handles deficit (negative résultat) as zero IR", () => {
    const result = calculateIR(-5000, 2, config2026);
    expect(result.grossIR).toBe(0);
  });

  it("produces a readable trace", () => {
    const result = calculateIR(150000, 0, config2026);
    expect(result.trace.length).toBeGreaterThan(0);
    expect(result.trace.join(" ")).toContain("Tranche appliquée");
  });

  it("handles exact bracket boundaries", () => {
    const result = calculateIR(100000, 0, config2026);
    expect(result.bracketApplied.rate).toBe(0.3);
  });
});