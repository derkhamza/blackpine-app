import { useState, useEffect, useRef, useMemo } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Category,
  TransactionType,
  Transaction,
  applyCategoryDefaults,
  getCategoryById,
  Regime,
} from "blackpine-engine";

// ── Keyword → Category auto-categorization ──────────────────────────────────
type KwEntry = { keywords: string[]; categoryId: string };

const CHARGE_KEYWORD_MAP: KwEntry[] = [
  { keywords: ["loyer", "bail", "location cabinet"], categoryId: "loyer_cabinet" },
  { keywords: ["electricite", "électricité", "eau potable", "redal", "lydec"], categoryId: "electricite_eau" },
  { keywords: ["internet", "telephone fixe", "téléphone fixe", "adsl", "fibre", "wifi", "imt"], categoryId: "internet_telephone" },
  { keywords: ["rc pro", "responsabilite civile", "responsabilité civile", "assurance rc"], categoryId: "rc_pro" },
  { keywords: ["assurance local", "assurance cabinet"], categoryId: "assurance_local" },
  { keywords: ["salaire", "secretaire", "secrétaire", "infirmier", "infirmière", "personnel"], categoryId: "salaires_personnel" },
  { keywords: ["cnss", "cotisation sociale", "cotisation cnss"], categoryId: "cotisations_cnss_tns" },
  { keywords: ["gants", "seringue", "pansement", "consommable"], categoryId: "consommables_medicaux" },
  { keywords: ["medicament", "médicament", "pharmacie", "produit pharmaceutique"], categoryId: "produits_pharmaceutiques" },
  { keywords: ["materiel medical", "matériel médical", "stethoscope", "otoscope", "tensiometre", "echographe"], categoryId: "gros_equipement_medical" },
  { keywords: ["comptable", "expert-comptable", "expertise comptable"], categoryId: "honoraires_comptable" },
  { keywords: ["avocat"], categoryId: "honoraires_avocat" },
  { keywords: ["ordre des medecins", "conseil national", "cnom"], categoryId: "ordre_medecins" },
  { keywords: ["formation", "congres", "congrès", "seminaire", "séminaire", "conference", "conférence"], categoryId: "congres_formation" },
  { keywords: ["voyage", "billet avion", "hotel", "hôtel"], categoryId: "voyages_congres" },
  { keywords: ["logiciel", "abonnement logiciel", "maintenance informatique", "logiciel cabinet"], categoryId: "logiciel_informatique" },
  { keywords: ["fourniture", "papier", "cartouche"], categoryId: "fournitures_bureau" },
  { keywords: ["nettoyage", "entretien cabinet", "menage", "ménage"], categoryId: "entretien_nettoyage" },
  { keywords: ["carburant", "essence", "gasoil", "gasoïl", "diesel", "total energie"], categoryId: "carburant" },
  { keywords: ["entretien vehicule", "reparation vehicule", "garage", "réparation voiture"], categoryId: "entretien_vehicule" },
  { keywords: ["assurance vehicule", "assurance voiture"], categoryId: "assurance_vehicule" },
  { keywords: ["taxi"], categoryId: "taxi_visites" },
  { keywords: ["telephone mobile", "mobile pro", "forfait mobile"], categoryId: "telephone_mobile_pro" },
  { keywords: ["site web", "hébergement web", "hebergement", "domaine"], categoryId: "site_web" },
  { keywords: ["publicite", "publicité", "enseigne", "plaque"], categoryId: "publicite_pro" },
  { keywords: ["frais bancaire", "commission bancaire", "frais banque"], categoryId: "frais_bancaires" },
  { keywords: ["taxe professionnelle", "patente"], categoryId: "taxe_professionnelle" },
  { keywords: ["retraite", "cimr"], categoryId: "retraite_cimr" },
  { keywords: ["revue médicale", "revue medicale", "abonnement revue", "journal medical"], categoryId: "abonnements_medicaux" },
];

const RECETTE_KEYWORD_MAP: KwEntry[] = [
  { keywords: ["consultation", "consult", "honoraires consultation"], categoryId: "consultation" },
  { keywords: ["visite domicile", "visite à domicile", "domicile"], categoryId: "visite_domicile" },
  { keywords: ["chirurgie", "acte chirurgical", "bloc operatoire", "intervention"], categoryId: "acte_chirurgical" },
  { keywords: ["soin dentaire", "extraction", "carie", "obturation"], categoryId: "soin_dentaire" },
  { keywords: ["prothese", "prothèse", "couronne", "bridge", "implant"], categoryId: "prothese_dentaire" },
  { keywords: ["orthodontie", "bague", "appareil dentaire", "gouttiere"], categoryId: "orthodontie" },
  { keywords: ["detartrage", "détartrage", "scaling"], categoryId: "detartrage" },
  { keywords: ["kine", "kiné", "kinesitherapie", "kinésithérapie", "seance kine"], categoryId: "seance_kine" },
  { keywords: ["reeducation", "rééducation", "rehabilitation", "réhabilitation"], categoryId: "reeducation" },
  { keywords: ["accouchement", "naissance", "delivrance"], categoryId: "accouchement" },
  { keywords: ["grossesse", "prenatal", "prénatal", "suivi grossesse", "echographie obstetricale"], categoryId: "suivi_grossesse" },
  { keywords: ["vacation", "clinique", "vacation clinique", "garde"], categoryId: "vacation_clinique" },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function autoDetectCategory(text: string, type: "CHARGE" | "RECETTE"): string | null {
  const lower = normalize(text);
  const map = type === "CHARGE" ? CHARGE_KEYWORD_MAP : RECETTE_KEYWORD_MAP;
  for (const { keywords, categoryId } of map) {
    if (keywords.some(kw => lower.includes(normalize(kw)))) {
      return categoryId;
    }
  }
  return null;
}
import { CategoryPicker } from "./CategoryPicker";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD, langToLocale } from "../lib/format";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
  TextInput,
  View,
} from "react-native";
import { tapLight, tapSuccess } from "../lib/haptics";
import { useT } from "../lib/useT";
import Slider from "@react-native-community/slider";

interface Props {
  visible: boolean;
  type: TransactionType;
  regime: Regime;
  fiscalYear: number;
  specialty?: string;
  onClose: () => void;
  onCreate: (tx: Omit<Transaction, "id">) => void;
}

type Step = "category" | "amount" | "date";

export function AddTransactionModal({
  visible,
  type,
  regime,
  fiscalYear,
  specialty,
  onClose,
  onCreate,
}: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedRef = useRef(false);
  const [description, setDescription] = useState("");
  const [proRatio, setProRatio] = useState(1);
  // Auto-suggest: derived synchronously — no useEffect lag, no stale closure
  const suggestedCat = useMemo<Category | null>(() => {
    if (category || description.length < 3) return null;
    const detected = autoDetectCategory(description, type);
    if (!detected) return null;
    try {
      return getCategoryById(fiscalYear, detected) ?? null;
    } catch {
      return null;
    }
  }, [description, type, category, fiscalYear]);

  // Reset whenever the modal opens
  useEffect(() => {
    if (visible) {
      setStep("category");
      setCategory(null);
      setProRatio(1);
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      selectedRef.current = false;
      // CHARGE: description-first; picker opens on demand
      // RECETTE: fast-path — open picker immediately (few categories)
      setPickerOpen(type === "RECETTE");
    } else {
      setPickerOpen(false);
    }
  }, [visible]);

const handleCategorySelected = (cat: Category) => {
  tapLight();
  selectedRef.current = true;
  setCategory(cat);
  const defaults = applyCategoryDefaults(cat.id, regime, fiscalYear);
  setProRatio(defaults.professionalUseRatio ?? 1);
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
  if (n > 5000000) {
    Alert.alert(t("error"), t("transactions.amountTooHigh"));
    return;
  }
  const txDate = new Date(date);
  const now = new Date();
  if (txDate > now) {
    Alert.alert(t("error"), t("transactions.futureDate"));
    return;
  }
  if (txDate.getFullYear() < 2015) {
    Alert.alert(t("error"), t("transactions.dateTooOld"));
    return;
  }

  const defaults = applyCategoryDefaults(category.id, regime, fiscalYear);

  onCreate({
    type,
    amount: n,
    date,
    category: category.id,
    description: description.trim() || undefined,
    deductibilityStatus: type === "CHARGE"
      ? (proRatio === 0 ? "NOT_DEDUCTIBLE" : proRatio < 1 ? "PARTIALLY_DEDUCTIBLE" : "FULLY_DEDUCTIBLE")
      : undefined,
    professionalUseRatio: type === "CHARGE" ? proRatio : undefined,
  });
  tapSuccess();
  onClose();
};
  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selected) setDate(selected.toISOString().split("T")[0]);
  };
  const { t, currentLang } = useT();
  const accent = type === "RECETTE" ? colors.recette : colors.charge;
  const typeLabel = type === "RECETTE" ? t("addTransaction.newRecette") : t("addTransaction.newCharge");


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
              {type === "RECETTE" ? t("transactions.recettesFilter") : t("transactions.chargesFilter")}
            </Text>
          </View>
          <Text style={styles.title}>{typeLabel}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>{t("cancel")}</Text>
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

          {/* CHARGE CATEGORY STEP — description-first, auto-suggest inline */}
          {step === "category" && type === "CHARGE" && !category && !pickerOpen && (
            <View style={styles.chargeDescSection}>
              <Text style={styles.label}>{t("addTransaction.describeCharge")}</Text>
              <TextInput
                style={styles.chargeDescInput}
                value={description}
                onChangeText={setDescription}
                placeholder={t("addTransaction.chargeDescPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                returnKeyType="done"
              />

              {/* Auto-suggestion card */}
              {suggestedCat ? (
                <Pressable
                  style={styles.suggestCard}
                  onPress={() => { tapLight(); handleCategorySelected(suggestedCat); }}
                >
                  <Icon name="zap" size={14} color={colors.brand} />
                  <View style={styles.suggestCardBody}>
                    <Text style={styles.suggestCardHint}>{t("addTransaction.suggested")}</Text>
                    <Text style={styles.suggestCardName}>{suggestedCat.labelFr}</Text>
                  </View>
                  <Text style={styles.suggestCardApply}>{t("addTransaction.apply")} →</Text>
                </Pressable>
              ) : (
                description.length >= 3 && (
                  <View style={styles.noMatchRow}>
                    <Text style={styles.noMatchText}>{t("categories.noResults")} « {description} »</Text>
                  </View>
                )
              )}

              {/* Browse button — secondary path */}
              <Pressable
                style={styles.browseCatBtn}
                onPress={() => { tapLight(); setPickerOpen(true); }}
              >
                <Icon name="filter" size={14} color={colors.brand} />
                <Text style={styles.browseCatBtnText}>{t("addTransaction.browseCategories")}</Text>
              </Pressable>
            </View>
          )}

          {/* CATEGORY STEP */}
          {step === "category" && category && (
            <View style={styles.summaryRow}>
              <Text style={styles.label}>{t("addTransaction.category")}</Text>
              <Text style={styles.summaryValue}>{category.labelFr}</Text>
              <Pressable onPress={() => setPickerOpen(true)}>
                <Text style={styles.changeBtn}>{t("modify")}</Text>
              </Pressable>
            </View>
          )}

          {category && (step === "amount" || step === "date") && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>{t("addTransaction.category")}</Text>
                <Text style={styles.summaryValueSmall}>{category.labelFr}</Text>
                <Pressable onPress={() => { setStep("category"); setPickerOpen(true); }}>
                  <Text style={styles.changeBtn}>{t("modify")}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === "amount" && (
            <View style={styles.amountSection}>

              <Text style={styles.label}>{t("addTransaction.amount")}</Text>    
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  autoFocus={type !== "CHARGE"}
                />
                <Text style={styles.currency}>MAD</Text>
              </View>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder={t("transactions.descriptionPlaceholder")}
                placeholderTextColor={colors.textTertiary}
              />
              {type === "CHARGE" && category && proRatio < 1 && (
                <View style={styles.ratioSection}>
                  <View style={styles.ratioHeader}>
                    <Text style={styles.ratioLabel}>{t("categories.professionalShare")}</Text>
                    <Text style={styles.ratioValue}>{Math.round(proRatio * 100)}%</Text>
                  </View>
                  <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={proRatio}
                    onValueChange={setProRatio}
                    minimumTrackTintColor={colors.brand}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.brand}
                  />
                  <View style={styles.ratioLabels}>
                    <Text style={styles.ratioHint}>0%</Text>
                    <Text style={styles.ratioHint}>{t("categories.deductible")}: {formatMAD(parseFloat(amount || "0") * proRatio)}</Text>
                    <Text style={styles.ratioHint}>100%</Text>
                  </View>
                </View>
              )}
              {amount && parseFloat(amount) > 0 ? (
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: colors.success, shadowColor: colors.success }]}
                  onPress={handleSave}
                >
                  <Text style={styles.primaryBtnText}>{t("save")} ✓</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: amount && parseFloat(amount) > 0 ? accent : colors.borderStrong,
                      shadowColor: amount && parseFloat(amount) > 0 ? accent : "transparent",
                    },
                  ]}
                  onPress={handleAmountConfirm}
                  disabled={!amount || parseFloat(amount) <= 0}
                >
                  <Text style={styles.primaryBtnText}>{t("continue")}</Text>
                </Pressable>
              )}
            </View>
            
          )}

          {amount && parseFloat(amount) > 0 && step === "date" && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>{t("addTransaction.amount")}</Text>
                <Text style={styles.summaryValueSmall}>
                  {formatMAD(parseFloat(amount))}
                </Text>
                <Pressable onPress={() => setStep("amount")}>
                  <Text style={styles.changeBtn}>{t("modify")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        
            {step === "date" && (
            <View style={styles.dateSection}>
              <Text style={styles.label}>{t("addTransaction.date")}</Text>
                <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateBtnText}>
                    {new Date(date).toLocaleDateString(langToLocale(currentLang), {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    })}
                </Text>
                </Pressable>

                <View style={styles.quickDates}>
                <QuickDate
                    label={t("today")} 
                    onPress={() => setDate(new Date().toISOString().split("T")[0])}
                />
                <QuickDate
                    label={t("yesterday")}
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
                style={[styles.primaryBtn, { backgroundColor: accent, shadowColor: accent }]}
                onPress={handleSave}
                >
                
                  <Text style={styles.primaryBtnText}>{t("save")}</Text>
                </Pressable>
            </View>
            )}
        </ScrollView>

      <CategoryPicker
        visible={pickerOpen}
        type={type}
        fiscalYear={fiscalYear}
        specialty={specialty}
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
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.quickDateBtn} onPress={onPress}>
      <Text style={styles.quickDateText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.md,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textOnDark,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: -0.3,
  },
  cancel: { color: colors.brand, fontSize: 15, fontWeight: "600" },

  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: spacing.lg,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderStrong,
  },
  stepDotActive: { backgroundColor: colors.brand, width: 28, borderRadius: 5 },
  stepDotDone: { backgroundColor: colors.success, width: 10 },
  stepLine: { width: 24, height: 2, backgroundColor: colors.border, borderRadius: 1 },

  body: { flex: 1, padding: spacing.lg },

  label: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand + "66",
    ...shadows.card,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  summaryValue: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  summaryValueSmall: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  changeBtn: { fontSize: 12, color: colors.brand, fontWeight: "700" },

  amountSection: { gap: spacing.md },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  amountInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  currency: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: "700",
    paddingBottom: 4,
  },

  dateSection: { gap: spacing.md },
  dateBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  dateBtnText: {
    fontSize: 19,
    color: colors.textPrimary,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  quickDates: { flexDirection: "row", gap: spacing.sm },
  quickDateBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDateText: { fontSize: 13, color: colors.brand, fontWeight: "600" },

  primaryBtn: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: radii.md,
    marginTop: spacing.sm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },

  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  suggestionRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionLabel: { fontSize: 11, color: colors.textTertiary, flexShrink: 0 },
  suggestionChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.brandSoft, borderRadius: radii.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.brand + "44",
  },
  suggestionChipText: { fontSize: 12, fontWeight: "600", color: colors.brand, flex: 1 },
  suggestionApply: { fontSize: 11, fontWeight: "700", color: colors.success },
  ratioSection: {
  marginTop: spacing.md,
  backgroundColor: colors.surfaceAlt,
  borderRadius: radii.md,
  padding: spacing.md,
},
ratioHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
},
ratioLabel: {
  ...typography.caption,
  color: colors.textSecondary,
  fontWeight: "600",
},
ratioValue: {
  fontSize: 18,
  fontWeight: "700",
  color: colors.brand,
},
ratioLabels: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
ratioHint: {
  fontSize: 10,
  color: colors.textTertiary,
},

  // ── Charge description-first category step ───────────────────────────────
  chargeDescSection: {
    gap: spacing.md,
  },
  chargeDescInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 17,
    color: colors.textPrimary,
    ...shadows.card,
  },
  suggestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.brand + "44",
  },
  suggestCardBody: {
    flex: 1,
  },
  suggestCardHint: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  suggestCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  suggestCardApply: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
  },
  noMatchRow: {
    paddingVertical: spacing.sm,
  },
  noMatchText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  browseCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  browseCatBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.brand,
  },

});
