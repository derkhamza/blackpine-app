import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../lib/theme";

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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.brand} />
        <Text style={styles.loadingText}>Analyse du reçu en cours…</Text>
      </View>
    );
  }

  if (!bestAmount && !bestDate) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Aucune donnée extraite</Text>
        <Text style={styles.errorText}>
          La photo n'a pas permis d'extraire un montant ou une date. Vous pouvez les saisir manuellement.
        </Text>
        <Pressable style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>Fermer</Text>
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

  const confidenceLabel =
    confidence > 70 ? "Bonne" : confidence > 40 ? "Moyenne" : "Faible";
  const confidenceColor =
    confidence > 70 ? colors.success : confidence > 40 ? colors.warning : colors.danger;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Données extraites</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
          <Text style={styles.confidenceText}>Fiabilité: {confidenceLabel}</Text>
        </View>
      </View>

      {bestAmount !== null && !amountAccepted && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Montant détecté</Text>
          <Text style={styles.resultValue}>
            {bestAmount.toLocaleString("fr-FR")} MAD
          </Text>
          {amounts.length > 1 && (
            <Text style={styles.altText}>
              Autres montants: {amounts.slice(1, 4).map((a) => a.toLocaleString("fr-FR")).join(", ")}
            </Text>
          )}
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              onAcceptAmount(bestAmount);
              setAmountAccepted(true);
            }}
          >
            <Text style={styles.acceptBtnText}>Utiliser ce montant</Text>
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
          <Text style={styles.resultLabel}>Date détectée</Text>
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
            <Text style={styles.acceptBtnText}>Utiliser cette date</Text>
          </Pressable>
        </View>
      )}

      {dateAccepted && bestAmount !== null && !amountAccepted && (
        <View style={styles.acceptedNote}>
          <Text style={styles.acceptedText}>✓ Date appliquée</Text>
        </View>
      )}

      <Pressable style={styles.dismissBtn} onPress={onDismiss}>
        <Text style={styles.dismissText}>Ignorer et saisir manuellement</Text>
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