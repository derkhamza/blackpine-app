let pendingFilter: "ALL" | "RECETTE" | "CHARGE" = "ALL";

export function setPendingFilter(f: "ALL" | "RECETTE" | "CHARGE") {
  pendingFilter = f;
}

export function consumePendingFilter(): "ALL" | "RECETTE" | "CHARGE" {
  const f = pendingFilter;
  pendingFilter = "ALL";
  return f;
}