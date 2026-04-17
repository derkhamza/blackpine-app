import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput } from "react-native";
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
import { useDatePicker } from "../lib/useDatePicker";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { Image } from "react-native";
import { ReceiptCapture } from "../components/ReceiptCapture";

export function TransactionsScreen() {
  const { transactions, updateTransaction, deleteTransaction, addTransaction, result } = useApp();
  const [addModalType, setAddModalType] = useState<TransactionType | null>(null);
  const [pickerOpenForExisting, setPickerOpenForExisting] = useState<{ txId: string; type: TransactionType } | null>(null);
  const datePicker = useDatePicker();

  const recettes = transactions.filter((t) => t.type === "RECETTE");
  const charges = transactions.filter((t) => t.type === "CHARGE");

  const handleCategoryChange = (txId: string, category: Category) => {
    const defaults = applyCategoryDefaults(category.id, result.tax.regime, 2026);
    updateTransaction(txId, {
      category: category.id,
      deductibilityStatus: defaults.deductibilityStatus,
      professionalUseRatio: defaults.professionalUseRatio,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Transactions</Text>
      <Text style={styles.screenSubtitle}>{transactions.length} opérations · {formatMAD(result.breakdown.totalRecettes)} en recettes</Text>

      {transactions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptyText}>Ajoutez votre première recette ou charge pour commencer.</Text>
        </View>
      )}

      {recettes.length > 0 && <Text style={styles.groupLabel}>Recettes · {recettes.length}</Text>}
      {recettes.map((t) => (
        <TransactionRow
          key={t.id}
          transaction={t}
          onChange={(patch) => updateTransaction(t.id, patch)}
          onDelete={() => deleteTransaction(t.id)}
          onPickCategory={() => setPickerOpenForExisting({ txId: t.id, type: t.type })}
          onPickDate={() => datePicker.show(t.date, (iso) => updateTransaction(t.id, { date: iso }))}
        />
      ))}

      {charges.length > 0 && <Text style={[styles.groupLabel, { marginTop: spacing.lg }]}>Charges · {charges.length}</Text>}
      {charges.map((t) => (
        <TransactionRow
          key={t.id}
          transaction={t}
          onChange={(patch) => updateTransaction(t.id, patch)}
          onDelete={() => deleteTransaction(t.id)}
          onPickCategory={() => setPickerOpenForExisting({ txId: t.id, type: t.type })}
          onPickDate={() => datePicker.show(t.date, (iso) => updateTransaction(t.id, { date: iso }))}
        />
      ))}

      <View style={styles.addRow}>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.recette }]} onPress={() => setAddModalType("RECETTE")}>
          <Text style={styles.addBtnText}>+ Recette</Text>
        </Pressable>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.charge }]} onPress={() => setAddModalType("CHARGE")}>
          <Text style={styles.addBtnText}>+ Charge</Text>
        </Pressable>
      </View>

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
          onSelect={(cat) => handleCategoryChange(pickerOpenForExisting.txId, cat)}
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
      <View style={[styles.txAccent, { backgroundColor: isRecette ? colors.recette : colors.charge }]} />
      <View style={styles.txContent}>
        <View style={styles.txTop}>
          <Pressable style={styles.txCategoryBtn} onPress={onPickCategory}>
            <Text style={styles.txCategoryText}>{getCategoryLabel(transaction.category)}</Text>
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
            📅 {new Date(transaction.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </Pressable>

        {!isRecette && (
          <View style={styles.txDeductibility}>
            <View style={styles.pillRow}>
              {(["FULLY_DEDUCTIBLE", "PARTIALLY_DEDUCTIBLE", "NOT_DEDUCTIBLE"] as DeductibilityStatus[]).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.pill, transaction.deductibilityStatus === status && styles.pillActive]}
                  onPress={() => onChange({ deductibilityStatus: status })}
                >
                  <Text style={[styles.pillText, transaction.deductibilityStatus === status && styles.pillTextActive]}>
                    {status === "FULLY_DEDUCTIBLE" ? "Déductible" : status === "PARTIALLY_DEDUCTIBLE" ? "Partielle" : "Non déductible"}
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
                  onChangeText={(v) => onChange({ professionalUseRatio: Math.min(1, Math.max(0, parseFloat(v) || 0)) })}
                />
              </View>
            )}
          </View>
        )}

        {!isRecette && (
            <ReceiptCapture
                uri={transaction.receiptUri}
                onChange={(newUri) => onChange({ receiptUri: newUri })}
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 20, paddingBottom: 40 },
  screenTitle: { ...typography.h1, color: colors.textPrimary },
  screenSubtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  groupLabel: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase", marginBottom: spacing.sm },

  emptyState: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 6 },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.xl },

  txRow: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.sm, marginBottom: spacing.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadows.card },
  txAccent: { width: 3 },
  txContent: { flex: 1, padding: spacing.md },
  txTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  txCategoryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: colors.surfaceAlt, borderRadius: radii.xs, borderWidth: 1, borderColor: colors.border },
  txCategoryText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  txCategoryEdit: { fontSize: 11, color: colors.brand, fontWeight: "600" },
  deleteBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },
  deleteBtnText: { fontSize: 22, color: colors.textTertiary, lineHeight: 24 },
  txAmount: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  txDateBtn: { marginTop: spacing.sm, paddingVertical: 6, paddingHorizontal: 8, alignSelf: "flex-start", backgroundColor: colors.surfaceAlt, borderRadius: radii.xs, borderWidth: 1, borderColor: colors.border },
  txDateText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },

  txDeductibility: { marginTop: spacing.md },
  pillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  pillTextActive: { color: colors.textOnDark, fontWeight: "600" },
  ratioRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.sm },
  ratioLabel: { ...typography.caption, color: colors.textSecondary },
  ratioInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.xs, padding: 6, backgroundColor: colors.surface, fontSize: 13, width: 70, color: colors.textPrimary },

  addRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  addBtn: { flex: 1, paddingVertical: 12, borderRadius: radii.sm, alignItems: "center" },
  addBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 14 },
});