import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TransactionType } from "blackpine-engine";
import { colors, radii, spacing, typography } from "../lib/theme";
import { Icon } from "../lib/icons";

export type SortField = "date" | "amount";
export type SortOrder = "desc" | "asc";
export type TypeFilter = "ALL" | "RECETTE" | "CHARGE";

export interface FilterState {
  query: string;
  typeFilter: TypeFilter;
  sortField: SortField;
  sortOrder: SortOrder;
  dateFrom: string | null;
  dateTo: string | null;
}

export const DEFAULT_FILTERS: FilterState = {
  query: "",
  typeFilter: "ALL",
  sortField: "date",
  sortOrder: "desc",
  dateFrom: null,
  dateTo: null,
};

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export function TransactionFilters({ filters, onChange, totalCount, filteredCount }: Props) {
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.query !== "" ||
    filters.typeFilter !== "ALL" ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={filters.query}
          onChangeText={(v) => update({ query: v })}
          placeholder="Rechercher une transaction…"
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
        />
        {filters.query.length > 0 && (
          <Pressable
            style={styles.clearBtn}
            onPress={() => update({ query: "" })}
            hitSlop={8}
          >
            <Icon name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Type filter chips */}
      <View style={styles.chipRow}>
        {(["ALL", "RECETTE", "CHARGE"] as TypeFilter[]).map((type) => (
          <Pressable
            key={type}
            style={[styles.chip, filters.typeFilter === type && styles.chipActive]}
            onPress={() => update({ typeFilter: type })}
          >
            <Text
              style={[
                styles.chipText,
                filters.typeFilter === type && styles.chipTextActive,
              ]}
            >
              {type === "ALL" ? "Tout" : type === "RECETTE" ? "Recettes" : "Charges"}
            </Text>
          </Pressable>
        ))}

        <View style={styles.spacer} />

        {/* Sort toggle */}
        <Pressable
            style={styles.sortBtn}
            onPress={() =>
                update({
                sortField: filters.sortField === "date" ? "amount" : "date",
                })
            }
            >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="sort" size={14} color={colors.textSecondary} />
                <Text style={styles.sortBtnText}>
                {filters.sortField === "date" ? "Date" : "Montant"}
                </Text>
            </View>
        </Pressable>

        <Pressable
          style={styles.sortBtn}
          onPress={() =>
            update({
              sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
            })
          }
        >
          <Text style={styles.sortBtnText}>
            {filters.sortOrder === "desc" ? "↓" : "↑"}
          </Text>
        </Pressable>
      </View>

      {/* Date range */}
      <View style={styles.dateRow}>
        <Pressable
          style={styles.dateBtn}
          onPress={() => setShowDateFrom(true)}
        >
          <Text style={styles.dateBtnText}>
            {filters.dateFrom
              ? `Du ${formatShortDate(filters.dateFrom)}`
              : "Date début"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.dateBtn}
          onPress={() => setShowDateTo(true)}
        >
          <Text style={styles.dateBtnText}>
            {filters.dateTo
              ? `Au ${formatShortDate(filters.dateTo)}`
              : "Date fin"}
          </Text>
        </Pressable>

        {(filters.dateFrom || filters.dateTo) && (
          <Pressable
            style={styles.clearDateBtn}
            onPress={() => update({ dateFrom: null, dateTo: null })}
          >
            <Icon name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {showDateFrom && (
        <DateTimePicker
          value={filters.dateFrom ? new Date(filters.dateFrom) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            if (Platform.OS !== "ios") setShowDateFrom(false);
            if (d) update({ dateFrom: d.toISOString().split("T")[0] });
          }}
        />
      )}

      {showDateTo && (
        <DateTimePicker
          value={filters.dateTo ? new Date(filters.dateTo) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            if (Platform.OS !== "ios") setShowDateTo(false);
            if (d) update({ dateTo: d.toISOString().split("T")[0] });
          }}
        />
      )}

      {/* Result count */}
      {hasActiveFilters && (
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {filteredCount} sur {totalCount} transaction{totalCount > 1 ? "s" : ""}
          </Text>
          <Pressable onPress={() => onChange(DEFAULT_FILTERS)}>
            <Text style={styles.resetFiltersText}>Réinitialiser les filtres</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearBtnText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textOnDark,
  },
  spacer: { flex: 1 },

  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  dateRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  clearDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearDateText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  resultText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  resetFiltersText: {
    fontSize: 12,
    color: colors.brand,
    fontWeight: "600",
  },
});