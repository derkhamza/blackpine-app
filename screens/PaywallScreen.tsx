import { useState } from "react";
import {
  Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { Icon } from "../lib/icons";
import { PRICING } from "../lib/subscription";
import { SafeScreen } from "../components/SafeScreen";

export function PaywallScreen() {
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
    Linking.openURL("https://wa.me/212697775201?text=Bonjour, je souhaite m'abonner à Blackpine Cabinet.");
  };

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.logoArea}>
          <Text style={styles.brand}>BLACKPINE</Text>
          <Text style={styles.brandSub}>CABINET</Text>
        </View>

        <View style={styles.expiredCard}>
          <Icon name="clock" size={24} color={colors.warning} />
          <Text style={styles.expiredTitle}>{t("paywall.trialEnded")}</Text>
          <Text style={styles.expiredText}>{t("paywall.trialEndedMsg")}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t("paywall.choosePlan")}</Text>

        {(["monthly", "yearly", "lifetime"] as const).map((plan) => (
          <Pressable
            key={plan}
            style={[styles.planCard, selectedPlan === plan && styles.planCardActive]}
            onPress={() => setSelectedPlan(plan)}
          >
            <View style={styles.planHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.planName, selectedPlan === plan && styles.planNameActive]}>
                  {t(`paywall.${plan}`)}
                </Text>
                {plan === "yearly" && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>-{PRICING.yearly.savings}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.planPrice, selectedPlan === plan && styles.planPriceActive]}>
                {PRICING[plan].label}
              </Text>
            </View>
            {plan === "yearly" && (
              <Text style={styles.planDetail}>{Math.round(PRICING.yearly.price / 12)} MAD/{t("paywall.perMonth")}</Text>
            )}
          </Pressable>
        ))}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  logoArea: { alignItems: "center", marginBottom: spacing.lg, marginTop: spacing.md },
  brand: { fontSize: 20, fontWeight: "800", letterSpacing: 4, color: colors.brand, marginTop: spacing.sm },
  brandSub: { fontSize: 10, letterSpacing: 3, color: colors.gold, marginTop: 2 },
  expiredCard: { backgroundColor: colors.warningSoft, borderRadius: radii.md, padding: spacing.lg, alignItems: "center", marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.warning },
  expiredTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginTop: spacing.sm },
  expiredText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },
  sectionTitle: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase", marginBottom: spacing.md },
  planCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 2, borderColor: colors.border },
  planCardActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  planNameActive: { color: colors.brand },
  planPrice: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  planPriceActive: { color: colors.brand },
  planDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  savingsBadge: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  savingsText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  subscribeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, backgroundColor: colors.brand, borderRadius: radii.md, marginTop: spacing.md, ...shadows.card },
  subscribeBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 16 },
  contactHint: { fontSize: 11, color: colors.textTertiary, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
  codeSection: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  codeSectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
  codeRow: { flexDirection: "row", gap: spacing.sm },
  codeInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.bg, letterSpacing: 2, fontWeight: "600" },
  codeBtn: { paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.brand, borderRadius: radii.sm, justifyContent: "center" },
  codeBtnDisabled: { backgroundColor: colors.borderStrong },
  codeBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 14 },
  featuresCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  featuresTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  featureText: { fontSize: 13, color: colors.textPrimary },
  paymentMethods: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  paymentTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
  paymentItem: { fontSize: 13, color: colors.textPrimary, paddingVertical: 3 },
  paymentHint: { fontSize: 11, color: colors.textTertiary, fontStyle: "italic", marginTop: spacing.sm },
  logoutBtn: { paddingVertical: spacing.md, alignItems: "center" },
  logoutText: { fontSize: 13, color: colors.textSecondary },
});