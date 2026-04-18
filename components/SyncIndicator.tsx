import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SyncStatus } from "../lib/syncService";
import { colors, spacing } from "../lib/theme";
import { formatTime } from "../lib/format";

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
  // Priority: syncing > saving > synced/saved
  if (syncStatus === "syncing") {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.brand} />
        <Text style={styles.text}>Synchronisation…</Text>
      </View>
    );
  }

  if (saving) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
        <Text style={styles.text}>Sauvegarde…</Text>
      </View>
    );
  }

  if (syncStatus === "error") {
    return (
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text style={[styles.text, { color: colors.danger }]}>Erreur de sync</Text>
      </View>
    );
  }

  if (isAuthenticated && syncStatus === "synced" && lastSyncedAt) {
    return (
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text style={styles.text}>Synchronisé · {formatTime(lastSyncedAt)}</Text>
      </View>
    );
  }

  if (lastSavedAt) {
    return (
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: isAuthenticated ? colors.success : colors.textTertiary }]} />
        <Text style={styles.text}>
          {isAuthenticated ? "Sauvegardé" : "Local"} · {formatTime(lastSavedAt)}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});