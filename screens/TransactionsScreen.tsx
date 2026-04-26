import { useMemo, useState, useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, Pressable, TextInput, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import { useIsFocused } from "@react-navigation/native";
import { consumePendingFilter } from "../lib/navigationState";
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
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useApp } from "../lib/AppContext";
import { CategoryPicker } from "../components/CategoryPicker";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { ReceiptCapture } from "../components/ReceiptCapture";
import { applyFilters } from "../lib/transactionFilters";
import { useDatePicker } from "../lib/useDatePicker";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { tapLight, tapWarning } from "../lib/haptics";
import { Icon } from "../lib/icons";
import { useT } from "../lib/useT";
import { SafeScreen } from "../components/SafeScreen";


export function TransactionsScreen({ route }: any) {
  const initialFilter = route?.params?.filter as "ALL" | "RECETTE" | "CHARGE" | undefined;
  const { transactions, updateTransaction, deleteTransaction, addTransaction, result, profile} = useApp();
  const [addModalType, setAddModalType] = useState<TransactionType | null>(null);
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
    () => applyFilters(transactions, filters),
    [transactions, filters]
  );

const isFocused = useIsFocused();

useEffect(() => {
  if (isFocused) {
    const pending = consumePendingFilter();
    if (pending !== "ALL") {
      setFilters((prev) => ({ ...prev, type: pending }));
    }
  }
}, [isFocused]);
  const recettes = filtered.filter((t) => t.type === "RECETTE");
  const charges = filtered.filter((t) => t.type === "CHARGE");

  const totalRecettes = recettes.reduce((s, t) => s + t.amount, 0);
  const totalCharges = charges.reduce((s, t) => s + t.amount, 0);

  const handleCategoryChange = (txId: string, category: Category) => {
    const defaults = applyCategoryDefaults(category.id, result.tax.regime, 2026);
    updateTransaction(txId, {
      category: category.id,
      deductibilityStatus: defaults.deductibilityStatus,
      professionalUseRatio: defaults.professionalUseRatio,
    });
  };

  return (
  <SafeScreen>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>{t("transactions.title")}</Text>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t("transactions.filteredRecettes")}</Text>
          <Text style={[styles.summaryValue, { color: colors.recette }]}>
            {formatMAD(totalRecettes)}
          </Text>
          <Text style={styles.summaryCount}>{recettes.length} opération{recettes.length > 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t("transactions.filteredCharges")}</Text>
          <Text style={[styles.summaryValue, { color: colors.charge }]}>
            {formatMAD(totalCharges)}
          </Text>
          <Text style={styles.summaryCount}>{charges.length} opération{charges.length > 1 ? "s" : ""}</Text>
        </View>
      </View>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onChange={handleFilterChange}
        totalCount={transactions.length}
        filteredCount={filtered.length}
      />

      {/* Empty state */}
      {filtered.length === 0 && transactions.length > 0 && (
        <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{t("transactions.noResults")}</Text>
        <Text style={styles.emptyText}>{t("transactions.tryModifyFilters")}</Text>
          <Pressable
            style={styles.resetBtn}
            onPress={() => setFilters(DEFAULT_FILTERS)}
          >
            <Text style={styles.resetBtnText}>{t("transactions.resetFilters")}</Text>
          </Pressable>
        </View>
      )}

      {filtered.length === 0 && transactions.length === 0 && (
        <View style={styles.emptyState}>
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
          {recettes.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onChange={(patch) => updateTransaction(t.id, patch)}
              onDelete={() => { tapWarning(); deleteTransaction(t.id); }}
              onPickCategory={() =>
                setPickerOpenForExisting({ txId: t.id, type: t.type })
              }
              onPickDate={() =>
                datePicker.show(t.date, (iso) =>
                  updateTransaction(t.id, { date: iso })
                )
              }
            />
          ))}

          {charges.length > 0 && (
            <Text style={[styles.groupLabel, { marginTop: spacing.lg }]}>{t("dashboard.charges")} · {charges.length}</Text>
          )}
          {charges.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onChange={(patch) => updateTransaction(t.id, patch)}
              onDelete={() => { tapWarning(); deleteTransaction(t.id); }}
              onPickCategory={() =>
                setPickerOpenForExisting({ txId: t.id, type: t.type })
              }
              onPickDate={() =>
                datePicker.show(t.date, (iso) =>
                  updateTransaction(t.id, { date: iso })
                )
              }
            />
          ))}
        </>
      ) : (
        // When filtered by type, show a flat list
        filtered.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            onChange={(patch) => updateTransaction(t.id, patch)}
            onDelete={() => { tapWarning(); deleteTransaction(t.id); }}
            onPickCategory={() =>
              setPickerOpenForExisting({ txId: t.id, type: t.type })
            }
            onPickDate={() =>
              datePicker.show(t.date, (iso) =>
                updateTransaction(t.id, { date: iso })
              )
            }
          />
        ))
      )}


 
</ScrollView>

    {/* Floating add buttons */}
    <View style={styles.fab}>
      <Pressable
        style={[styles.fabBtn, { backgroundColor: colors.recette }]}
        onPress={() => { tapLight(); setAddModalType("RECETTE"); }}
      >
        <Text style={styles.fabText}>{t("transactions.addRecette")}</Text>
      </Pressable>
      <Pressable
        style={[styles.fabBtn, { backgroundColor: colors.charge }]}
        onPress={() => { tapLight(); setAddModalType("CHARGE"); }}
      >

        <Text style={styles.fabText}>{t("transactions.addCharge")}</Text>
      </Pressable>
    </View>

    {/* Modals */}
     {/* Modals */}
      {addModalType && (
        <AddTransactionModal
          visible={true}
          type={addModalType}
          specialty={profile.specialty}
          regime={result.tax.regime}
          fiscalYear={2026}
          onClose={() => setAddModalType(null)}
          onCreate={addTransaction}
        />
      )}

      {pickerOpenForExisting && (
        <CategoryPicker
          visible={true}
          type={pickerOpenForExisting.type}
          specialty={profile.specialty}
          fiscalYear={2026}
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

function getCategoryLabel(categoryId: string): string {
  const cat = getCategoryById(2026, categoryId);
  return cat?.labelFr ?? categoryId;
}

function formatMAD(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + "\u00A0MAD";
}
function getCgiNote(categoryId: string): string | null {
  const cat = getCategoryById(2026, categoryId);
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
  const { t } = useT();
  const [sliderVisible, setSliderVisible] = useState(ratio < 1);
  return (
    <View style={styles.txRow}>
      <View
        style={[
          styles.txAccent,
          { backgroundColor: isRecette ? colors.recette : colors.charge },
        ]}
      />
      <View style={styles.txContent}>
        <View style={styles.txTop}>
          <Pressable style={styles.txCategoryBtn} onPress={onPickCategory}>
            <Text style={styles.txCategoryText}>
              {getCategoryLabel(transaction.category)}
            </Text>
            <Text style={styles.txCategoryEdit}>Modifier</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
            <Icon name="delete" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <TextInput
          style={styles.txAmount}
          value={String(transaction.amount)}
          keyboardType="numeric"
          onChangeText={(v) => onChange({ amount: parseFloat(v) || 0 })}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
        />
        <TextInput
          style={styles.txDescription}
          value={transaction.description || ""}
          onChangeText={(v) => onChange({ description: v })}
          placeholder={t("transactions.descriptionPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          multiline={false}
        />
        <Pressable style={styles.txDateBtn} onPress={onPickDate}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="calendar" size={12} color={colors.textSecondary} />
            <Text style={styles.txDateText}>
              {new Date(transaction.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </Pressable>

      {!isRecette && (ratio < 1 || sliderVisible) && (
          <View style={styles.txDeductibility}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>{t("categories.professionalShare")}</Text>
              <Text style={[
                styles.sliderValue,
                { color: ratio === 0 ? colors.danger : ratio < 1 ? colors.warning : colors.success }
              ]}>
                {Math.round(ratio * 100)}%
              </Text>
            </View>
            <Slider
              style={{ width: "100%", height: 36 }}
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
            <View style={styles.sliderFooter}>
              <Text style={styles.sliderHint}>0%</Text>
              <Text style={styles.sliderDeductible}>
                {t("categories.deductible")}: {Math.round(transaction.amount * ratio).toLocaleString("fr-FR")} MAD
              </Text>
              <Text style={styles.sliderHint}>100%</Text>
            </View>
          </View>
        )}

        {!isRecette && (
          <View style={styles.cgiNote}>
            <Text style={styles.cgiNoteText}>
              {ratio === 1 ? "✅" : ratio === 0 ? "❌" : "⚠️"} {Math.round(ratio * 100)}% {t("categories.deductible").toLowerCase()}
              {getCgiNote(transaction.category) ? ` · ${getCgiNote(transaction.category)}` : ""}
            </Text>
          </View>
        )}

        {!isRecette && (
          <ReceiptCapture
            uri={transaction.receiptUri}
            onChange={(newUri) => onChange({ receiptUri: newUri })}
            onOcrAmount={(ocrAmount) => onChange({ amount: ocrAmount })}
            onOcrDate={(ocrDate) => onChange({ date: ocrDate })}
          />
        )}

        {!isRecette && ratio >= 1 && !sliderVisible && (
          <Pressable onPress={() => setSliderVisible(true)} style={styles.adjustBtn}>
            <Text style={styles.adjustText}>{t("categories.professionalShare")} ✎</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
// Update existing styles for cleaner look:
container: { flex: 1, backgroundColor: colors.bg },
content: { padding: spacing.lg, paddingTop: spacing.md },
screenTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.card,
  },
  summaryLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    textTransform: "uppercase",
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

  emptyState: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
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
  paddingVertical: spacing.sm,
  backgroundColor: colors.bg,
  borderTopWidth: 1,
  borderTopColor: colors.border,
},
fabBtn: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  paddingVertical: 12,
  borderRadius: radii.md,
},
fabText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
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
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  txAccent: { width: 3 },
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