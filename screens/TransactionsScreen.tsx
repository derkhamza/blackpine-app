import { useMemo, useState, useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, Pressable, TextInput, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import {
  TransactionFilters,
  FilterState,
  DEFAULT_FILTERS,
} from "../components/TransactionFilters";
import {
  Transaction,
  TransactionType,
  DeductibilityStatus,
  Category,
  applyCategoryDefaults,
  getCategoryById,
} from "blackpine-engine";
import { useCallback } from "react";
import { useApp } from "../lib/AppContext";
import { CategoryPicker } from "../components/CategoryPicker";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { applyFilters } from "../lib/transactionFilters";
import { useDatePicker } from "../lib/useDatePicker";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { tapLight, tapWarning } from "../lib/haptics";
import { ScalePressable } from "../components/ScalePressable";
import { Icon } from "../lib/icons";
import { useT } from "../lib/useT";
import { formatMAD, langToLocale } from "../lib/format";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { SafeScreen } from "../components/SafeScreen";


export function TransactionsScreen({ route, initialFilter: initialFilterProp, onFilterConsumed, initialAddType, onAddTypeConsumed }: any) {
  const initialFilter = (initialFilterProp ?? route?.params?.filter) as "ALL" | "RECETTE" | "CHARGE" | undefined;
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { transactions, updateTransaction, deleteTransaction, addTransaction, result, profile, fiscalYear, setFiscalYear } = useApp();
  const [addModalType, setAddModalType] = useState<TransactionType | null>(null);
  const yearTransactions = useMemo(
  () => transactions.filter(tx => tx.date.startsWith(String(fiscalYear))),
  [transactions, fiscalYear]
);
  const [pickerOpenForExisting, setPickerOpenForExisting] = useState<{
    txId: string;
    type: TransactionType;
  } | null>(null);
  const datePicker = useDatePicker();
  const handleFilterChange = (newFilters: FilterState) => {
  setFilters(newFilters);
};
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const { t } = useT();
  const filtered = useMemo(
    () => applyFilters(yearTransactions, filters),
    [yearTransactions, filters]
  );

// Apply pre-set filter when this component mounts with a pending filter from FinancesScreen
useEffect(() => {
  if (initialFilter && initialFilter !== "ALL") {
    setFilters((prev) => ({ ...prev, typeFilter: initialFilter }));
    onFilterConsumed?.();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Auto-open add modal when navigated from HomeScreen quick action
useEffect(() => {
  if (initialAddType) {
    setAddModalType(initialAddType as TransactionType);
    onAddTypeConsumed?.();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  const recettes = filtered.filter((t) => t.type === "RECETTE");
  const charges = filtered.filter((t) => t.type === "CHARGE");

  const totalRecettes = recettes.reduce((s, t) => s + t.amount, 0);
  const totalCharges = charges.reduce((s, t) => s + t.amount, 0);

  const handleCategoryChange = (txId: string, category: Category) => {
    const defaults = applyCategoryDefaults(category.id, result.tax.regime, fiscalYear);
    updateTransaction(txId, {
      category: category.id,
      deductibilityStatus: defaults.deductibilityStatus,
      professionalUseRatio: defaults.professionalUseRatio,
    });
  };

  const handleDelete = (id: string) => {
    tapWarning();
    Alert.alert(
      t("delete"),
      t("transactions.deleteWarning"),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => deleteTransaction(id) },
      ]
    );
  };

  return (
  <SafeScreen>
    {/* ── Header ── */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{t("transactions.title")}</Text>
      <Text style={styles.headerSub}>{yearTransactions.length} {t("transactions.operations")}</Text>
    </View>

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.yearRow}>
        <ScalePressable scaleTo={0.88} style={styles.yearBtn} onPress={() => { tapLight(); setFiscalYear(fiscalYear - 1); }}>
          <Icon name="back" size={16} color={colors.brand} />
        </ScalePressable>
        <View style={styles.yearCenter}>
          <Text style={styles.yearLabel}>{fiscalYear}</Text>
          <Text style={styles.yearSub}>{t("fiscalYear")}</Text>
        </View>
        <ScalePressable scaleTo={0.88} style={styles.yearBtn} onPress={() => { tapLight(); setFiscalYear(fiscalYear + 1); }}>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <Icon name="back" size={16} color={colors.brand} />
          </View>
        </ScalePressable>
      </View>
      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: colors.recette }]}>
          <Text style={[styles.summaryLabel, { color: colors.recette }]}>{t("transactions.filteredRecettes")}</Text>
          <AnimatedNumber value={totalRecettes} format={formatMAD} style={[styles.summaryValue, { color: colors.recette }]} />
          <Text style={styles.summaryCount}>{recettes.length} {t("transactions.operations")}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: colors.charge }]}>
          <Text style={[styles.summaryLabel, { color: colors.charge }]}>{t("transactions.filteredCharges")}</Text>
          <AnimatedNumber value={totalCharges} format={formatMAD} style={[styles.summaryValue, { color: colors.charge }]} />
          <Text style={styles.summaryCount}>{charges.length} {t("transactions.operations")}</Text>
        </View>
      </View>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onChange={handleFilterChange}
        totalCount={yearTransactions.length}
        filteredCount={filtered.length}
      />

      {/* Empty state — filters active */}
      {filtered.length === 0 && yearTransactions.length > 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Icon name="filter" size={22} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>{t("transactions.noResults")}</Text>
          <Text style={styles.emptyText}>{t("transactions.tryModifyFilters")}</Text>
          <Pressable style={styles.resetBtn} onPress={() => setFilters(DEFAULT_FILTERS)}>
            <Text style={styles.resetBtnText}>{t("transactions.resetFilters")}</Text>
          </Pressable>
        </View>
      )}

      {/* Empty state — no transactions at all */}
      {filtered.length === 0 && yearTransactions.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Icon name="receipt" size={22} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>{t("transactions.noTransactions")}</Text>
          <Text style={styles.emptyText}>{t("transactions.addFirst")}</Text>
        </View>
      )}

      {/* Transaction list — show flat when filtering by type, grouped otherwise */}
      {filters.typeFilter === "ALL" ? (
        <>
          {recettes.length > 0 && (
            <Text style={styles.groupLabel}>{t("dashboard.recettes")} · {recettes.length}</Text>
          )}
          {recettes.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}

              onChange={(patch) => updateTransaction(tx.id, patch)}
              onDelete={() => handleDelete(tx.id)}
              onPickCategory={() =>
                setPickerOpenForExisting({ txId: tx.id, type: tx.type })
              }
              onPickDate={() =>
                datePicker.show(tx.date, (iso) =>
                  updateTransaction(tx.id, { date: iso })
                )
              }
            />
          ))}

          {charges.length > 0 && (
            <Text style={[styles.groupLabel, { marginTop: spacing.lg }]}>{t("dashboard.charges")} · {charges.length}</Text>
          )}
          {charges.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}

              onChange={(patch) => updateTransaction(tx.id, patch)}
              onDelete={() => handleDelete(tx.id)}
              onPickCategory={() =>
                setPickerOpenForExisting({ txId: tx.id, type: tx.type })
              }
              onPickDate={() =>
                datePicker.show(tx.date, (iso) =>
                  updateTransaction(tx.id, { date: iso })
                )
              }
            />
          ))}
        </>
      ) : (
        // When filtered by type, show a flat list
        filtered.map((tx, i) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            onChange={(patch) => updateTransaction(tx.id, patch)}
            onDelete={() => handleDelete(tx.id)}
            onPickCategory={() =>
              setPickerOpenForExisting({ txId: tx.id, type: tx.type })
            }
            onPickDate={() =>
              datePicker.show(tx.date, (iso) =>
                updateTransaction(tx.id, { date: iso })
              )
            }
          />
        ))
      )}


 
</ScrollView>

    {/* Floating add buttons */}
    <View style={styles.fab}>
      <ScalePressable
        scaleTo={0.95}
        style={[styles.fabBtn, { backgroundColor: colors.recette }]}
        onPress={() => { tapLight(); setAddModalType("RECETTE"); }}
      >
        <Icon name="add" size={16} color="#fff" />
        <Text style={styles.fabText}>{t("transactions.addRecette")}</Text>
      </ScalePressable>
      <ScalePressable
        scaleTo={0.95}
        style={[styles.fabBtn, { backgroundColor: colors.charge }]}
        onPress={() => { tapLight(); setAddModalType("CHARGE"); }}
      >
        <Icon name="add" size={16} color="#fff" />
        <Text style={styles.fabText}>{t("transactions.addCharge")}</Text>
      </ScalePressable>
    </View>

    {/* Modals */}
      {addModalType && (
        <AddTransactionModal
          visible={true}
          type={addModalType}
          specialty={profile.specialty}
          regime={result.tax.regime}
          fiscalYear={fiscalYear}
          onClose={() => setAddModalType(null)}
          onCreate={addTransaction}
        />
      )}

      {pickerOpenForExisting && (
        <CategoryPicker
          visible={true}
          type={pickerOpenForExisting.type}
          specialty={profile.specialty}
          fiscalYear={fiscalYear}
          onClose={() => setPickerOpenForExisting(null)}
          onSelect={(cat) =>
            handleCategoryChange(pickerOpenForExisting.txId, cat)
          }
        />
      )}

      {datePicker.isVisible && datePicker.pickerProps && (
        <DateTimePicker {...datePicker.pickerProps} />
      )}
    </KeyboardAvoidingView>
  </SafeScreen>
  );
}

function getCategoryLabel(categoryId: string, year = 2026): string {
  const cat = getCategoryById(year, categoryId);
  return cat?.labelFr ?? categoryId;
}

function getCgiNote(categoryId: string, year = 2026): string | null {
  const cat = getCategoryById(year, categoryId);
  return (cat as any)?.notes || null;
}
function TransactionRow({
  transaction,
  onChange,
  onDelete,
  onPickCategory,
  onPickDate,
}: {
  transaction: Transaction;
  onChange: (patch: Partial<Transaction>) => void;
  onDelete: () => void;
  onPickCategory: () => void;
  onPickDate: () => void;
}) {
  const isRecette = transaction.type === "RECETTE";
  const ratio = transaction.professionalUseRatio ?? 1;
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, currentLang } = useT();
  const [expanded, setExpanded] = useState(false);
  const [sliderVisible, setSliderVisible] = useState(ratio < 1);
  const accentColor = isRecette ? colors.recette : colors.charge;

  const shortDate = new Date(transaction.date).toLocaleDateString(langToLocale(currentLang), {
    day: "numeric", month: "short",
  });

  // ── COLLAPSED ────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <View style={styles.txRowWrapper}>
        <ScalePressable
          scaleTo={0.97}
          style={styles.txCollapsed}
          onPress={() => { tapLight(); setExpanded(true); }}
        >
          {/* Left accent bar */}
          <View style={[styles.txCollapsedAccent, { backgroundColor: accentColor }]} />

          {/* Main content */}
          <View style={styles.txCollapsedBody}>
            {/* Row 1: category + amount */}
            <View style={styles.txCollapsedRow}>
              <Text style={styles.txCollapsedCategory} numberOfLines={1}>
                {getCategoryLabel(transaction.category)}
              </Text>
              <Text style={[styles.txAmountFigure, { color: accentColor }]}>
                {Math.round(transaction.amount).toLocaleString("fr-FR")}
                <Text style={styles.txAmountUnit}>{" MAD"}</Text>
              </Text>
            </View>

            {/* Row 2: description (if any) + date */}
            <View style={styles.txCollapsedMeta}>
              {transaction.description ? (
                <Text style={styles.txCollapsedDesc} numberOfLines={1}>
                  {transaction.description}
                </Text>
              ) : (
                <View style={[styles.txCollapsedTypeDot, { backgroundColor: accentColor + "66" }]} />
              )}
              <Text style={styles.txCollapsedDate}>{shortDate}</Text>
            </View>
          </View>

          {/* Expand chevron */}
          <Text style={styles.txChevron}>›</Text>
        </ScalePressable>
      </View>
    );
  }

  // ── EXPANDED ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.txRowWrapper}>
      <View style={styles.txCard}>
      {/* Header — tap anywhere except the delete icon to collapse */}
      <Pressable style={styles.txTopRow} onPress={() => setExpanded(false)}>
        <View style={[styles.txTypeBadge, { backgroundColor: isRecette ? colors.recetteSoft : colors.chargeSoft }]}>
          <View style={[styles.txTypeDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.txTypeText, { color: accentColor }]}>
            {isRecette ? t("transactions.recettesFilter") : t("transactions.chargesFilter")}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onDelete} hitSlop={8} style={styles.txDeleteBtn}>
          <Icon name="delete" size={14} color={colors.textTertiary} />
        </Pressable>
      </Pressable>

      {/* Category */}
      <Pressable style={styles.txCategoryRow} onPress={onPickCategory}>
        <Text style={styles.txCategoryLabel} numberOfLines={1}>
          {getCategoryLabel(transaction.category)}
        </Text>
        <Text style={styles.txCategoryChange}>✎</Text>
      </Pressable>

      {/* Amount */}
      <View style={styles.txAmountRow}>
        <TextInput
          style={[styles.txAmountInput, { color: accentColor }]}
          value={String(transaction.amount)}
          keyboardType="numeric"
          onChangeText={(v) => {
            const n = parseFloat(v) || 0;
            if (n < 0 || n > 5000000) return;
            onChange({ amount: n });
          }}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.txAmountCurrency}>MAD</Text>
      </View>

      {/* Description */}
      <TextInput
        style={styles.txDescInput}
        value={transaction.description || ""}
        onChangeText={(v) => onChange({ description: v })}
        placeholder={t("transactions.descriptionPlaceholder")}
        placeholderTextColor={colors.textTertiary}
        multiline={false}
      />

      {/* Bottom row: date */}
      <View style={styles.txBottomRow}>
        <Pressable style={styles.txDateChip} onPress={onPickDate}>
          <Icon name="calendar" size={12} color={colors.textSecondary} />
          <Text style={styles.txDateLabel}>
            {new Date(transaction.date).toLocaleDateString(langToLocale(currentLang), {
              day: "numeric", month: "short", year: "numeric",
            })}
          </Text>
        </Pressable>
      </View>

      {/* Deductibility slider */}
      {!isRecette && (ratio < 1 || sliderVisible) && (
        <View style={styles.txSliderBox}>
          <View style={styles.txSliderHeader}>
            <Text style={styles.txSliderLabel}>{t("categories.professionalShare")}</Text>
            <Text style={[
              styles.txSliderPercent,
              { color: ratio === 0 ? colors.danger : ratio < 1 ? colors.warning : colors.success }
            ]}>
              {Math.round(ratio * 100)}%
            </Text>
          </View>
          <Slider
            style={{ width: "100%", height: 32 }}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={ratio}
            onSlidingComplete={(v) => {
              setSliderVisible(true);
              onChange({
                professionalUseRatio: v,
                deductibilityStatus: v === 0 ? "NOT_DEDUCTIBLE" : v < 1 ? "PARTIALLY_DEDUCTIBLE" : "FULLY_DEDUCTIBLE",
              });
            }}
            minimumTrackTintColor={colors.brand}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.brand}
          />
          <View style={styles.txSliderFooter}>
            <Text style={styles.txSliderHint}>0%</Text>
            <Text style={styles.txSliderDeductible}>
              {t("categories.deductible")}: {Math.round(transaction.amount * ratio).toLocaleString(langToLocale(currentLang))} MAD
            </Text>
            <Text style={styles.txSliderHint}>100%</Text>
          </View>
        </View>
      )}

      {/* Adjust ratio link for charges at 100% */}
      {!isRecette && ratio >= 1 && !sliderVisible && (
        <Pressable onPress={() => setSliderVisible(true)} style={styles.txAdjustBtn}>
          <Text style={styles.txAdjustText}>{t("categories.professionalShare")} ✎</Text>
        </Pressable>
      )}

      {/* CGI note */}
      {!isRecette && getCgiNote(transaction.category) && (
        <View style={styles.txCgiBox}>
          <Text style={styles.txCgiText}>
            {ratio === 1 ? "✅" : ratio === 0 ? "❌" : "⚠️"} {Math.round(ratio * 100)}% {t("categories.deductible").toLowerCase()}
            {" · "}{getCgiNote(transaction.category)}
          </Text>
        </View>
      )}
    </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
// Update existing styles for cleaner look:
container: { flex: 1, backgroundColor: colors.bg },
content: { padding: spacing.lg, paddingTop: spacing.lg },
header: {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
  backgroundColor: colors.surface,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
},
headerTitle: { fontSize: 26, fontWeight: "800" as const, color: colors.textPrimary, letterSpacing: -0.5 },
headerSub: { ...typography.caption, color: colors.brand, marginTop: 2 },

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryLabel: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryCount: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },

  groupLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },

  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  adjustBtn: {
  paddingVertical: 6,
  marginTop: spacing.xs,
},
adjustText: {
  fontSize: 11,
  color: colors.brand,
  fontWeight: "500",
},
  fab: {
  flexDirection: "row",
  gap: 10,
  paddingHorizontal: spacing.lg,
  paddingVertical: 10,
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 6,
},
yearRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.lg,
},
yearBtn: {
  width: 40,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: radii.pill,
  backgroundColor: colors.brandSoft,
},
yearCenter: {
  alignItems: "center",
  marginHorizontal: spacing.xl,
},
yearLabel: {
  fontSize: 22,
  fontWeight: "800",
  color: colors.textPrimary,
  letterSpacing: -0.5,
},
yearSub: {
  fontSize: 10,
  color: colors.textTertiary,
  marginTop: 1,
  letterSpacing: 0.3,
},
fabBtn: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  paddingVertical: 14,
  borderRadius: radii.lg,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 3,
},
fabText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
  letterSpacing: 0.2,
},
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
  },
  resetBtnText: {
    fontSize: 13,
    color: colors.brand,
    fontWeight: "600",
  },

  txRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  txAccent: { width: 4 },
  txContent: { flex: 1, padding: spacing.md },
  txTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  txCategoryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txCategoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  txCategoryEdit: { fontSize: 11, color: colors.brand, fontWeight: "600" },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
  },
  deleteBtnText: {
    fontSize: 22,
    color: colors.textTertiary,
    lineHeight: 24,
  },
  txAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txDateBtn: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txDateText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },

  txDeductibility: { marginTop: spacing.md },
  pillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  pillTextActive: { color: colors.textOnDark, fontWeight: "600" },
  ratioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  ratioLabel: { ...typography.caption, color: colors.textSecondary },
  ratioInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    padding: 6,
    backgroundColor: colors.surface,
    fontSize: 13,
    width: 70,
    color: colors.textPrimary,
  },
  sliderHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 2,
},
sliderLabel: {
  ...typography.caption,
  color: colors.textSecondary,
  fontWeight: "600",
},
  txRowWrapper: {
    marginBottom: spacing.sm,
  },

// ===== Collapsed row =====
  txCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  txCollapsedAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  txCollapsedBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 3,
  },
  txCollapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  txCollapsedCategory: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  txCollapsedAmount: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  // Amount figure + currency label (replaces txCollapsedAmount in collapsed card)
  txAmountFigure: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.5,   // tight tracking makes large numbers look cleaner
  },
  txAmountUnit: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  txCollapsedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  txCollapsedDesc: {
    fontSize: 11,
    color: colors.textTertiary,
    flex: 1,
  },
  txCollapsedTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flex: 1,         // takes up space so date stays at right
    maxWidth: 6,
  },
  txCollapsedDate: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  txChevron: {
    fontSize: 18,
    color: colors.textTertiary,
    paddingHorizontal: spacing.sm,
    lineHeight: 22,
  },
  txNum: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: "hidden",
    minWidth: 22,
    textAlign: "center",
  },
  txNumExpanded: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: "hidden",
    marginLeft: spacing.sm,
  },

// ===== Collapse button inside expanded card =====
  txCollapseBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: 4,
  },
  txCollapseBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "700",
    lineHeight: 16,
  },

// ===== Transaction Card =====
  txCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  txTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  txTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  txTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  txTypeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  txDeleteBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  txCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  txCategoryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  txCategoryChange: {
    fontSize: 14,
    color: colors.brand,
    paddingLeft: spacing.sm,
  },
  txAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.xs,
  },
  txAmountInput: {
    fontSize: 22,
    fontWeight: "800",
    paddingVertical: 2,
    minWidth: 80,
  },
  txAmountCurrency: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textTertiary,
    marginLeft: 4,
  },
  txDescInput: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  txBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  txDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
  },
  txDateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  txSliderBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  txSliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txSliderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  txSliderPercent: {
    fontSize: 16,
    fontWeight: "700",
  },
  txSliderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -2,
  },
  txSliderHint: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  txSliderDeductible: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  txAdjustBtn: {
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  txAdjustText: {
    fontSize: 11,
    color: colors.brand,
    fontWeight: "500",
  },
  txCgiBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: spacing.sm,
  },
  txCgiText: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 15,
  },
sliderValue: {
  fontSize: 16,
  fontWeight: "700",
},
cgiNote: {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radii.sm,
  paddingVertical: 6,
  paddingHorizontal: 10,
  marginTop: spacing.xs,
},
cgiNoteText: {
  fontSize: 11,
  color: colors.textSecondary,
  lineHeight: 16,
},
sliderFooter: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: -4,
},
sliderHint: {
  fontSize: 10,
  color: colors.textTertiary,
},
sliderDeductible: {
  fontSize: 11,
  color: colors.textSecondary,
  fontWeight: "500",
},
  txDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 4,
  },


});