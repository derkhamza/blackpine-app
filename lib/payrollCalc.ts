/**
 * Moroccan payroll calculation (simplified 2025/2026 rates)
 *
 * CNSS employee contributions (salaire cotisable plafonné à 6 000 MAD):
 *   – Prestations sociales court terme : 0.52%
 *   – Prestations sociales long terme  : 3.96%
 *   – AMO (Assurance maladie)          : 2.26%
 *   Total employee share               : 6.74%  (cap = 6 000 × 6.74% = 404.4 MAD/month)
 *
 * IR mensuel barème progressif (applicable au salaire net imposable):
 *   0 – 2 500 MAD      : 0%
 *   2 501 – 5 000 MAD  : 10%
 *   5 001 – 10 000 MAD : 20%
 *   10 001 – 15 000 MAD: 30%
 *   15 001 – 20 000 MAD: 34%
 *   > 20 000 MAD       : 38%
 *
 * Déduction professionnelle : 20% du salaire brut, max 2 500 MAD/month
 * Déduction famille         : 30 MAD per dependent per month
 */

export interface PayrollResult {
  grossSalary: number;       // Salaire brut
  cnssEmployee: number;      // Cotisation CNSS salarié
  amoEmployee: number;       // AMO salarié (incluse dans cnssEmployee)
  deductionPro: number;      // Déduction professionnelle (20%, max 2 500)
  netImposable: number;      // Salaire net imposable
  irBrut: number;            // IR brut avant déductions famille
  irFamille: number;         // Déduction famille (30 × dependents)
  irNet: number;             // IR net mensuel
  netSalary: number;         // Salaire net à payer
  // Employer contributions (not deducted from salary, shown for cost tracking)
  cnssEmployer: number;      // Cotisations patronales CNSS (~21.09%)
}

const CNSS_EMPLOYEE_RATE = 0.0674;   // 6.74%
const CNSS_SALARY_CAP    = 6_000;    // MAD/month (plafond cotisable CNSS)
const CNSS_EMPLOYER_RATE = 0.2109;   // 21.09% approx (court+long terme+AMO+taxe formation+IPE)
const DEDUCTION_PRO_RATE = 0.20;
const DEDUCTION_PRO_MAX  = 2_500;    // MAD/month

/** Progressive monthly IR on net taxable salary */
function calcIrMensuel(netImposable: number): number {
  if (netImposable <= 0)       return 0;
  if (netImposable <= 2_500)   return 0;
  if (netImposable <= 5_000)   return netImposable * 0.10 - 250;
  if (netImposable <= 10_000)  return netImposable * 0.20 - 750;
  if (netImposable <= 15_000)  return netImposable * 0.30 - 1_750;
  if (netImposable <= 20_000)  return netImposable * 0.34 - 2_350;
  return netImposable * 0.38 - 3_150;
}

export function computePayroll(grossSalary: number, dependents = 0): PayrollResult {
  const gross = Math.max(0, grossSalary);

  // CNSS employee (capped salary base)
  const cotisableCnss = Math.min(gross, CNSS_SALARY_CAP);
  const cnssEmployee  = Math.round(cotisableCnss * CNSS_EMPLOYEE_RATE * 100) / 100;

  // AMO is included in the CNSS employee rate breakdown (2.26% of same capped base)
  const amoEmployee   = Math.round(cotisableCnss * 0.0226 * 100) / 100;

  // Déduction professionnelle
  const deductionPro  = Math.min(gross * DEDUCTION_PRO_RATE, DEDUCTION_PRO_MAX);

  // Net imposable
  const netImposable  = Math.max(0, gross - cnssEmployee - deductionPro);

  // IR
  const irBrut        = calcIrMensuel(netImposable);
  const irFamille     = (dependents ?? 0) * 30;
  const irNet         = Math.max(0, Math.round((irBrut - irFamille) * 100) / 100);

  // Net salary
  const netSalary     = Math.round((gross - cnssEmployee - irNet) * 100) / 100;

  // Employer CNSS (for cost display only)
  const cnssEmployer  = Math.round(cotisableCnss * CNSS_EMPLOYER_RATE * 100) / 100;

  return {
    grossSalary: gross,
    cnssEmployee,
    amoEmployee,
    deductionPro,
    netImposable,
    irBrut,
    irFamille,
    irNet,
    netSalary,
    cnssEmployer,
  };
}

/** Format a number as MAD (no decimals) */
export function fmtMAD(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} MAD`;
}

/** Current month label, e.g. "Mai 2026" */
export function currentMonthLabel(): string {
  return new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
