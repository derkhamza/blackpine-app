import { useState, useEffect, useRef } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Category,
  TransactionType,
  Transaction,
  applyCategoryDefaults,
  Regime,
} from "blackpine-engine";
import { CategoryPicker } from "./CategoryPicker";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { formatMAD } from "../lib/format";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ReceiptCapture } from "./ReceiptCapture";

interface Props {
  visible: boolean;
  type: TransactionType;
  regime: Regime;
  fiscalYear: number;
  onClose: () => void;
  onCreate: (tx: Omit<Transaction, "id">) => void;
}

type Step = "category" | "amount" | "date";

export function AddTransactionModal({
  visible,
  type,
  regime,
  fiscalYear,
  onClose,
  onCreate,
}: Props) {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedRef = useRef(false);
  const [receiptUri, setReceiptUri] = useState<string | undefined>(undefined);

  // Reset whenever the modal opens
    useEffect(() => {
    if (visible) {
        setStep("category");
        setCategory(null);
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        selectedRef.current = false;
        setPickerOpen(true);
    } else {
        setPickerOpen(false);
    }
    }, [visible]);

const handleCategorySelected = (cat: Category) => {
  selectedRef.current = true;
  setCategory(cat);
  setPickerOpen(false);
  setStep("amount");
};

  const handleAmountConfirm = () => {
    const n = parseFloat(amount);
    if (!isNaN(n) && n > 0) setStep("date");
  };

const handleSave = () => {
  if (!category) return;
  if (!amount) return;
  const n = parseFloat(amount);
  if (isNaN(n) || n <= 0) return;

  const defaults = applyCategoryDefaults(category.id, regime, fiscalYear);

    onCreate({
    type,
    amount: n,
    date,
    category: category.id,
    deductibilityStatus: type === "CHARGE" ? defaults.deductibilityStatus : undefined,
    professionalUseRatio: type === "CHARGE" ? defaults.professionalUseRatio : undefined,
    receiptUri,
    });
  onClose();
};
  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selected) setDate(selected.toISOString().split("T")[0]);
  };

  const accent = type === "RECETTE" ? colors.recette : colors.charge;
  const typeLabel = type === "RECETTE" ? "Nouvelle recette" : "Nouvelle charge";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: accent }]}>
            <Text style={styles.typeBadgeText}>
              {type === "RECETTE" ? "RECETTE" : "CHARGE"}
            </Text>
          </View>
          <Text style={styles.title}>{typeLabel}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Annuler</Text>
          </Pressable>
        </View>

        {/* Progress indicator */}
        <View style={styles.steps}>
          <StepDot active={step === "category"} done={!!category} />
          <View style={styles.stepLine} />
          <StepDot active={step === "amount"} done={step === "date"} />
          <View style={styles.stepLine} />
          <StepDot active={step === "date"} done={false} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* CATEGORY STEP */}
          {step === "category" && category && (
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Catégorie</Text>
              <Text style={styles.summaryValue}>{category.labelFr}</Text>
              <Pressable onPress={() => setPickerOpen(true)}>
                <Text style={styles.changeBtn}>Modifier</Text>
              </Pressable>
            </View>
          )}

          {category && (step === "amount" || step === "date") && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Catégorie</Text>
                <Text style={styles.summaryValueSmall}>{category.labelFr}</Text>
                <Pressable onPress={() => { setStep("category"); setPickerOpen(true); }}>
                  <Text style={styles.changeBtn}>Modifier</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* AMOUNT STEP */}
          {step === "amount" && (
            <View style={styles.amountSection}>
              <Text style={styles.label}>Montant</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  autoFocus
                />
                <Text style={styles.currency}>MAD</Text>
              </View>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: amount && parseFloat(amount) > 0 ? accent : colors.borderStrong },
                ]}
                onPress={handleAmountConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                <Text style={styles.primaryBtnText}>Continuer</Text>
              </Pressable>
            </View>
          )}

          {amount && parseFloat(amount) > 0 && step === "date" && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Montant</Text>
                <Text style={styles.summaryValueSmall}>
                  {formatMAD(parseFloat(amount))}
                </Text>
                <Pressable onPress={() => setStep("amount")}>
                  <Text style={styles.changeBtn}>Modifier</Text>
                </Pressable>
              </View>
            </View>
          )}
        
            {step === "date" && (
            <View style={styles.dateSection}>
                <Text style={styles.label}>Date</Text>
                <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateBtnText}>
                    {new Date(date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    })}
                </Text>
                </Pressable>

                <View style={styles.quickDates}>
                <QuickDate
                    label="Aujourd'hui"
                    onPress={() => setDate(new Date().toISOString().split("T")[0])}
                />
                <QuickDate
                    label="Hier"
                    onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split("T")[0]);
                    }}
                />
                </View>

                {showDatePicker && (
                <DateTimePicker
                    value={new Date(date)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
                )}

                {type === "CHARGE" && (
                <ReceiptCapture uri={receiptUri} onChange={setReceiptUri} />
                )}

                <Pressable
                style={[styles.primaryBtn, { backgroundColor: accent }]}
                onPress={handleSave}
                >
                <Text style={styles.primaryBtnText}>Enregistrer</Text>
                </Pressable>
            </View>
            )}

          {/* DATE STEP */}
          {step === "date" && (
            <View style={styles.dateSection}>
              <Text style={styles.label}>Date</Text>
              <Pressable
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateBtnText}>
                  {new Date(date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </Pressable>

              <View style={styles.quickDates}>
                <QuickDate
                  label="Aujourd'hui"
                  onPress={() => setDate(new Date().toISOString().split("T")[0])}
                />
                <QuickDate
                  label="Hier"
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split("T")[0]);
                  }}
                />
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(date)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              <Pressable
                style={[styles.primaryBtn, { backgroundColor: accent }]}
                onPress={handleSave}
              >
                <Text style={styles.primaryBtnText}>Enregistrer</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <CategoryPicker
        visible={pickerOpen}
        type={type}
        fiscalYear={fiscalYear}
        onClose={() => {
            setPickerOpen(false);
            // Only close the whole modal if user canceled (didn't select anything)
            if (!selectedRef.current) {
            onClose();
            }
            selectedRef.current = false;
        }}
        onSelect={handleCategorySelected}
        />
      </View>
    </Modal>
  );
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <View
      style={[
        styles.stepDot,
        active && styles.stepDotActive,
        done && styles.stepDotDone,
      ]}
    />
  );
}

function QuickDate({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickDateBtn} onPress={onPress}>
      <Text style={styles.quickDateText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textOnDark,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  cancel: { color: colors.brand, fontSize: 15, fontWeight: "600" },

  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  stepDotActive: { backgroundColor: colors.brand, width: 24 },
  stepDotDone: { backgroundColor: colors.success },
  stepLine: { width: 12, height: 1, backgroundColor: colors.border },

  body: { flex: 1, padding: spacing.lg },

  label: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  summaryValue: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  summaryValueSmall: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
  },
  changeBtn: { fontSize: 12, color: colors.brand, fontWeight: "600" },

  amountSection: { gap: spacing.md },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  currency: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  dateSection: { gap: spacing.md },
  dateBtn: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  dateBtnText: {
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  quickDates: { flexDirection: "row", gap: spacing.sm },
  quickDateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDateText: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },

  primaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
});