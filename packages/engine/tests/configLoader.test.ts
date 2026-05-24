import { describe, it, expect } from "vitest";
import { loadFiscalYearConfig, getAvailableFiscalYears } from "../src/config/configLoader";

describe("configLoader", () => {
  it("loads the 2026 fiscal config", () => {
    const config = loadFiscalYearConfig(2026);
    expect(config.fiscalYear).toBe(2026);
    expect(config.irBracketsProfessional.length).toBeGreaterThan(0);
    expect(config.cotisationMinimale.floorMad).toBe(1500);
  });

  it("throws on unknown year", () => {
    expect(() => loadFiscalYearConfig(1999)).toThrow();
  });

  it("lists available years", () => {
    const years = getAvailableFiscalYears();
    expect(years).toContain(2026);
  });
});