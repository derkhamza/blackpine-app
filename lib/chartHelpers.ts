import { Transaction, getCategoryById } from "blackpine-engine";

export interface MonthlyData {
  label: string;        // "Jan", "Fév", etc.
  month: number;        // 1-12
  recettes: number;
  charges: number;
  net: number;
}

export interface CategorySlice {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

const SLICE_COLORS = [
  "#1F3A2E", "#2D6A4F", "#40916C", "#52B788", "#74C69D",
  "#8A4F1F", "#B8923A", "#D4A853", "#E8C470", "#F0D878",
  "#6B6F6B", "#9CA09C",
];

/**
 * Groups transactions by month for the current year.
 * Returns 12 entries, one per month, even if some months have no data.
 */
export function getMonthlyData(transactions: Transaction[], year: number): MonthlyData[] {
  const months: MonthlyData[] = MONTH_LABELS.map((label, i) => ({
    label,
    month: i + 1,
    recettes: 0,
    charges: 0,
    net: 0,
  }));

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (d.getFullYear() !== year) continue;
    const monthIndex = d.getMonth(); // 0-based

    if (tx.type === "RECETTE") {
      months[monthIndex].recettes += tx.amount;
    } else {
      months[monthIndex].charges += tx.amount;
    }
  }

  for (const m of months) {
    m.net = m.recettes - m.charges;
  }

  return months;
}

/**
 * Returns months that have at least one transaction (for cleaner charts).
 */
export function getActiveMonths(data: MonthlyData[]): MonthlyData[] {
  return data.filter((m) => m.recettes > 0 || m.charges > 0);
}

/**
 * Groups CHARGE transactions by category for a donut chart.
 * Returns top N categories + an "Autres" bucket.
 */
export function getCategoryBreakdown(
  transactions: Transaction[],
  topN: number = 6
): CategorySlice[] {
  const charges = transactions.filter((t) => t.type === "CHARGE");
  const totals = new Map<string, number>();

  for (const tx of charges) {
    const current = totals.get(tx.category) || 0;
    totals.set(tx.category, current + tx.amount);
  }

  // Sort by amount descending
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

  const grandTotal = sorted.reduce((sum, [, amt]) => sum + amt, 0);
  if (grandTotal === 0) return [];

  const slices: CategorySlice[] = [];
  let othersTotal = 0;

  for (let i = 0; i < sorted.length; i++) {
    const [catId, amount] = sorted[i];
    if (i < topN) {
      const cat = getCategoryById(2026, catId);
      slices.push({
        id: catId,
        label: cat?.labelFr ?? catId,
        amount,
        percentage: Math.round((amount / grandTotal) * 100),
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      });
    } else {
      othersTotal += amount;
    }
  }

  if (othersTotal > 0) {
    slices.push({
      id: "autres",
      label: "Autres",
      amount: othersTotal,
      percentage: Math.round((othersTotal / grandTotal) * 100),
      color: SLICE_COLORS[slices.length % SLICE_COLORS.length],
    });
  }

  return slices;
}