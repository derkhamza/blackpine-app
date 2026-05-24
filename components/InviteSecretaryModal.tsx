import React, { useState, useMemo } from "react";
import {
  ActivityIndicator, Alert, Linking, Modal, Pressable,
  Share, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCabinet } from "../lib/CabinetContext";
import { useApp } from "../lib/AppContext";
import { createInviteCode, pushCabinetSnapshot, revokeInvite } from "../lib/inviteApi";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  t: (k: string) => string;
}

export function InviteSecretaryModal({ visible, onClose, t }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { doctorProfile, appointments, patients } = useCabinet();
  const { } = useApp();

  const [code, setCode]       = useState<string | null>(null);
  const [expiresAt, setExp]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoke] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const doctorDisplayName = doctorProfile.fullName
    ? `Dr. ${doctorProfile.fullName}`
    : "Cabinet médical";

  const handleCreate = async () => {
    setLoading(true);
    try {
      // First push cabinet snapshot so the secretary can pull data immediately
      setSyncing(true);
      await pushCabinetSnapshot({ appointments, patients, doctorProfile });
      setSyncing(false);

      const result = await createInviteCode();
      setCode(result.code);
      setExp(result.expiresAt);
    } catch (err: any) {
      setSyncing(false);
      Alert.alert(t("error"), err.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!code) return;
    const message =
      `Bonjour,\n\n` +
      `Vous avez été invité(e) à accéder à l'agenda du ${doctorDisplayName} via BLACKPINE Cabinet.\n\n` +
      `Votre code d'accès : *${code}*\n\n` +
      `1. Téléchargez l'app BLACKPINE Cabinet\n` +
      `2. Sur l'écran de connexion, appuyez sur "J'ai un code d'accès"\n` +
      `3. Entrez le code ci-dessus\n\n` +
      `Ce code expire dans 48 heures.`;

    try {
      await Share.share({ message });
    } catch {}
  };

  const handleWhatsApp = async () => {
    if (!code) return;
    const text =
      `Bonjour, voici votre accès BLACKPINE Cabinet.\n\n` +
      `Code d'accès secrétaire : *${code}*\n` +
      `Durée de validité : 48h\n\n` +
      `Téléchargez l'app et appuyez sur "J'ai un code d'accès".`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("WhatsApp", "WhatsApp n'est pas installé. Utilisez le bouton Partager.");
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      t("secretary.revokeTitle"),
      t("secretary.revokeConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("secretary.revokeBtn"),
          style: "destructive",
          onPress: async () => {
            setRevoke(true);
            try {
              await revokeInvite();
              setCode(null);
              setExp(null);
              Alert.alert("✓", t("secretary.revokeSuccess"));
            } catch (err: any) {
              Alert.alert(t("error"), err.message);
            } finally {
              setRevoke(false);
            }
          },
        },
      ],
    );
  };

  const formatExpiry = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="users" size={18} color={colors.brand} />
              <Text style={styles.title}>{t("secretary.inviteTitle")}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Icon name="info" size={16} color={colors.brand} />
            <Text style={styles.infoText}>{t("secretary.inviteInfo")}</Text>
          </View>

          {/* Permissions list */}
          <View style={styles.permBox}>
            <Text style={styles.permTitle}>{t("secretary.permissionsTitle")}</Text>
            {[
              { icon: "✅", label: t("secretary.permAgenda") },
              { icon: "✅", label: t("secretary.permPatients") },
              { icon: "✅", label: t("secretary.permAddAppt") },
              { icon: "❌", label: t("secretary.permNoFinances") },
              { icon: "❌", label: t("secretary.permNoMedical") },
              { icon: "❌", label: t("secretary.permNoPayroll") },
            ].map((p, i) => (
              <View key={i} style={styles.permRow}>
                <Text style={styles.permIcon}>{p.icon}</Text>
                <Text style={styles.permLabel}>{p.label}</Text>
              </View>
            ))}
          </View>

          {/* Code display or generate button */}
          {code ? (
            <>
              <View style={styles.codeCard}>
                <Text style={styles.codeHint}>{t("secretary.codeLabel")}</Text>
                <Text style={styles.codeText}>{code}</Text>
                {expiresAt && (
                  <Text style={styles.codeExpiry}>
                    {t("secretary.codeExpires")} {formatExpiry(expiresAt)}
                  </Text>
                )}
              </View>

              <View style={styles.shareRow}>
                <Pressable style={styles.shareBtn} onPress={handleShare}>
                  <Icon name="share" size={16} color={colors.brand} />
                  <Text style={styles.shareBtnText}>{t("secretary.share")}</Text>
                </Pressable>
                <Pressable style={[styles.shareBtn, styles.whatsappBtn]} onPress={handleWhatsApp}>
                  <Text style={styles.whatsappIcon}>💬</Text>
                  <Text style={[styles.shareBtnText, { color: "#25D366" }]}>WhatsApp</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.revokeBtn, revoking && { opacity: 0.5 }]}
                onPress={handleRevoke}
                disabled={revoking}
              >
                {revoking
                  ? <ActivityIndicator size="small" color={colors.danger} />
                  : <Text style={styles.revokeBtnText}>{t("secretary.revokeBtn")}</Text>}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.generateBtn, loading && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textOnDark} />
              ) : (
                <Icon name="add" size={18} color={colors.textOnDark} />
              )}
              <Text style={styles.generateBtnText}>
                {syncing ? t("secretary.syncing") : t("secretary.generateCode")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.surfaceDark + "40" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: 10, marginBottom: spacing.md },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },

  infoBox: {
    flexDirection: "row", gap: spacing.sm, alignItems: "flex-start",
    backgroundColor: colors.brandSoft, borderRadius: radii.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  infoText: { fontSize: 12, color: colors.brand, flex: 1, lineHeight: 18 },

  permBox: {
    backgroundColor: colors.bg, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  permTitle: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: spacing.sm },
  permRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 3 },
  permIcon: { fontSize: 13 },
  permLabel: { fontSize: 13, color: colors.textPrimary },

  codeCard: {
    backgroundColor: colors.surfaceDark, borderRadius: radii.lg,
    alignItems: "center", paddingVertical: spacing.lg,
    marginBottom: spacing.md, ...shadows.hero,
  },
  codeHint: { fontSize: 10, color: colors.textOnDarkMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  codeText: { fontSize: 38, fontWeight: "900", letterSpacing: 10, color: colors.textOnDark },
  codeExpiry: { fontSize: 10, color: colors.textOnDarkMuted, marginTop: 8 },

  shareRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  shareBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brandSoft, borderRadius: radii.md, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.brand + "44",
  },
  shareBtnText: { fontSize: 13, fontWeight: "700", color: colors.brand },
  whatsappBtn: { backgroundColor: colors.successSoft, borderColor: "#25D366" + "44" },
  whatsappIcon: { fontSize: 16 },

  revokeBtn: {
    paddingVertical: 12, alignItems: "center",
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.danger,
    backgroundColor: colors.dangerSoft, marginBottom: spacing.sm,
  },
  revokeBtnText: { fontSize: 13, fontWeight: "600", color: colors.danger },

  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.brand,
    borderRadius: radii.lg, paddingVertical: 16,
    marginBottom: spacing.sm, ...shadows.hero,
  },
  generateBtnText: { fontSize: 15, fontWeight: "700", color: colors.textOnDark },
});
