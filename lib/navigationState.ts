let pendingFilter: "ALL" | "RECETTE" | "CHARGE" = "ALL";

export function setPendingFilter(f: "ALL" | "RECETTE" | "CHARGE") {
  pendingFilter = f;
}

export function consumePendingFilter(): "ALL" | "RECETTE" | "CHARGE" {
  const f = pendingFilter;
  pendingFilter = "ALL";
  return f;
}

// Segment index for FinancesScreen (0=Summary, 1=Transactions)
let pendingFinancesSegment: number | null = null;

export function setPendingFinancesSegment(s: number) {
  pendingFinancesSegment = s;
}

export function consumePendingFinancesSegment(): number | null {
  const s = pendingFinancesSegment;
  pendingFinancesSegment = null;
  return s;
}

// Auto-open the "add transaction" modal in TransactionsScreen
let pendingOpenAdd: "RECETTE" | "CHARGE" | null = null;

export function setPendingOpenAdd(type: "RECETTE" | "CHARGE") {
  pendingOpenAdd = type;
}

export function consumePendingOpenAdd(): "RECETTE" | "CHARGE" | null {
  const v = pendingOpenAdd;
  pendingOpenAdd = null;
  return v;
}