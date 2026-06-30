import React, { useState, useMemo } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeScreen } from "../components/SafeScreen";
import { PayslipModal } from "../components/PayslipModal";
import { useCabinet } from "../lib/CabinetContext";
import { useApp } from "../lib/AppContext";
import { Employee, EmployeeRole } from "../lib/cabinetTypes";
import { computePayroll, currentMonthLabel, fmtMAD } from "../lib/payrollCalc";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLES: EmployeeRole[] = ["secretaire", "infirmier", "aide_soignant", "technicien", "autre"];

function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function roleColor(role: EmployeeRole, colors: ColorPalette): string {
  const map: Record<EmployeeRole, string> = {
    secretaire: colors.brand,
    infirmier: colors.success,
    aide_soignant: "#9B72D0",
    technicien: colors.gold,
    autre: colors.textSecondary,
  };
  return map[role] ?? colors.textSecondary;
}

function initials(e: Employee): string {
  return `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`.toUpperCase();
}

// ─── Employee form modal ──────────────────────────────────────────────────────

const BLANK_EMPLOYEE: Omit<Employee, "id"> = {
  firstName: "",
  lastName: "",
  role: "secretaire",
  baseSalary: 3_000,
  cnssNumber: "",
  hireDate: "",
  dependents: 0,
  notes: "",
};

function EmployeeFormModal({
  visible,
  initial,
  onSave,
  onCancel,
  t,
}: {
  visible: boolean;
  initial: Employee | null;
  onSave: (e: Employee) => void;
  onCancel: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const form = makeForm(colors);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Omit<Employee, "id">>(BLANK_EMPLOYEE);

  React.useEffect(() => {
    if (visible) {
      setDraft(initial ? { ...initial } : { ...BLANK_EMPLOYEE });
    }
  }, [visible, initial]);

  const field = (patch: Partial<Omit<Employee, "id">>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const canSave = draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0 && draft.baseSalary > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ ...draft, id: initial?.id ?? newId() });
  };

  const p = computePayroll(draft.baseSalary, draft.dependents ?? 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={[form.container, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        {/* Header */}
        <View style={form.header}>
          <Pressable onPress={onCancel} style={form.headerBtn}>
            <Text style={form.cancelText}>{t("cancel")}</Text>
          </Pressable>
          <Text style={form.headerTitle}>
            {initial ? t("payroll.editEmployee") : t("payroll.addEmployee")}
          </Text>
          <Pressable onPress={handleSave} style={form.headerBtn} disabled={!canSave}>
            <Text style={[form.saveText, !canSave && { opacity: 0.35 }]}>{t("save")}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={form.scroll}
          contentContainerStyle={form.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name row */}
          <View style={form.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={form.label}>{t("payroll.firstName")} *</Text>
              <TextInput
                style={form.input}
                value={draft.firstName}
                onChangeText={(v) => field({ firstName: v })}
                placeholder="Prénom"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={form.label}>{t("payroll.lastName")} *</Text>
              <TextInput
                style={form.input}
                value={draft.lastName}
                onChangeText={(v) => field({ lastName: v })}
                placeholder="Nom"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Role picker */}
          <Text style={[form.label, { marginTop: spacing.md }]}>{t("payroll.role")}</Text>
          <View style={form.chipRow}>
            {ROLES.map((r) => {
              const selected = draft.role === r;
              const c = roleColor(r, colors);
              return (
                <Pressable
                  key={r}
                  style={[form.chip, selected && { backgroundColor: c + "22", borderColor: c }]}
                  onPress={() => field({ role: r })}
                >
                  <Text style={[form.chipText, { color: selected ? c : colors.textSecondary }]}>
                    {t(`payroll.roles.${r}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Salary */}
          <Text style={[form.label, { marginTop: spacing.md }]}>{t("payroll.baseSalary")} *</Text>
          <TextInput
            style={form.input}
            value={draft.baseSalary > 0 ? String(draft.baseSalary) : ""}
            onChangeText={(v) => field({ baseSalary: parseFloat(v.replace(",", ".")) || 0 })}
            placeholder="3000"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />

          {/* Live payroll preview */}
          {draft.baseSalary > 0 && (
            <View style={form.preview}>
              <View style={form.previewRow}>
                <Text style={form.previewLabel}>Net à payer</Text>
                <Text style={form.previewNet}>{fmtMAD(p.netSalary)}</Text>
              </View>
              <View style={form.previewRow}>
                <Text style={[form.previewLabel, { color: colors.textTertiary }]}>
                  Coût employeur
                </Text>
                <Text style={[form.previewValue, { color: colors.textTertiary }]}>
                  {fmtMAD(p.grossSalary + p.cnssEmployer)}
                </Text>
              </View>
            </View>
          )}

          {/* CNSS number */}
          <Text style={[form.label, { marginTop: spacing.md }]}>{t("payroll.cnssNumber")}</Text>
          <TextInput
            style={form.input}
            value={draft.cnssNumber ?? ""}
            onChangeText={(v) => field({ cnssNumber: v })}
            placeholder="123456789"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />

          {/* Hire date */}
          <Text style={[form.label, { marginTop: spacing.md }]}>{t("payroll.hireDate")}</Text>
          <TextInput
            style={form.input}
            value={draft.hireDate ?? ""}
            onChangeText={(v) => field({ hireDate: v })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Dependents */}
          <Text style={[form.label, { marginTop: spacing.md }]}>{t("payroll.dependents")}</Text>
          <View style={form.stepperRow}>
            <Pressable
              style={form.stepBtn}
              onPress={() => field({ dependents: Math.max(0, (draft.dependents ?? 0) - 1) })}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand, lineHeight: 20 }}>−</Text>
            </Pressable>
            <Text style={form.stepValue}>{draft.dependents ?? 0}</Text>
            <Pressable
              style={form.stepBtn}
              onPress={() => field({ dependents: (draft.dependents ?? 0) + 1 })}
            >
              <Icon name="add" size={16} color={colors.brand} />
            </Pressable>
          </View>

          {/* Notes */}
          <Text style={[form.label, { marginTop: spacing.md }]}>{t("payroll.notes")}</Text>
          <TextInput
            style={[form.input, { minHeight: 72, textAlignVertical: "top" }]}
            value={draft.notes ?? ""}
            onChangeText={(v) => field({ notes: v })}
            placeholder="…"
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Employee card ────────────────────────────────────────────────────────────

function EmployeeCard({
  employee,
  onPayslip,
  onEdit,
  onDelete,
  t,
}: {
  employee: Employee;
  onPayslip: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const c = roleColor(employee.role, colors);
  const p = computePayroll(employee.baseSalary, employee.dependents ?? 0);

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: c + "20" }]}>
          <Text style={[styles.avatarText, { color: c }]}>{initials(employee)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.empName}>{employee.firstName} {employee.lastName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: c + "18", borderColor: c + "40" }]}>
            <Text style={[styles.roleText, { color: c }]}>{t(`payroll.roles.${employee.role}`)}</Text>
          </View>
        </View>
        <View style={styles.salaryCol}>
          <Text style={styles.grossLabel}>Brut</Text>
          <Text style={styles.grossValue}>{fmtMAD(employee.baseSalary)}</Text>
        </View>
      </View>

      {/* Payroll summary */}
      <View style={styles.payrollSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net à payer</Text>
          <AnimatedNumber value={p.netSalary} format={fmtMAD} style={styles.summaryNet} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>IR mensuel</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{fmtMAD(p.irNet)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Coût total</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {fmtMAD(p.grossSalary + p.cnssEmployer)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={onPayslip}>
          <Icon name="receipt" size={14} color={colors.brand} />
          <Text style={styles.actionBtnText}>{t("payroll.generatePayslip")}</Text>
        </Pressable>
        <Pressable style={styles.actionBtnSm} onPress={onEdit}>
          <Icon name="edit" size={14} color={colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.actionBtnSm} onPress={onDelete}>
          <Icon name="delete" size={14} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PayrollScreen() {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { employees, addEmployee, updateEmployee, deleteEmployee, doctorProfile } = useCabinet();
  const { addTransaction } = useApp();
  const insets = useSafeAreaInsets();

  const [formVisible, setFormVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);

  const monthLabel = currentMonthLabel();

  // Total payroll cost for header
  const totalNetSalary = employees.reduce((sum, e) => {
    const p = computePayroll(e.baseSalary, e.dependents ?? 0);
    return sum + p.netSalary;
  }, 0);
  const totalCost = employees.reduce((sum, e) => {
    const p = computePayroll(e.baseSalary, e.dependents ?? 0);
    return sum + p.grossSalary + p.cnssEmployer;
  }, 0);

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormVisible(true);
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormVisible(true);
  };

  const handleSave = (emp: Employee) => {
    if (editingEmployee) {
      updateEmployee(emp);
    } else {
      addEmployee(emp);
    }
    setFormVisible(false);
    setEditingEmployee(null);
  };

  const handleDelete = (emp: Employee) => {
    Alert.alert(
      emp.firstName + " " + emp.lastName,
      t("delete") + " ?",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => deleteEmployee(emp.id),
        },
      ],
    );
  };

  const handleRunPayroll = () => {
    if (employees.length === 0) return;
    Alert.alert(
      t("payroll.runPayroll"),
      t("payroll.runPayrollConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: "OK",
          onPress: () => {
            const today = new Date().toISOString().slice(0, 10);
            employees.forEach((emp) => {
              const p = computePayroll(emp.baseSalary, emp.dependents ?? 0);
              // Net salary payment (gross → salaires_personnel)
              addTransaction({
                type: "CHARGE",
                amount: Math.round(p.grossSalary),
                date: today,
                category: "salaires_personnel",
                description: `Salaire — ${emp.firstName} ${emp.lastName} (${monthLabel})`,
              });
              // Employer CNSS contributions
              if (p.cnssEmployer > 0) {
                addTransaction({
                  type: "CHARGE",
                  amount: Math.round(p.cnssEmployer),
                  date: today,
                  category: "cotisations_cnss_employeur",
                  description: `Charges patronales CNSS — ${emp.firstName} ${emp.lastName} (${monthLabel})`,
                });
              }
            });
            Alert.alert("✓", t("payroll.payrollDone"));
          },
        },
      ],
    );
  };

  return (
    <SafeScreen>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t("payroll.title")}</Text>
          <Text style={styles.headerSub}>{t("payroll.subtitle")}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Icon name="add" size={18} color={colors.textOnDark} />
        </Pressable>
      </View>

      {/* ── Summary banner (shown only if there are employees) ── */}
      {employees.length > 0 && (
        <View style={styles.summaryBanner}>
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Net / mois</Text>
            <AnimatedNumber value={totalNetSalary} format={fmtMAD} style={styles.bannerValue} />
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Coût employeur</Text>
            <AnimatedNumber value={totalCost} format={fmtMAD} style={[styles.bannerValue, { color: colors.warning }]} />
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Employés</Text>
            <Text style={styles.bannerValue}>{employees.length}</Text>
          </View>
        </View>
      )}

      {/* ── Employee list ── */}
      <FlatList
        data={employees}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="users" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t("payroll.noEmployees")}</Text>
            <Pressable style={styles.emptyAddBtn} onPress={handleAdd}>
              <Icon name="add" size={16} color={colors.textOnDark} />
              <Text style={styles.emptyAddText}>{t("payroll.addEmployee")}</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <EmployeeCard
            employee={item}
            onPayslip={() => setPayslipEmployee(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
            t={t}
          />
        )}
        ListFooterComponent={
          employees.length > 0 ? (
            <Pressable style={styles.runPayrollBtn} onPress={handleRunPayroll}>
              <Icon name="receipt" size={18} color={colors.textOnDark} />
              <Text style={styles.runPayrollText}>{t("payroll.runPayroll")} — {monthLabel}</Text>
            </Pressable>
          ) : null
        }
      />

      {/* ── Modals ── */}
      <EmployeeFormModal
        visible={formVisible}
        initial={editingEmployee}
        onSave={handleSave}
        onCancel={() => { setFormVisible(false); setEditingEmployee(null); }}
        t={t}
      />

      <PayslipModal
        visible={payslipEmployee !== null}
        employee={payslipEmployee}
        doctorName={doctorProfile.fullName}
        doctorAddress={doctorProfile.address}
        onClose={() => setPayslipEmployee(null)}
        t={t}
      />
    </SafeScreen>
  );
}

// ─── Form styles ──────────────────────────────────────────────────────────────

const makeForm = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { minWidth: 64, alignItems: "flex-start" },
  headerTitle: { ...typography.h3, color: colors.textPrimary, flex: 1, textAlign: "center" },
  cancelText: { fontSize: 15, color: colors.textSecondary },
  saveText: { fontSize: 15, fontWeight: "700", color: colors.brand, textAlign: "right", minWidth: 64 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  row: { flexDirection: "row" },
  label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surface, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  preview: {
    backgroundColor: colors.surfaceDark, borderRadius: radii.md,
    padding: spacing.md, marginTop: spacing.sm, gap: 6,
  },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel: { fontSize: 12, color: colors.textOnDarkMuted },
  previewNet: { fontSize: 18, fontWeight: "800", color: colors.textOnDark },
  previewValue: { fontSize: 13, fontWeight: "600", color: colors.textOnDark },
  stepperRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border,
    alignSelf: "flex-start",
  },
  stepBtn: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  stepValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, minWidth: 36, textAlign: "center" },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  headerTitle: { ...typography.h1, color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
    ...shadows.card,
  },

  summaryBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceDark, borderRadius: radii.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    ...shadows.hero,
  },
  bannerItem: { flex: 1, alignItems: "center" },
  bannerLabel: { fontSize: 10, color: colors.textOnDarkMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  bannerValue: { fontSize: 15, fontWeight: "800", color: colors.textOnDark },
  bannerDivider: { width: 1, height: 32, backgroundColor: colors.textOnDarkMuted + "40" },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md, overflow: "hidden",
    ...shadows.card,
  },
  cardTop: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800" },
  empName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  roleBadge: {
    borderRadius: radii.pill, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start",
  },
  roleText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  salaryCol: { alignItems: "flex-end" },
  grossLabel: { fontSize: 9, fontWeight: "600", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 },
  grossValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },

  payrollSummary: {
    flexDirection: "row",
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  summaryLabel: { fontSize: 9, color: colors.textTertiary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.2, marginBottom: 2 },
  summaryNet: { fontSize: 13, fontWeight: "800", color: colors.success },
  summaryValue: { fontSize: 12, fontWeight: "700" },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 6 },

  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.sm, paddingVertical: 8, gap: spacing.xs,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xs, backgroundColor: colors.brandSoft,
    borderRadius: radii.sm, paddingVertical: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: colors.brand },
  actionBtnSm: {
    width: 36, height: 36, borderRadius: radii.sm,
    backgroundColor: colors.bg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },

  emptyState: {
    alignItems: "center", paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 15, color: colors.textSecondary, fontWeight: "500" },
  emptyAddBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.brand, borderRadius: radii.pill,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
  },
  emptyAddText: { fontSize: 14, fontWeight: "700", color: colors.textOnDark },

  runPayrollBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg, paddingVertical: 16,
    marginTop: spacing.sm, marginBottom: spacing.lg,
    ...shadows.hero,
  },
  runPayrollText: { fontSize: 15, fontWeight: "700", color: colors.textOnDark },
});
