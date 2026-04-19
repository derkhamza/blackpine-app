import { FiscalYearConfig } from "../types";
import config2026 from "./fiscal_year_2026.json";

const configs: Record<number, FiscalYearConfig> = {
  2026: config2026 as FiscalYearConfig,
};

export function loadFiscalYearConfig(year: number): FiscalYearConfig {
  const config = configs[year];
  if (!config) {
    throw new Error(
      `No fiscal year config available for ${year}. Available: ${Object.keys(configs).join(", ")}`
    );
  }
  return config;
}

export function getAvailableFiscalYears(): number[] {
  return Object.keys(configs).map(Number).sort();
}