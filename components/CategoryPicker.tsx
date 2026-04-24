import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Category,
  TransactionType,
  getGroupedCategories,
} from "blackpine-engine";
import { colors, radii, spacing, typography } from "../lib/theme";
import { useT } from "../lib/useT";

interface Props {
  visible: boolean;
  type: TransactionType;
  fiscalYear: number;
  onClose: () => void;
  onSelect: (category: Category) => void;
}

export function CategoryPicker({ visible, type, fiscalYear, onClose, onSelect }: Props) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => getGroupedCategories(fiscalYear, type), [fiscalYear, type]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase().trim();
    return groups
      .map((g) => ({
        ...g,
        categories: g.categories.filter((c) =>
          c.labelFr.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.categories.length > 0);
  }, [groups, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {type === "RECETTE" ? t("categories.title") : t("categories.titleCharge")}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>{t("cancel")}</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder={t("categories.searchPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {filteredGroups.map((group) => (
            <View key={group.family} style={styles.group}>
              <Text style={styles.groupLabel}>{t(`families.${group.family}`)}</Text>
              {group.categories.map((cat) => (
                <CategoryItem key={cat.id} category={cat} onPress={() => { onSelect(cat); onClose(); }} t={t} />
              ))}
            </View>
          ))}

          {filteredGroups.length === 0 && (
            <Text style={styles.empty}>{t("categories.noResults")} « {query} »</Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function CategoryItem({ category, onPress, t }: { category: Category; onPress: () => void; t: (k: string) => string }) {
  const rule = category.rns;
  let hint = "";
  let hintColor = colors.textTertiary;

  if (rule.needsReview) {
    hint = t("categories.needsReview");
    hintColor = colors.warning;
  } else if (!rule.deductible && category.type === "CHARGE") {
    hint = t("categories.notDeductible");
    hintColor = colors.danger;
  } else if (rule.ratio < 1 && category.type === "CHARGE") {
    hint = `${t("categories.deductible")} ${Math.round(rule.ratio * 100)}%`;
    hintColor = colors.warning;
  } else if (category.type === "CHARGE") {
    hint = t("categories.deductible");
    hintColor = colors.success;
  }

  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel}>{category.labelFr}</Text>
        {hint && (
          <Text style={[styles.itemHint, { color: hintColor }]}>{hint}</Text>
        )}
        {category.notes && (
          <Text style={styles.itemNote}>{category.notes}</Text>
        )}
      </View>
      <Text style={styles.itemArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  cancel: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: "600",
  },
  search: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  group: { marginBottom: spacing.lg },
  groupLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  itemHint: {
    fontSize: 12,
    marginTop: 2,
  },
  itemNote: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: "italic",
    marginTop: 2,
  },
  itemArrow: {
    fontSize: 22,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  empty: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 14,
    paddingVertical: spacing.xl,
  },
});