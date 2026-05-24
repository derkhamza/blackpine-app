import { useState, useMemo} from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import { exportLiasseFiscale } from "../lib/exportFilings";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

export function FilingsSection() {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { profile, result, transactions, fiscalYear, assets } = useApp();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportLiasseFiscale(profile, result, transactions, assets, fiscalYear);
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

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  title: { ...typography.micro, color: colors.brand, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  subtitle: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md },
  filingBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.brand,
    borderRadius: radii.md, padding: spacing.md, gap: spacing.md,
  },
  textGroup: { flex: 1 },
  filingTitle: { fontSize: 14, fontWeight: "600", color: colors.textOnDark },
  filingDesc: { fontSize: 12, color: colors.textOnDarkMuted, marginTop: 2 },
});