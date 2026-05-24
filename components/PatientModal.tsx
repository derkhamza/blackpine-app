import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BloodType, Patient, PatientGender } from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import { radii, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { sharedModalStyles as _sharedModalStyles, makeSharedStyles } from "../lib/sharedStyles";
import { uuid } from "../lib/utils";
import { DatePickerField } from "./DatePickerField";

// ─── constants ───────────────────────────────────────────────────────────────

export const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const EMPTY_PATIENT: Omit<Patient, "id" | "createdAt"> = {
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  gender: undefined,
  notes: "",
  bloodType: undefined,
  allergies: "",
  antecedents: "",
  currentMedications: "",
  cin: "",
  cnopsNumber: "",
};

// ─── PatientModal ─────────────────────────────────────────────────────────────

export function PatientModal({
  visible, initial, onSave, onClose, t,
}: {
  visible: boolean; initial: Patient | null;
  onSave: (p: Patient) => void; onClose: () => void;
  t: (k: string) => string;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedModalStyles = makeSharedStyles(colors);
  const [form, setForm] = useState<Omit<Patient, "id" | "createdAt">>(
    initial
      ? {
          firstName: initial.firstName,
          lastName: initial.lastName,
          phone: initial.phone ?? "",
          dateOfBirth: initial.dateOfBirth ?? "",
          gender: initial.gender,
          notes: initial.notes ?? "",
          bloodType: initial.bloodType,
          allergies: initial.allergies ?? "",
          antecedents: initial.antecedents ?? "",
          currentMedications: initial.currentMedications ?? "",
          cin: initial.cin ?? "",
          cnopsNumber: initial.cnopsNumber ?? "",
        }
      : { ...EMPTY_PATIENT }
  );

  React.useEffect(() => {
    setForm(
      initial
        ? {
            firstName: initial.firstName,
            lastName: initial.lastName,
            phone: initial.phone ?? "",
            dateOfBirth: initial.dateOfBirth ?? "",
            gender: initial.gender,
            notes: initial.notes ?? "",
            bloodType: initial.bloodType,
            allergies: initial.allergies ?? "",
            antecedents: initial.antecedents ?? "",
            currentMedications: initial.currentMedications ?? "",
            cin: initial.cin ?? "",
            cnopsNumber: initial.cnopsNumber ?? "",
          }
        : { ...EMPTY_PATIENT }
    );
  }, [initial, visible]);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    const patient: Patient = {
      id: initial?.id ?? uuid(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender,
      notes: form.notes || undefined,
      bloodType: form.bloodType,
      allergies: form.allergies || undefined,
      antecedents: form.antecedents || undefined,
      currentMedications: form.currentMedications || undefined,
      cin: form.cin?.trim() || undefined,
      cnopsNumber: form.cnopsNumber?.trim() || undefined,
    };
    onSave(patient);
    onClose();
  };

  const canSave = form.firstName.trim() && form.lastName.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sharedModalStyles.overlay}>
        <View style={[sharedModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={sharedModalStyles.handle} />
          <View style={sharedModalStyles.header}>
            <Text style={sharedModalStyles.title}>
              {initial ? t("patients.editPatient") : t("patients.addPatient")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Names */}
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("patients.firstName")}</Text>
                <TextInput
                  style={sharedModalStyles.formInput}
                  value={form.firstName}
                  onChangeText={(v) => set("firstName", v)}
                  placeholder={t("patients.firstNamePlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("patients.lastName")}</Text>
                <TextInput
                  style={sharedModalStyles.formInput}
                  value={form.lastName}
                  onChangeText={(v) => set("lastName", v)}
                  placeholder={t("patients.lastNamePlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Phone */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.phone")}</Text>
            <TextInput
              style={sharedModalStyles.formInput}
              value={form.phone ?? ""}
              onChangeText={(v) => set("phone", v)}
              placeholder={t("patients.phonePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />

            {/* CIN + CNOPS — insurance section */}
            <View style={styles.sectionDivider}>
              <View style={styles.sectionDividerLine} />
              <View style={styles.sectionDividerLabel}>
                <Icon name="fileCheck" size={13} color={colors.gold} />
                <Text style={[styles.sectionDividerText, { color: colors.gold }]}>
                  {t("patients.insuranceSection")}
                </Text>
              </View>
              <View style={styles.sectionDividerLine} />
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("patients.cin")}</Text>
                <TextInput
                  style={sharedModalStyles.formInput}
                  value={form.cin ?? ""}
                  onChangeText={(v) => set("cin", v.toUpperCase())}
                  placeholder={t("patients.cinPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("patients.cnopsNumber")}</Text>
                <TextInput
                  style={sharedModalStyles.formInput}
                  value={form.cnopsNumber ?? ""}
                  onChangeText={(v) => set("cnopsNumber", v)}
                  placeholder={t("patients.cnopsPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* DOB */}
            <View style={styles.dobRow}>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("patients.dateOfBirth")}</Text>
                <DatePickerField
                  value={form.dateOfBirth ?? ""}
                  onChange={(v) => set("dateOfBirth", v)}
                  maxDate={new Date()}
                  minDate={new Date(new Date().getFullYear() - 120, 0, 1)}
                />
              </View>
              {!!form.dateOfBirth && (
                <Pressable
                  style={styles.clearDobBtn}
                  onPress={() => set("dateOfBirth", "")}
                  hitSlop={8}
                >
                  <Icon name="close" size={12} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Gender */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.gender")}</Text>
            <View style={styles.genderRow}>
              {(["M", "F"] as PatientGender[]).map((g) => (
                <Pressable
                  key={g}
                  style={[styles.genderBtn, form.gender === g && styles.genderBtnSelected]}
                  onPress={() => set("gender", form.gender === g ? undefined : g)}
                >
                  <Text style={[styles.genderBtnText, form.gender === g && styles.genderBtnTextSelected]}>
                    {g === "M" ? t("patients.male") : t("patients.female")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Notes */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.notes")}</Text>
            <TextInput
              style={[sharedModalStyles.formInput, styles.formTextarea]}
              value={form.notes ?? ""}
              onChangeText={(v) => set("notes", v)}
              placeholder={t("patients.notesPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Medical dossier section */}
            <View style={styles.sectionDivider}>
              <View style={styles.sectionDividerLine} />
              <View style={styles.sectionDividerLabel}>
                <Icon name="stethoscope" size={13} color={colors.brand} />
                <Text style={styles.sectionDividerText}>{t("patients.medicalDossier")}</Text>
              </View>
              <View style={styles.sectionDividerLine} />
            </View>

            {/* Blood type */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.bloodType")}</Text>
            <View style={styles.bloodTypeRow}>
              {BLOOD_TYPES.map((bt) => (
                <Pressable
                  key={bt}
                  style={[styles.bloodTypeBtn, form.bloodType === bt && styles.bloodTypeBtnSelected]}
                  onPress={() => set("bloodType", form.bloodType === bt ? undefined : bt)}
                >
                  <Text style={[styles.bloodTypeBtnText, form.bloodType === bt && styles.bloodTypeBtnTextSelected]}>
                    {bt}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Allergies */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.allergies")}</Text>
            <TextInput
              style={[sharedModalStyles.formInput, { height: 56, paddingTop: 12 }]}
              value={form.allergies ?? ""}
              onChangeText={(v) => set("allergies", v)}
              placeholder={t("patients.allergiesPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />

            {/* Antécédents */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.antecedents")}</Text>
            <TextInput
              style={[sharedModalStyles.formInput, styles.formTextarea]}
              value={form.antecedents ?? ""}
              onChangeText={(v) => set("antecedents", v)}
              placeholder={t("patients.antecedentsPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Current medications */}
            <Text style={sharedModalStyles.formLabel}>{t("patients.currentMedications")}</Text>
            <TextInput
              style={[sharedModalStyles.formInput, styles.formTextarea]}
              value={form.currentMedications ?? ""}
              onChangeText={(v) => set("currentMedications", v)}
              placeholder={t("patients.currentMedicationsPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable
              style={[sharedModalStyles.saveBtn, !canSave && sharedModalStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={sharedModalStyles.saveBtnText}>{t("save")}</Text>
            </Pressable>
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  formTextarea: { height: 80, paddingTop: 12 },
  dobRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  clearDobBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  genderRow: { flexDirection: "row", gap: spacing.md, marginTop: 4 },
  genderBtn: {
    flex: 1, paddingVertical: 11, borderRadius: radii.md, alignItems: "center",
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  genderBtnSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  genderBtnText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  genderBtnTextSelected: { color: colors.textOnDark },

  sectionDivider: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginTop: spacing.lg, marginBottom: spacing.xs,
  },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  sectionDividerLabel: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 6,
  },
  sectionDividerText: {
    fontSize: 11, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
  },

  bloodTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  bloodTypeBtn: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg, minWidth: 42, alignItems: "center",
  },
  bloodTypeBtnSelected: { backgroundColor: colors.danger, borderColor: colors.danger },
  bloodTypeBtnText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  bloodTypeBtnTextSelected: { color: colors.textOnDark },

});
