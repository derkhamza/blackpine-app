import { useState } from "react";
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { applyCategoryDefaults, Category } from "blackpine-engine";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { CategoryPicker } from "./CategoryPicker";
import { Icon } from "../lib/icons";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { RecurringRule } from "../lib/recurringTransactions";

export function RecurringSection() {
  const { t } = useT();
  const { profile, result, recurringRules, addRecurringRule, deleteRecurringRule } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [category, setCategory] = useState<Category | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState<"RECETTE" | "CHARGE">("CHARGE");

  const resetForm = () => {
    setLabel(""); setAmount(""); setFrequency("monthly");
    setDayOfMonth("1"); setCategory(null); setType("CHARGE");
  };

  const handleAdd = () => {
    if (!category || !amount || !label.trim()) return;
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return;
    const defaults = applyCategoryDefaults(category.id, result.tax.regime, 2026);
    addRecurringRule({
      templateTransaction: {
        type,
        amount: n,
        category: category.id,
        description: label.trim(),
        deductibilityStatus: type === "CHARGE" ? defaults.deductibilityStatus : undefined,
        professionalUseRatio: type === "CHARGE" ? defaults.professionalUseRatio : undefined,
      },
      frequency,
      dayOfMonth: parseInt(dayOfMonth) || 1,
      startDate: new Date().toISOString().split("T")[0],
      label: label.trim(),
      active: true,
    });
    resetForm();
    setModalVisible(false);
  };

  const freqLabel = (f: string) => {
    if (f === "monthly") return t("recurring.monthly");
    if (f === "quarterly") return t("recurring.quarterly");
    return t("recurring.yearly");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("recurring.title")}</Text>
          <Text style={styles.subtitle}>{recurringRules.length} {t("recurring.rules")}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Icon name="add" size={16} color={colors.textOnDark} />
          <Text style={styles.addBtnText}>{t("recurring.add")}</Text>
        </Pressable>
      </View>

      {recurringRules.map((rule) => (
        <View key={rule.id} style={styles.ruleCard}>
          <View style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: rule.templateTransaction.type === "RECETTE" ? colors.recette : colors.charge }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleLabel}>{rule.label}</Text>
              <Text style={styles.ruleMeta}>{freqLabel(rule.frequency)} · Jour {rule.dayOfMonth}</Text>
            </View>
            <Text style={[styles.ruleAmount, { color: rule.templateTransaction.type === "RECETTE" ? colors.recette : colors.charge }]}>
              {Math.round(rule.templateTransaction.amount).toLocaleString("fr-FR")} MAD
            </Text>
            <Pressable onPress={() => deleteRecurringRule(rule.id)} hitSlop={12}>
              <Icon name="delete" size={14} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>
      ))}

      {recurringRules.length === 0 && (
        <Text style={styles.empty}>{t("recurring.empty")}</Text>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => { resetForm(); setModalVisible(false); }}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("recurring.add")}</Text>
              <Pressable onPress={() => { resetForm(); setModalVisible(false); }}>
                <Text style={styles.modalCancel}>{t("close")}</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>{t("recurring.label")}</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="Ex: Loyer cabinet, CNSS..."
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={styles.fieldLabel}>{t("recurring.type")}</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, type === "CHARGE" && styles.chipActive]}
                  onPress={() => setType("CHARGE")}
                >
                  <Text style={[styles.chipText, type === "CHARGE" && styles.chipTextActive]}>Charge</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, type === "RECETTE" && styles.chipActive]}
                  onPress={() => setType("RECETTE")}
                >
                  <Text style={[styles.chipText, type === "RECETTE" && styles.chipTextActive]}>Recette</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>{t("recurring.category")}</Text>
              <Pressable style={styles.input} onPress={() => setPickerOpen(true)}>
                <Text style={{ fontSize: 15, color: category ? colors.textPrimary : colors.textTertiary }}>
                  {category ? category.labelFr : t("recurring.selectCategory")}
                </Text>
              </Pressable>

              <Text style={styles.fieldLabel}>{t("recurring.amount")}</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>{t("recurring.frequency")}</Text>
              <View style={styles.chipRow}>
                {(["monthly", "quarterly", "yearly"] as const).map((f) => (
                  <Pressable
                    key={f}
                    style={[styles.chip, frequency === f && styles.chipActive]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>{freqLabel(f)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t("recurring.dayOfMonth")}</Text>
              <TextInput
                style={styles.input}
                value={dayOfMonth}
                onChangeText={(v) => {
                  const n = parseInt(v);
                  if (!v) setDayOfMonth("");
                  else if (n >= 1 && n <= 28) setDayOfMonth(String(n));
                }}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.saveBtnWrapper}>
              <Pressable
                style={[styles.saveBtn, (!label.trim() || !amount || !category) && styles.saveBtnDisabled]}
                onPress={handleAdd}
                disabled={!label.trim() || !amount || !category}
              >
                <Text style={styles.saveBtnText}>{t("save")}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {pickerOpen && (
        <CategoryPicker
          visible={true}
          type={type}
          specialty={profile.specialty}
          fiscalYear={2026}
          onClose={() => setPickerOpen(false)}
          onSelect={(cat) => { setCategory(cat); setPickerOpen(false); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase" },
  subtitle: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brand, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill },
  addBtnText: { color: colors.textOnDark, fontSize: 12, fontWeight: "600" },
  ruleCard: { backgroundColor: colors.bg, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ruleDot: { width: 6, height: 6, borderRadius: 3 },
  ruleLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  ruleMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  ruleAmount: { fontSize: 14, fontWeight: "700" },
  empty: { ...typography.caption, color: colors.textTertiary, textAlign: "center", paddingVertical: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: "85%", paddingBottom: 0 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  modalCancel: { fontSize: 15, color: colors.brand, fontWeight: "600" },
  fieldLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginBottom: 6, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  chipTextActive: { color: colors.textOnDark },
  saveBtnWrapper: { padding: spacing.lg, paddingBottom: 30, backgroundColor: colors.bg },
  saveBtn: { backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radii.md, alignItems: "center" },
  saveBtnDisabled: { backgroundColor: colors.borderStrong },
  saveBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
});