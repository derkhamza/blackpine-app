import { useState, useMemo } from "react";
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { MOROCCAN_CITIES } from "../lib/cities";
import { useT } from "../lib/useT";
import { radii, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

interface Props {
  visible: boolean;
  value: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}

export function CityPicker({ visible, value, onSelect, onClose }: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? MOROCCAN_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : MOROCCAN_CITIES;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("onboarding.cityLabel")}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.cancel}>{t("close")}</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t("onboarding.cityPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.item, item === value && styles.itemActive]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.itemText, item === value && styles.itemTextActive]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "70%", paddingBottom: 30,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  cancel: { fontSize: 15, color: colors.brand, fontWeight: "600" },
  search: {
    margin: spacing.md, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.sm, padding: 12, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  item: { paddingVertical: 14, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemActive: { backgroundColor: colors.brandSoft },
  itemText: { fontSize: 16, color: colors.textPrimary },
  itemTextActive: { color: colors.brand, fontWeight: "600" },
});