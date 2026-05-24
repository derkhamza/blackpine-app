import { useState, useMemo } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { PRICING } from "../lib/subscription";
import { buildWhatsAppUrl } from "../lib/constants";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { Icon } from "../lib/icons";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ visible, onClose }: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { trialDaysLeft, activateCode } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | "lifetime">("yearly");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const isUrgent = trialDaysLeft <= 7;

  const handleContact = () => {
    const planLabel = selectedPlan === "monthly" ? PRICING.monthly.label
      : selectedPlan === "yearly" ? PRICING.yearly.label
      : PRICING.lifetime.label;
    Linking.openURL(buildWhatsAppUrl(`Bonjour, je souhaite m'abonner à Blackpine Cabinet — formule ${planLabel}.`));
  };

  const handleActivate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const success = await activateCode(code.trim());
    setLoading(false);
    if (success) {
      Alert.alert(t("paywall.activated"), t("paywall.activatedMsg"));
      onClose();
    } else {
      Alert.alert(t("error"), t("paywall.invalidCode"));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>BLACKPINE</Text>
            <Text style={styles.brandSub}>CABINET</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Trial status pill */}
        {trialDaysLeft > 0 && (
          <View style={[styles.trialPill, isUrgent && styles.trialPillUrgent]}>
            <Icon name="clock" size={13} color={isUrgent ? colors.danger : colors.warning} />
            <Text style={[styles.trialPillText, isUrgent && { color: colors.danger }]}>
              {t("paywall.trialBanner")} · {trialDaysLeft} {t("paywall.trialDaysLeft")}
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.choosePlan}>{t("paywall.choosePlan")}</Text>

          {(["monthly", "yearly", "lifetime"] as const).map((plan) => (
            <Pressable
              key={plan}
              style={[styles.planCard, selectedPlan === plan && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan)}
            >
              <View style={styles.planRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.radio, selectedPlan === plan && styles.radioActive]}>
                    {selectedPlan === plan && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.planName, selectedPlan === plan && styles.planNameActive]}>
                    {t(`paywall.${plan}`)}
                  </Text>
                  {plan === "yearly" && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>-{PRICING.yearly.savings}</Text>
                    </View>
                  )}
                  {plan === "lifetime" && (
                    <View style={[styles.savingsBadge, { backgroundColor: colors.gold }]}>
                      <Text style={styles.savingsText}>♾</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.planPrice, selectedPlan === plan && styles.planPriceActive]}>
                  {PRICING[plan].label}
                </Text>
              </View>
              {plan === "yearly" && (
                <Text style={styles.planDetail}>
                  soit {Math.round(PRICING.yearly.price / 12)} MAD/{t("paywall.perMonth")}
                </Text>
              )}
            </Pressable>
          ))}

          {/* Subscribe CTA */}
          <Pressable style={styles.subscribeBtn} onPress={handleContact}>
            <Icon name="zap" size={16} color="#fff" />
            <Text style={styles.subscribeBtnText}>{t("paywall.subscribe")}</Text>
          </Pressable>
          <Text style={styles.hint}>{t("paywall.contactHint")}</Text>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Activation code */}
          <Text style={styles.codeLabel}>{t("paywall.haveCode")}</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder={t("paywall.codePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.codeBtn, (!code.trim() || loading) && styles.codeBtnDisabled]}
              onPress={handleActivate}
              disabled={!code.trim() || loading}
            >
              <Text style={styles.codeBtnText}>{loading ? "…" : t("paywall.activate")}</Text>
            </Pressable>
          </View>

          {/* Features list */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>{t("paywall.included")}</Text>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.featureRow}>
                <Icon name="checkCircle" size={13} color={colors.success} />
                <Text style={styles.featureText}>{t(`paywall.feature${i}`)}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginTop: 12, marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  headerLeft: { gap: 1 },
  brand: {
    fontSize: 16, fontWeight: "800",
    letterSpacing: 3, color: colors.brand,
  },
  brandSub: {
    fontSize: 8, letterSpacing: 2,
    color: colors.gold, fontWeight: "700",
  },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  trialPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  trialPillUrgent: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  trialPillText: {
    fontSize: 12, fontWeight: "700", color: colors.warning,
  },
  choosePlan: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  planCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  planCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand },
  radioDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.brand,
  },
  planName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  planNameActive: { color: colors.brand },
  planPrice: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.3 },
  planPriceActive: { color: colors.brand },
  planDetail: { fontSize: 11, color: colors.textSecondary, marginTop: 4, marginLeft: 26 },
  savingsBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radii.pill,
  },
  savingsText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  subscribeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16,
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12,
    elevation: 6,
  },
  subscribeBtnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
  hint: {
    fontSize: 11, color: colors.textTertiary,
    textAlign: "center", marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  divider: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textTertiary, fontWeight: "600" },
  codeLabel: {
    fontSize: 13, fontWeight: "600",
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  codeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  codeInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: colors.textPrimary, backgroundColor: colors.bg,
    letterSpacing: 2, fontWeight: "600",
  },
  codeBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: colors.brand, borderRadius: radii.sm, justifyContent: "center",
  },
  codeBtnDisabled: { backgroundColor: colors.borderStrong },
  codeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  featuresCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: {
    fontSize: 12, fontWeight: "600",
    color: colors.textSecondary, marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: "row", alignItems: "center",
    gap: 8, paddingVertical: 3,
  },
  featureText: { fontSize: 13, color: colors.textPrimary, flex: 1 },
});
