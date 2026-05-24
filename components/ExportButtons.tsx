import { useState, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useApp } from "../lib/AppContext";
import { useCabinet } from "../lib/CabinetContext";
import { generateTaxSummaryPdf, generateAccountantBilanPdf, generateLiasseFiscalePdf } from "../lib/exportPdf";
import { generateTransactionsExcel } from "../lib/exportExcel";
import { buildAccountantMessage, shareToAccountantWhatsApp } from "../lib/whatsappShare";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { Icon } from "../lib/icons";
import { useT } from "../lib/useT";



export function ExportButtons() {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { result, profile, transactions, fiscalYear } = useApp();
  const { doctorProfile } = useCabinet();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingBilan, setExportingBilan] = useState(false);
  const [exportingLiasse, setExportingLiasse] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const handlePdf = async () => {
    setExportingPdf(true);
    try {
      await generateTaxSummaryPdf(result, profile, fiscalYear);
    } catch (err: any) {
      console.error("PDF export failed:", err);
      Alert.alert(t("error"), err?.message || t("error"));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleBilan = async () => {
    setExportingBilan(true);
    try {
      await generateAccountantBilanPdf(
        transactions.filter(tx => tx.date.startsWith(String(fiscalYear))),
        result,
        doctorProfile,
        fiscalYear,
      );
    } catch (err: any) {
      console.error("Bilan PDF failed:", err);
      Alert.alert(t("error"), err?.message || t("error"));
    } finally {
      setExportingBilan(false);
    }
  };

  const handleLiasse = async () => {
    setExportingLiasse(true);
    try {
      await generateLiasseFiscalePdf(
        transactions.filter(tx => tx.date.startsWith(String(fiscalYear))),
        result,
        profile,
        doctorProfile,
        fiscalYear,
      );
    } catch (err: any) {
      console.error("Liasse PDF failed:", err);
      Alert.alert(t("error"), err?.message || t("error"));
    } finally {
      setExportingLiasse(false);
    }
  };

  const handleExcel = async () => {
    setExportingExcel(true);
    try {
    await generateTransactionsExcel(
            transactions.filter((tx) => tx.date.startsWith(String(fiscalYear))),
            result,
            profile,
            fiscalYear
          );
    } catch (err: any) {
      console.error("Excel export failed:", err);
      Alert.alert(t("error"), err?.message || t("error"));
    } finally {
      setExportingExcel(false);
    }
  };

  const handleWhatsApp = async () => {
    setSharingWhatsApp(true);
    try {
      const message = buildAccountantMessage(result, doctorProfile);
      await shareToAccountantWhatsApp(
        doctorProfile.accountantPhone,
        message,
        {
          noPhone: t("export.whatsappNoPhone"),
          notInstalled: t("export.whatsappNotInstalled"),
          error: t("error"),
        },
      );
    } catch (err: any) {
      console.error("WhatsApp share failed:", err);
      Alert.alert(t("error"), err?.message || t("error"));
    } finally {
      setSharingWhatsApp(false);
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
        style={[styles.exportBtn, { backgroundColor: colors.warning }]}
        onPress={handleBilan}
        disabled={exportingBilan}
      >
        {exportingBilan ? (
          <ActivityIndicator size="small" color={colors.textOnDark} />
        ) : (
          <Icon name="receipt" size={24} color={colors.textOnDark} />
        )}
        <View style={styles.exportTextGroup}>
          <Text style={styles.exportBtnTitle}>{t("export.bilanTitle")}</Text>
          <Text style={styles.exportBtnDesc}>{t("export.bilanDesc")}</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.exportBtn, { backgroundColor: colors.success }]}
        onPress={handleLiasse}
        disabled={exportingLiasse}
      >
        {exportingLiasse ? (
          <ActivityIndicator size="small" color={colors.textOnDark} />
        ) : (
          <Icon name="fileCheck" size={24} color={colors.textOnDark} />
        )}
        <View style={styles.exportTextGroup}>
          <Text style={styles.exportBtnTitle}>{t("export.liasseTitle")}</Text>
          <Text style={styles.exportBtnDesc}>{t("export.liasseDesc")}</Text>
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

      <Pressable
        style={[styles.exportBtn, { backgroundColor: "#25D366" }]}
        onPress={handleWhatsApp}
        disabled={sharingWhatsApp}
      >
        {sharingWhatsApp ? (
          <ActivityIndicator size="small" color={colors.textOnDark} />
        ) : (
          <Icon name="messageCircle" size={24} color={colors.textOnDark} />
        )}
        <View style={styles.exportTextGroup}>
          <Text style={styles.exportBtnTitle}>{t("export.whatsappTitle")}</Text>
          <Text style={styles.exportBtnDesc}>{t("export.whatsappDesc")}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  title: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
    borderRadius: radii.md,
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