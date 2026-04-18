import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SyncStatus } from "../lib/syncService";
import { Icon } from "../lib/icons";
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
  if (syncStatus === "syncing") {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.brand} />
        <Text style={styles.text}>Sync…</Text>
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
        <Icon name="syncError" size={14} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>Erreur sync</Text>
      </View>
    );
  }

  if (isAuthenticated && syncStatus === "synced" && lastSyncedAt) {
    return (
      <View style={styles.row}>
        <Icon name="syncDone" size={14} color={colors.success} />
        <Text style={styles.text}>Sync · {formatTime(lastSyncedAt)}</Text>
      </View>
    );
  }

  if (lastSavedAt) {
    return (
      <View style={styles.row}>
        <Icon name="check" size={12} color={colors.textTertiary} />
        <Text style={styles.text}>
          {isAuthenticated ? "Sauvé" : "Local"} · {formatTime(lastSavedAt)}
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
    gap: 5,
    paddingBottom: 4,
  },
  text: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});