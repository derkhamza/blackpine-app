import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Transaction,
  TransactionType,
  DeductibilityStatus,
  Category,
  applyCategoryDefaults,
  getCategoryById,
} from "blackpine-engine";
import { useApp } from "../lib/AppContext";
import { CategoryPicker } from "../components/CategoryPicker";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { ReceiptCapture } from "../components/ReceiptCapture";
import {
  TransactionFilters,
  FilterState,
  DEFAULT_FILTERS,
} from "../components/TransactionFilters";
import { applyFilters } from "../lib/transactionFilters";
import { useDatePicker } from "../lib/useDatePicker";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

export function TransactionsScreen() {
  const { transactions, updateTransaction, deleteTransaction, addTransaction, result } = useApp();
  const [addModalType, setAddModalType] = useState<TransactionType | null>(null);
  const [pickerOpenForExisting, setPickerOpenForExisting] = useState<{
    txId: string;
    type: TransactionType;
  } | null>(null);
  const datePicker = useDatePicker();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters]
  );

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>Transactions</Text>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Recettes filtrées</Text>
          <Text style={[styles.summaryValue, { color: colors.recette }]}>
            {formatMAD(totalRecettes)}
          </Text>
          <Text style={styles.summaryCount}>{recettes.length} opération{recettes.length > 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Charges filtrées</Text>
          <Text style={[styles.summaryValue, { color: colors.charge }]}>
            {formatMAD(totalCharges)}
          </Text>
          <Text style={styles.summaryCount}>{charges.length} opération{charges.length > 1 ? "s" : ""}</Text>
        </View>
      </View>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onChange={setFilters}
        totalCount={transactions.length}
        filteredCount={filtered.length}
      />

      {/* Empty state */}
      {filtered.length === 0 && transactions.length > 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>Essayez de modifier vos filtres.</Text>
          <Pressable
            style={styles.resetBtn}
            onPress={() => setFilters(DEFAULT_FILTERS)}
          >
            <Text style={styles.resetBtnText}>Réinitialiser les filtres</Text>
          </Pressable>
        </View>
      )}

      {filtered.length === 0 && transactions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptyText}>
            Ajoutez votre première recette ou charge pour commencer.
          </Text>
        </View>
      )}

      {/* Transaction list — show flat when filtering by type, grouped otherwise */}
      {filters.typeFilter === "ALL" ? (
        <>
          {recettes.length > 0 && (
            <Text style={styles.groupLabel}>
              Recettes · {recettes.length}
            </Text>
          )}
          {recettes.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onChange={(patch) => updateTransaction(t.id, patch)}
              onDelete={() => deleteTransaction(t.id)}
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
            <Text style={[styles.groupLabel, { marginTop: spacing.lg }]}>
              Charges · {charges.length}
            </Text>
          )}
          {charges.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onChange={(patch) => updateTransaction(t.id, patch)}
              onDelete={() => deleteTransaction(t.id)}
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
            onDelete={() => deleteTransaction(t.id)}
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

      {/* Add buttons */}
      <View style={styles.addRow}>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.recette }]}
          onPress={() => setAddModalType("RECETTE")}
        >
          <Text style={styles.addBtnText}>+ Recette</Text>
        </Pressable>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.charge }]}
          onPress={() => setAddModalType("CHARGE")}
        >
          <Text style={styles.addBtnText}>+ Charge</Text>
        </Pressable>
      </View>

      {/* Modals */}
      {addModalType && (
        <AddTransactionModal
          visible={true}
          type={addModalType}
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
    </ScrollView>
  );
}

function getCategoryLabel(categoryId: string): string {
  const cat = getCategoryById(2026, categoryId);
  return cat?.labelFr ?? categoryId;
}

function formatMAD(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + "\u00A0MAD";
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
            <Text style={styles.deleteBtnText}>×</Text>
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

        <Pressable style={styles.txDateBtn} onPress={onPickDate}>
          <Text style={styles.txDateText}>
            📅{" "}
            {new Date(transaction.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </Pressable>

        {!isRecette && (
          <View style={styles.txDeductibility}>
            <View style={styles.pillRow}>
              {(
                [
                  "FULLY_DEDUCTIBLE",
                  "PARTIALLY_DEDUCTIBLE",
                  "NOT_DEDUCTIBLE",
                ] as DeductibilityStatus[]
              ).map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.pill,
                    transaction.deductibilityStatus === status &&
                      styles.pillActive,
                  ]}
                  onPress={() => onChange({ deductibilityStatus: status })}
                >
                  <Text
                    style={[
                      styles.pillText,
                      transaction.deductibilityStatus === status &&
                        styles.pillTextActive,
                    ]}
                  >
                    {status === "FULLY_DEDUCTIBLE"
                      ? "Déductible"
                      : status === "PARTIALLY_DEDUCTIBLE"
                      ? "Partielle"
                      : "Non déductible"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {transaction.deductibilityStatus === "PARTIALLY_DEDUCTIBLE" && (
              <View style={styles.ratioRow}>
                <Text style={styles.ratioLabel}>Part professionnelle</Text>
                <TextInput
                  style={styles.ratioInput}
                  value={String(ratio)}
                  keyboardType="decimal-pad"
                  onChangeText={(v) =>
                    onChange({
                      professionalUseRatio: Math.min(
                        1,
                        Math.max(0, parseFloat(v) || 0)
                      ),
                    })
                  }
                />
              </View>
            )}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 20, paddingBottom: 40 },
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
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
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.sm,
  },
  resetBtnText: {
    fontSize: 13,
    color: colors.brand,
    fontWeight: "600",
  },

  txRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
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
    borderRadius: radii.sm,
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

  addRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  addBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  addBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 14 },
});