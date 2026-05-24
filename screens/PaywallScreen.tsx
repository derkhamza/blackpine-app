import { useState, useMemo } from "react";
import {
  Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { Icon } from "../lib/icons";
import { PRICING } from "../lib/subscription";
import { buildWhatsAppUrl } from "../lib/constants";
import { SafeScreen } from "../components/SafeScreen";

export function PaywallScreen() {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { activateCode, onLogout } = useApp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | "lifetime">("yearly");

  const handleActivate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const success = await activateCode(code.trim());
    setLoading(false);
    if (success) {
      Alert.alert(t("paywall.activated"), t("paywall.activatedMsg"));
    } else {
      Alert.alert(t("error"), t("paywall.invalidCode"));
    }
  };

  const handleContact = () => {
    Linking.openURL(buildWhatsAppUrl("Bonjour, je souhaite m'abonner à Blackpine Cabinet."));
  };

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dark hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Icon name="stethoscope" size={22} color={colors.textOnDark} />
          </View>
          <Text style={styles.brand}>BLACKPINE</Text>
          <Text style={styles.brandSub}>CABINET</Text>
          <View style={styles.expiredBadge}>
            <Icon name="clock" size={12} color={colors.warning} />
            <Text style={styles.expiredBadgeText}>{t("paywall.trialEnded")}</Text>
          </View>
          <Text style={styles.heroSub}>{t("paywall.trialEndedMsg")}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t("paywall.choosePlan")}</Text>

        {(["monthly", "yearly", "lifetime"] as const).map((plan) => {
          const active = selectedPlan === plan;
          return (
            <Pressable
              key={plan}
              style={[styles.planCard, active && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan)}
            >
              <View style={styles.planHeader}>
                <View style={styles.planLeft}>
                  <View style={[styles.planRadio, active && styles.planRadioActive]}>
                    {active && <View style={styles.planRadioDot} />}
                  </View>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.planName, active && styles.planNameActive]}>
                        {t(`paywall.${plan}`)}
                      </Text>
                      {plan === "yearly" && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>-{PRICING.yearly.savings}</Text>
                        </View>
                      )}
                    </View>
                    {plan === "yearly" && (
                      <Text style={styles.planDetail}>{Math.round(PRICING.yearly.price / 12)} MAD/{t("paywall.perMonth")}</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                  {PRICING[plan].label}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable style={styles.subscribeBtn} onPress={handleContact}>
          <Icon name="zap" size={18} color={colors.textOnDark} />
          <Text style={styles.subscribeBtnText}>{t("paywall.subscribe")}</Text>
        </Pressable>
        <Text style={styles.contactHint}>{t("paywall.contactHint")}</Text>

        <View style={styles.codeSection}>
          <Text style={styles.codeSectionTitle}>{t("paywall.haveCode")}</Text>
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
              <Text style={styles.codeBtnText}>{loading ? "..." : t("paywall.activate")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>{t("paywall.included")}</Text>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.featureRow}>
              <Icon name="checkCircle" size={14} color={colors.success} />
              <Text style={styles.featureText}>{t(`paywall.feature${i}`)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.paymentMethods}>
          <Text style={styles.paymentTitle}>{t("paywall.paymentMethods")}</Text>
          <Text style={styles.paymentItem}>• Virement bancaire</Text>
          <Text style={styles.paymentItem}>• CashPlus / Wafacash</Text>
          <Text style={styles.paymentItem}>• Wave / PayPal</Text>
          <Text style={styles.paymentHint}>{t("paywall.paymentHint")}</Text>
        </View>

        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>{t("paywall.switchAccount")}</Text>
        </Pressable>
      </ScrollView>
    </SafeScreen>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 48 },

  // Hero section
  hero: {
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  brand: { fontSize: 20, fontWeight: "800", letterSpacing: 5, color: "rgba(255,255,255,0.95)" },
  brandSub: { fontSize: 9, letterSpacing: 4, color: colors.gold, marginTop: 2 },
  expiredBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    marginTop: spacing.lg,
    borderWidth: 1, borderColor: colors.warning + "55",
  },
  expiredBadgeText: { fontSize: 12, fontWeight: "700", color: colors.warning },
  heroSub: {
    fontSize: 13, color: "rgba(255,255,255,0.60)",
    textAlign: "center", marginTop: spacing.sm, lineHeight: 20,
    paddingHorizontal: spacing.md,
  },

  sectionTitle: {
    ...typography.micro, color: colors.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: spacing.md, marginHorizontal: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg, padding: spacing.md,
    marginBottom: spacing.sm, marginHorizontal: spacing.lg,
    borderWidth: 2, borderColor: colors.border,
    ...shadows.card,
  },
  planCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    shadowColor: colors.brand,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  planRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  planRadioActive: { borderColor: colors.brand },
  planRadioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.brand,
  },
  planName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  planNameActive: { color: colors.brand },
  planPrice: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.3 },
  planPriceActive: { color: colors.brand },
  planDetail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  savingsBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radii.pill,
  },
  savingsText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  subscribeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 17,
    backgroundColor: colors.brand, borderRadius: radii.lg,
    marginTop: spacing.lg, marginHorizontal: spacing.lg,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12,
    elevation: 6,
  },
  subscribeBtnText: { color: colors.textOnDark, fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },
  contactHint: {
    fontSize: 11, color: colors.textTertiary,
    textAlign: "center", marginTop: spacing.sm,
    marginBottom: spacing.lg, paddingHorizontal: spacing.lg,
  },
  codeSection: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.md, marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  codeSectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
  codeRow: { flexDirection: "row", gap: spacing.sm },
  codeInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: colors.textPrimary, backgroundColor: colors.bg,
    letterSpacing: 3, fontWeight: "700",
  },
  codeBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    backgroundColor: colors.brand, borderRadius: radii.md,
    justifyContent: "center",
  },
  codeBtnDisabled: { backgroundColor: colors.borderStrong },
  codeBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 14 },
  featuresCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.md, marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  featuresTitle: {
    fontSize: 11, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  featureText: { fontSize: 13, color: colors.textPrimary, flex: 1 },
  paymentMethods: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.md, marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  paymentTitle: {
    fontSize: 11, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  paymentItem: { fontSize: 13, color: colors.textPrimary, paddingVertical: 4 },
  paymentHint: { fontSize: 11, color: colors.textTertiary, fontStyle: "italic", marginTop: spacing.sm },
  logoutBtn: { paddingVertical: spacing.md, alignItems: "center", marginHorizontal: spacing.lg },
  logoutText: { fontSize: 13, color: colors.textSecondary },
});