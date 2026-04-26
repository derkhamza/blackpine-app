import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import { exportLiasseFiscale } from "../lib/exportFilings";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

export function FilingsSection() {
  const { t } = useT();
  const { profile, result, transactions, fiscalYear } = useApp();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportLiasseFiscale(profile, result, transactions, fiscalYear);
    } catch (err: any) {
      Alert.alert(t("error"), err?.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("filings.title")}</Text>
      <Text style={styles.subtitle}>{t("filings.subtitle")}</Text>
      <Pressable style={styles.filingBtn} onPress={handleExport} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textOnDark} />
        ) : (
          <Icon name="pdf" size={24} color={colors.textOnDark} />
        )}
        <View style={styles.textGroup}>
          <Text style={styles.filingTitle}>{t("filings.liasseTitle")}</Text>
          <Text style={styles.filingDesc}>{t("filings.liasseDesc")}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface, borderRadius: radii.md,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.card,
  },
  title: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 4 },
  subtitle: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md },
  filingBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.brand,
    borderRadius: radii.sm, padding: spacing.md, gap: spacing.md,
  },
  textGroup: { flex: 1 },
  filingTitle: { fontSize: 14, fontWeight: "600", color: colors.textOnDark },
  filingDesc: { fontSize: 12, color: colors.textOnDarkMuted, marginTop: 2 },
});