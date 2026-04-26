import { Transaction, getCategoryById } from "blackpine-engine";
import { FilterState } from "../components/TransactionFilters";

/**
 * Applies all filters and sorting to a transaction list.
 * Returns the filtered and sorted array.
 */
export function applyFilters(
  transactions: Transaction[],
  filters: FilterState
): Transaction[] {
  let result = [...transactions];

  // Type filter
  if (filters.typeFilter !== "ALL") {
    result = result.filter((t) => t.type === filters.typeFilter);
  }

  // Date range filter
  if (filters.dateFrom) {
    result = result.filter((t) => t.date >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    result = result.filter((t) => t.date <= filters.dateTo!);
  }

  // Text search (matches category label or category id)
if (filters.query.trim()) {
    const q = filters.query.toLowerCase().trim();
    result = result.filter((t) => {
      const cat = getCategoryById(2026, t.category);
      const label = cat?.labelFr?.toLowerCase() ?? "";
      const id = t.category.toLowerCase();
      const amount = String(t.amount);
      const desc = (t.description || "").toLowerCase();
      return label.includes(q) || id.includes(q) || amount.includes(q) || desc.includes(q);
    });
  }

  // Sort
  result.sort((a, b) => {
    let cmp = 0;
    if (filters.sortField === "date") {
      cmp = a.date.localeCompare(b.date);
    } else {
      cmp = a.amount - b.amount;
    }
    return filters.sortOrder === "desc" ? -cmp : cmp;
  });

  return result;
}