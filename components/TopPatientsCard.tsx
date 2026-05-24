import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Transaction } from "blackpine-engine";
import { Patient } from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD } from "../lib/format";
import { avatarColor } from "../lib/patientHelpers";
import { tapLight } from "../lib/haptics";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopEntry {
  name: string;
  total: number;
  count: number;
  patient?: Patient;
}

interface Props {
  transactions: Transaction[];
  patients: Patient[];
  onPress?: (patient: Patient) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TopPatientsCard({ transactions, patients, onPress }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);

  const topPatients = useMemo<TopEntry[]>(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of transactions) {
      if (tx.type !== "RECETTE" || tx.category !== "consultation" || !tx.description) continue;
      const name = tx.description;
      if (!map[name]) map[name] = { total: 0, count: 0 };
      map[name].total += tx.amount;
      map[name].count += 1;
    }
    return Object.entries(map)
      .map(([name, { total, count }]) => {
        const patient = patients.find(
          (p) => `${p.firstName} ${p.lastName}` === name
        );
        return { name, total, count, patient };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, patients]);

  if (topPatients.length === 0) return null;

  const maxTotal = topPatients[0]?.total ?? 1;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="users" size={13} color={colors.brand} />
          <Text style={styles.headerTitle}>Top patients · Consultations</Text>
        </View>
        <Text style={styles.headerSub}>{topPatients.length} patients</Text>
      </View>

      {/* Rows */}
      {topPatients.map((entry, i) => {
        const colorKey = entry.patient
          ? avatarColor(entry.patient.firstName + entry.patient.lastName)
          : avatarColor(entry.name);
        const initials = entry.name
          .split(" ")
          .map((w) => w[0] ?? "")
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const barPct = Math.round((entry.total / maxTotal) * 100);
        const isFirst = i === 0;

        return (
          <Pressable
            key={entry.name}
            style={({ pressed }) => [
              styles.row,
              i < topPatients.length - 1 && styles.rowBorder,
              pressed && !!entry.patient && !!onPress && { opacity: 0.72 },
            ]}
            onPress={
              entry.patient && onPress
                ? () => { tapLight(); onPress(entry.patient!); }
                : undefined
            }
            disabled={!entry.patient || !onPress}
          >
            {/* Rank badge */}
            <View style={[styles.rankBadge, isFirst && { backgroundColor: colors.gold + "22" }]}>
              <Text style={[styles.rankText, isFirst && { color: colors.gold }]}>
                {i + 1}
              </Text>
            </View>

            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: colorKey + "22" }]}>
              <Text style={[styles.avatarText, { color: colorKey }]}>{initials}</Text>
            </View>

            {/* Name + bar */}
            <View style={styles.nameCol}>
              <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barPct}%` as `${number}%`,
                      backgroundColor: isFirst ? colors.brand : colorKey,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Amount + count */}
            <View style={styles.amountCol}>
              <Text style={[styles.amount, isFirst && { color: colors.brand }]}>
                {formatMAD(entry.total)}
              </Text>
              <Text style={styles.count}>
                {entry.count} séance{entry.count > 1 ? "s" : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
      ...shadows.card,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.brandSoft,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.brand,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    headerSub: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: "600",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      gap: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    rankBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    rankText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.textTertiary,
    },

    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 12,
      fontWeight: "800",
    },

    nameCol: {
      flex: 1,
      gap: 4,
    },
    name: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    barTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 2,
    },

    amountCol: {
      alignItems: "flex-end",
      minWidth: 80,
    },
    amount: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    count: {
      fontSize: 10,
      color: colors.textTertiary,
      marginTop: 1,
    },
  });
