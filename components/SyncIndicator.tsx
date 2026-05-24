import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SyncStatus } from "../lib/syncService";
import { Icon } from "../lib/icons";
import { spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatTime } from "../lib/format";
import { useT } from "../lib/useT";

interface Props {
  saving: boolean;
  lastSavedAt: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  isAuthenticated: boolean;
}

export function SyncIndicator({
  saving,
  lastSavedAt,
  syncStatus,
  lastSyncedAt,
  isAuthenticated,
}: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  if (syncStatus === "syncing") {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.brand} />
        <Text style={styles.text}>{t("sync.syncing")}</Text>
      </View>
    );
  }

  if (saving) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
        <Text style={styles.text}>{t("sync.saving")}</Text>
      </View>
    );
  }

  if (syncStatus === "offline") {
    return (
      <View style={styles.row}>
        <Icon name="offline" size={14} color={colors.warning} />
        <Text style={[styles.text, { color: colors.warning }]}>{t("sync.offline")}</Text>
      </View>
    );
  }

  if (syncStatus === "error") {
    return (
      <View style={styles.row}>
        <Icon name="syncError" size={14} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>{t("sync.syncError")}</Text>
      </View>
    );
  }

  if (isAuthenticated && syncStatus === "synced" && lastSyncedAt) {
    return (
      <View style={styles.row}>
        <Icon name="syncDone" size={14} color={colors.success} />
        <Text style={styles.text}>{t("sync.synced")} · {formatTime(lastSyncedAt)}</Text>
      </View>
    );
  }

  if (lastSavedAt) {
    return (
      <View style={styles.row}>
        <Icon name="check" size={12} color={colors.textTertiary} />
        <Text style={styles.text}>
          {isAuthenticated ? t("sync.saved") : t("sync.local")} · {formatTime(lastSavedAt)}
        </Text>
      </View>
    );
  }

  return null;
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingBottom: 4,
  },
  text: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});