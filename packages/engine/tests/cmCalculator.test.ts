import { describe, it, expect } from "vitest";
import { calculateCM } from "../src/calculators/cmCalculator";
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

describe("calculateCM", () => {
  it("exempts doctors in their first 36 months", () => {
    // Started 2 years ago, asOf today
    const result = calculateCM(400000, "2024-06-01", "2026-06-01", config2026);
    expect(result.exempted).toBe(true);
    expect(result.cmDue).toBe(0);
    expect(result.monthsSinceActivityStart).toBe(24);
  });

  it("exempts at month 35 (just before threshold)", () => {
    const result = calculateCM(400000, "2023-07-01", "2026-06-01", config2026);
    expect(result.monthsSinceActivityStart).toBe(35);
    expect(result.exempted).toBe(true);
  });

  it("applies CM at exactly month 36", () => {
    const result = calculateCM(400000, "2023-06-01", "2026-06-01", config2026);
    expect(result.monthsSinceActivityStart).toBe(36);
    expect(result.exempted).toBe(false);
    expect(result.cmDue).toBe(24000); // 400000 × 0.06
  });

  it("applies CM at month 37 (well past threshold)", () => {
    const result = calculateCM(400000, "2023-05-01", "2026-06-01", config2026);
    expect(result.monthsSinceActivityStart).toBe(37);
    expect(result.exempted).toBe(false);
    expect(result.cmDue).toBe(24000);
  });

  it("applies the 1,500 MAD floor when CA is very low", () => {
    // 6% of 10,000 = 600, but floor is 1,500
    const result = calculateCM(10000, "2020-01-01", "2026-01-01", config2026);
    expect(result.cmDue).toBe(1500);
  });

  it("does not apply the floor when calculated CM is higher", () => {
    // 6% of 100,000 = 6,000, well above floor
    const result = calculateCM(100000, "2020-01-01", "2026-01-01", config2026);
    expect(result.cmDue).toBe(6000);
  });

  it("handles zero chiffre d'affaires (still owes the floor)", () => {
    const result = calculateCM(0, "2020-01-01", "2026-01-01", config2026);
    expect(result.cmDue).toBe(1500);
  });

  it("produces a readable trace mentioning the exemption", () => {
    const result = calculateCM(400000, "2024-06-01", "2026-06-01", config2026);
    expect(result.trace.join(" ")).toContain("Exemption");
  });

  it("throws on invalid activity start date", () => {
    expect(() =>
      calculateCM(100000, "not-a-date", "2026-01-01", config2026)
    ).toThrow();
  });
});