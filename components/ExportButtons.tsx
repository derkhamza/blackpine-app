import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useApp } from "../lib/AppContext";
import { generateTaxSummaryPdf } from "../lib/exportPdf";
import { generateTransactionsExcel } from "../lib/exportExcel";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { Icon } from "../lib/icons";
import { useT } from "../lib/useT";



export function ExportButtons() {
  const { t } = useT();
  const { result, profile, transactions } = useApp();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePdf = async () => {
    setExportingPdf(true);
    try {
      await generateTaxSummaryPdf(result, profile);
    } catch (err: any) {
      console.error("PDF export failed:", err);
      Alert.alert("Erreur", "Impossible de générer le PDF: " + (err?.message || "erreur inconnue"));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExcel = async () => {
    setExportingExcel(true);
    try {
      await generateTransactionsExcel(transactions);
    } catch (err: any) {
      console.error("Excel export failed:", err);
      Alert.alert("Erreur", "Impossible de générer le fichier Excel: " + (err?.message || "erreur inconnue"));
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <View style={styles.container}>
     <Text style={styles.title}>{t("export.title")}</Text>
      <Text style={styles.subtitle}>{t("export.subtitle")}</Text>

      <Pressable
        style={styles.exportBtn}
        onPress={handlePdf}
        disabled={exportingPdf}
      >
        {exportingPdf ? (
          <ActivityIndicator size="small" color={colors.textOnDark} />
        ) : (
          <Icon name="pdf" size={24} color={colors.textOnDark} />
        )}
        <View style={styles.exportTextGroup}>
          <Text style={styles.exportBtnTitle}>{t("export.pdfTitle")}</Text>
          <Text style={styles.exportBtnDesc}>{t("export.pdfDesc")}</Text>
        </View>
      </Pressable>

      <Pressable
        style={styles.exportBtn}
        onPress={handleExcel}
        disabled={exportingExcel}
      >
        {exportingExcel ? (
          <ActivityIndicator size="small" color={colors.textOnDark} />
        ) : (
          <Icon name="excel" size={24} color={colors.textOnDark} />
        )}
        <View style={styles.exportTextGroup}>
          <Text style={styles.exportBtnTitle}>{t("export.excelTitle")}</Text>
          <Text style={styles.exportBtnDesc}>{t("export.excelDesc")}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  title: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  exportTextGroup: { flex: 1 },
  exportBtnTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textOnDark,
  },
  exportBtnDesc: {
    fontSize: 12,
    color: colors.textOnDarkMuted,
    marginTop: 2,
  },
});