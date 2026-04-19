import { describe, it, expect } from "vitest";
import { calculateTax } from "../src/calculators/taxOrchestrator";
import { DoctorProfile, FiscalYearConfig } from "../src/types";

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

const baseDoctor: DoctorProfile = {
  id: "doc-1",
  legalForm: "PERSONNE_PHYSIQUE",
  practiceType: "CABINET_ONLY",
  activityStartDate: "2018-01-01",
  commune: "Casablanca",
  communeType: "URBAN",
  maritalStatus: "MARRIED",
  dependentsCount: 2,
  tpRegistered: true,
};

describe("calculateTax orchestrator", () => {
  it("classifies a 400k CA doctor as RNS", () => {
    const result = calculateTax(baseDoctor, 180000, 400000, "2026-06-01", config2026);
    expect(result.regime).toBe("RNS");
  });

  it("classifies a 700k CA doctor as RNR", () => {
    const result = calculateTax(baseDoctor, 300000, 700000, "2026-06-01", config2026);
    expect(result.regime).toBe("RNR");
  });

  it("applies family deduction of 1,200 MAD for 2 dependents", () => {
    const result = calculateTax(baseDoctor, 180000, 400000, "2026-06-01", config2026);
    expect(result.familyDeduction).toBe(1200);
  });

  it("caps family deduction at 6 dependents", () => {
    const largefamily = { ...baseDoctor, dependentsCount: 10 };
    const result = calculateTax(largefamily, 180000, 400000, "2026-06-01", config2026);
    expect(result.familyDeduction).toBe(3600); // 6 × 600, capped
  });

  it("picks IR when IR > CM", () => {
    // 180k résultat fiscal → IR around 39,200 net
    // 400k CA → CM = 24,000
    // IR > CM, so IR is paid
    const result = calculateTax(baseDoctor, 180000, 400000, "2026-06-01", config2026);
    expect(result.payableRule).toBe("IR");
  });

  it("picks CM when CM > IR", () => {
    // Low résultat fiscal but high CA
    // 50k résultat → IR = 1,000 (in 10% bracket: 50000×0.1 − 4000 = 1000), minus 1200 family = 0
    // 800k CA → CM = 48,000
    // CM > IR, so CM is paid
    const result = calculateTax(baseDoctor, 50000, 800000, "2026-06-01", config2026);
    expect(result.payableRule).toBe("CM");
    expect(result.taxDue).toBe(48000);
  });

  it("flags mixed practice for human review", () => {
    const mixedDoctor = { ...baseDoctor, practiceType: "MIXED" as const };
    const result = calculateTax(mixedDoctor, 180000, 400000, "2026-06-01", config2026);
    expect(result.needsHumanReview).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("respects CM exemption for new doctors", () => {
    const newDoctor = { ...baseDoctor, activityStartDate: "2024-06-01" };
    const result = calculateTax(newDoctor, 50000, 800000, "2026-06-01", config2026);
    // CM would normally be 48k, but exempted → falls back to IR
    expect(result.cm.exempted).toBe(true);
    expect(result.payableRule).toBe("IR");
  });

  it("produces a complete trace covering all steps", () => {
    const result = calculateTax(baseDoctor, 180000, 400000, "2026-06-01", config2026);
    const traceText = result.trace.join(" ");
    expect(traceText).toContain("Régime déterminé");
    expect(traceText).toContain("Tranche appliquée");
    expect(traceText).toContain("Déduction familiale");
    expect(traceText).toContain("impôt payable");
  });
});