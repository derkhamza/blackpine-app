import { describe, it, expect } from "vitest";
import {
  getCategoryById,
  getCategoriesByType,
  getGroupedCategories,
  applyCategoryDefaults,
} from "../src/calculators/categoryService";

describe("categoryService", () => {
  it("loads carburant with 60% partial ratio", () => {
    const cat = getCategoryById(2026, "carburant");
    expect(cat?.rnr.ratio).toBe(1.0);
  });

  it("flags gros_equipement for review", () => {
    const cat = getCategoryById(2026, "gros_equipement_medical");
    expect(cat?.rnr.needsReview).toBe(true);
  });

  it("returns categories filtered by type RECETTE", () => {
    const recettes = getCategoriesByType(2026, "RECETTE");
    expect(recettes.length).toBeGreaterThan(0);
    expect(recettes.every((c) => c.type === "RECETTE")).toBe(true);
  });

  it("groups CHARGE categories into families", () => {
    const groups = getGroupedCategories(2026, "CHARGE");
    const familyIds = groups.map((g) => g.family);
    expect(familyIds).toContain("vehicle");
    expect(familyIds).toContain("non_deductible");
  });

  it("applyCategoryDefaults returns 60% partial for carburant", () => {
    const result = applyCategoryDefaults("carburant", "RNS", 2026);
    expect(result.deductibilityStatus).toBe("FULLY_DEDUCTIBLE");
    expect(result.professionalUseRatio).toBe(1);
  });

  it("applyCategoryDefaults flags gros equipment for review", () => {
    const result = applyCategoryDefaults("gros_equipement_medical", "RNR", 2026);
    expect(result.deductibilityStatus).toBe("NEEDS_REVIEW");
  });

  it("applyCategoryDefaults returns NOT_DEDUCTIBLE for personal expenses", () => {
    const result = applyCategoryDefaults("repas_personnels", "RNS", 2026);
    expect(result.deductibilityStatus).toBe("NOT_DEDUCTIBLE");
    expect(result.professionalUseRatio).toBe(0);
  });

  it("applyCategoryDefaults returns 100% for loyer", () => {
    const result = applyCategoryDefaults("loyer_cabinet", "RNS", 2026);
    expect(result.deductibilityStatus).toBe("FULLY_DEDUCTIBLE");
    expect(result.professionalUseRatio).toBe(1);
  });

  it("applyCategoryDefaults returns FULLY_DEDUCTIBLE for unknown category (safe fallback)", () => {
    const result = applyCategoryDefaults("nonexistent", "RNS", 2026);
    expect(result.deductibilityStatus).toBe("FULLY_DEDUCTIBLE");
  });
});