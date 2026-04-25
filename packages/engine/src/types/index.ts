// Core types used throughout the tax engine

export type Regime = "RNS" | "RNR" | "RAS_LIBERATOIRE";
export type LegalForm = "PERSONNE_PHYSIQUE" | "PERSONNE_MORALE";
export type PracticeType = "CABINET_ONLY" | "CLINIC_ONLY" | "MIXED";
export type MaritalStatus = "SINGLE" | "MARRIED";
export type CommuneType = "URBAN" | "RURAL";

export interface DoctorProfile {
  id: string;
  legalForm: LegalForm;
  specialty?: string;
  practiceType: PracticeType;
  activityStartDate: string; // ISO date
  commune: string;
  communeType: CommuneType;
  maritalStatus: MaritalStatus;
  dependentsCount: number;
  tpRegistered: boolean;
  valeurLocative?: number;
}

export interface IRBracket {
  from: number;
  to: number | null;
  rate: number;
  deduction: number;
}

export interface FiscalYearConfig {
  fiscalYear: number;
  version: string;
  irBracketsProfessional: IRBracket[];
  familyDeductions: {
    perDependentAnnual: number;
    maxDependents: number;
  };
  cotisationMinimale: {
    rateMedical: number;
    floorMad: number;
    exemptionMonths: number;
  };
  retenueASource: {
    clinicsRate: number;
  };
  regimeThresholds: {
    rnsMinCa: number;
    rnsMaxCa: number;
  };
}

export interface IRResult {
  grossIR: number;
  bracketApplied: IRBracket;
  effectiveRate: number;
  trace: string[];
  events: TraceEvent[];
}

export interface CMResult {
  cmDue: number;
  exempted: boolean;
  monthsSinceActivityStart: number;
  trace: string[];
  events: TraceEvent[];
}

export interface TaxResult {
  regime: Regime;
  resultatFiscal: number;
  ir: IRResult;
  cm: CMResult;
  familyDeduction: number;
  taxDue: number;
  payableRule: "IR" | "CM";
  trace: string[];
  events: TraceEvent[];
  warnings: string[];
  needsHumanReview: boolean;
}

// Transaction types

export type TransactionType = "RECETTE" | "CHARGE";
export type DeductibilityStatus =
  | "FULLY_DEDUCTIBLE"
  | "PARTIALLY_DEDUCTIBLE"
  | "NOT_DEDUCTIBLE"
  | "NEEDS_REVIEW";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description?: string;
  deductibilityStatus?: DeductibilityStatus;
  professionalUseRatio?: number;
  source?: "CABINET" | "CLINIC";
  rasAmount?: number;
  receiptUri?: string;  // <-- add this line
}

export interface ResultatFiscalBreakdown {
  totalRecettes: number;
  totalCharges: number;
  totalChargesDeductibles: number;
  totalReintegrations: number;
  resultatComptable: number;
  resultatFiscal: number;
  trace: string[];
  events: TraceEvent[];
}

// Category and deductibility matrix types

export type CategoryFamily =
  | "cabinet_operating"
  | "staff"
  | "medical_equipment"
  | "professional_services"
  | "training"
  | "vehicle"
  | "communications"
  | "marketing"
  | "financial"
  | "taxes"
  | "non_deductible"
  | "income";

export interface CategoryRule {
  deductible: boolean;
  ratio: number;
  needsReview?: boolean;
}

export interface Category {
  id: string;
  specialties?: string[];
  labelFr: string;
  family: CategoryFamily;
  type: TransactionType;
  rnr: CategoryRule;
  rns: CategoryRule;
  justificatifRequired?: string[];
  ceilingPerUnit?: number;
  notes?: string;
}

export interface DeductibilityMatrix {
  version: string;
  categories: Category[];
}

// Structured trace events — machine-readable alongside the plain-text trace.
// The app uses these to render rich explanation UI; the plain-text trace
// remains for logs, audits, and fallback rendering.

export type TraceEventKind =
  | "SECTION"           // a named chapter heading
  | "INPUT"             // an input value being consumed
  | "COMPUTATION"       // a calculation step (formula + result)
  | "RULE_APPLIED"      // a fiscal rule kicked in
  | "COMPARISON"        // IR vs CM, or any "we pick the higher of..."
  | "CONCLUSION"        // the final payable figure
  | "WARNING"
  | "INFO";

export interface TraceEvent {
  kind: TraceEventKind;
  title: string;
  detail?: string;
  value?: number;        // when the event has a number worth highlighting
  formula?: string;      // human-readable formula, e.g. "276 800 × 37% − 27 400"
}

// Extend CalculationResult-style outputs to include structured events.
// Existing `trace: string[]` stays for backward compatibility.