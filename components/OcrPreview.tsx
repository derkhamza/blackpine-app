import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../lib/theme";
import { useT } from "../lib/useT";

interface Props {
  loading: boolean;
  amounts: number[];
  dates: string[];
  bestAmount: number | null;
  bestDate: string | null;
  confidence: number;
  onAcceptAmount: (amount: number) => void;
  onAcceptDate: (date: string) => void;
  onDismiss: () => void;
}

export function OcrPreview({
  loading,
  amounts,
  dates,
  bestAmount,
  bestDate,
  confidence,
  onAcceptAmount,
  onAcceptDate,
  onDismiss,
}: Props) {
  const [amountAccepted, setAmountAccepted] = useState(false);
  const [dateAccepted, setDateAccepted] = useState(false);
  const { t } = useT();
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.brand} />
        <Text style={styles.loadingText}>{t("ocr.analyzing")}</Text>
      </View>
    );
  }

  if (!bestAmount && !bestDate) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>{t("ocr.noData")}</Text>
        <Text style={styles.errorText}>{t("ocr.noDataDetail")}</Text>
        <Pressable style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>{t("close")}</Text>
        </Pressable>
      </View>
    );
  }

  // Auto-dismiss if both have been accepted
  const allDone =
    (bestAmount === null || amountAccepted) &&
    (bestDate === null || dateAccepted);

  if (allDone) {
    return null;
  }

  const confidenceLabel = confidence > 70 ? t("ocr.good") : confidence > 40 ? t("ocr.medium") : t("ocr.low");
  const confidenceColor =
    confidence > 70 ? colors.success : confidence > 40 ? colors.warning : colors.danger;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("ocr.extractedData")}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
          <Text style={styles.confidenceText}>{t("ocr.reliability")}: {confidenceLabel}</Text>
        </View>
      </View>

      {bestAmount !== null && !amountAccepted && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{t("ocr.detectedAmount")}</Text>
          <Text style={styles.resultValue}>
            {bestAmount.toLocaleString("fr-FR")} MAD
          </Text>
          {amounts.length > 1 && (
            <Text style={styles.altText}>{t("ocr.otherAmounts")}: {amounts.slice(1, 4).map((a) => a.toLocaleString("fr-FR")).join(", ")}
            </Text>
          )}
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              onAcceptAmount(bestAmount);
              setAmountAccepted(true);
            }}
          >
            <Text style={styles.acceptBtnText}>{t("ocr.useAmount")}</Text>
          </Pressable>
        </View>
      )}

      {amountAccepted && bestDate !== null && !dateAccepted && (
        <View style={styles.acceptedNote}>
          <Text style={styles.acceptedText}>✓ Montant appliqué</Text>
        </View>
      )}

      {bestDate !== null && !dateAccepted && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{t("ocr.detectedDate")}</Text>
          <Text style={styles.resultValue}>
            {new Date(bestDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              onAcceptDate(bestDate);
              setDateAccepted(true);
            }}
          >
            <Text style={styles.acceptBtnText}>{t("ocr.useDate")}</Text>
          </Pressable>
        </View>
      )}

      {dateAccepted && bestAmount !== null && !amountAccepted && (
        <View style={styles.acceptedNote}>
          <Text style={styles.acceptedText}>{t("ocr.dateApplied")}</Text>
        </View>
      )}

      <Pressable style={styles.dismissBtn} onPress={onDismiss}>
        <Text style={styles.dismissText}>{t("ocr.ignoreManual")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.brand },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  confidenceText: { fontSize: 10, fontWeight: "600", color: colors.textOnDark },
  loadingText: {
    ...typography.caption,
    color: colors.brand,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  errorTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
  errorText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  resultValue: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  altText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  acceptBtn: {
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.sm,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "600", color: colors.textOnDark },
  acceptedNote: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  acceptedText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "600",
  },
  dismissBtn: { paddingVertical: 10, alignItems: "center" },
  dismissText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
});