import React, { useState, useMemo } from "react";
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Employee } from "../lib/cabinetTypes";
import { computePayroll, currentMonthLabel, fmtMAD } from "../lib/payrollCalc";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

interface Props {
  visible: boolean;
  employee: Employee | null;
  doctorName: string;
  doctorAddress?: string;
  onClose: () => void;
  t: (k: string) => string;
}

// ─── Payslip HTML ────────────────────────────────────────────────────────────

function buildPayslipHTML(
  employee: Employee,
  doctorName: string,
  doctorAddress: string,
  monthLabel: string,
  t: (k: string) => string,
): string {
  const p = computePayroll(employee.baseSalary, employee.dependents ?? 0);
  const dr = doctorName ? `Dr. ${doctorName}` : "Cabinet médical";
  const roleLabels: Record<string, string> = {
    secretaire: "Secrétaire",
    infirmier: "Infirmier(e)",
    aide_soignant: "Aide-soignant(e)",
    technicien: "Technicien(ne)",
    autre: "Employé(e)",
  };
  const roleLabel = roleLabels[employee.role] || employee.role;
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const generated = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  function row(label: string, value: string, highlight = false, negative = false): string {
    const style = highlight
      ? "font-weight:700;background:#f0f4f8;font-size:12pt"
      : negative ? "color:#c00" : "";
    return `<tr style="${style}">
      <td style="padding:7px 12px;border-bottom:1px solid #eee">${label}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${value}</td>
    </tr>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 15mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; font-size: 10.5pt; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 3px solid #1B4F72; padding-bottom: 14px; margin-bottom: 20px; }
  .employer-name { font-size: 16pt; font-weight: 800; color: #1B4F72; }
  .employer-addr { font-size: 9pt; color: #555; margin-top: 4px; line-height: 1.6; }
  .slip-title { text-align: right; }
  .slip-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .slip-month { font-size: 18pt; font-weight: 900; color: #1B4F72; }
  .employee-box { background: #f0f6fb; border-left: 4px solid #1B4F72;
                  padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 20px; }
  .employee-name { font-size: 14pt; font-weight: 700; }
  .employee-meta { font-size: 9pt; color: #666; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1B4F72; color: white; padding: 8px 12px; text-align: left;
       font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .net-box { background: #1B4F72; color: white; border-radius: 8px;
             padding: 16px 20px; text-align: center; margin-top: 16px; }
  .net-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 1px;
               color: rgba(255,255,255,0.7); margin-bottom: 6px; }
  .net-amount { font-size: 28pt; font-weight: 900; letter-spacing: -1px; }
  .cost-box { background: #fff3e0; border: 1px solid #ffcc80; border-radius: 6px;
              padding: 10px 14px; margin-top: 12px; display: flex;
              justify-content: space-between; align-items: center; }
  .cost-label { font-size: 9pt; color: #e65100; }
  .cost-value { font-size: 12pt; font-weight: 700; color: #e65100; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;
            font-size: 8pt; color: #bbb; text-align: center; }
  .sig-area { margin-top: 36px; display: flex; justify-content: space-between; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #aaa; padding-top: 6px; font-size: 9pt; color: #666; min-width: 150px; }
</style>
</head><body>

<div class="header">
  <div>
    <div class="employer-name">${dr}</div>
    <div class="employer-addr">${doctorAddress || ""}</div>
  </div>
  <div class="slip-title">
    <div class="slip-label">Bulletin de paie</div>
    <div class="slip-month">${monthLabel}</div>
  </div>
</div>

<div class="employee-box">
  <div class="employee-name">${fullName}</div>
  <div class="employee-meta">${roleLabel}${employee.cnssNumber ? ` · CNSS : ${employee.cnssNumber}` : ""}${employee.hireDate ? ` · Embauché le ${employee.hireDate}` : ""}</div>
</div>

<table>
  <tr><th colspan="2">Éléments de rémunération</th></tr>
  ${row("Salaire brut mensuel", fmtMAD(p.grossSalary))}
</table>

<table>
  <tr><th colspan="2">Retenues salariales</th></tr>
  ${row("Cotisations CNSS (6.74% plafonné à 6 000 MAD)", "− " + fmtMAD(p.cnssEmployee), false, true)}
  ${row("Déduction professionnelle (20%, max 2 500 MAD)", fmtMAD(p.deductionPro))}
  ${row("Salaire net imposable", fmtMAD(p.netImposable), true)}
  ${row("IR mensuel", "− " + fmtMAD(p.irNet), false, true)}
  ${p.irFamille > 0 ? row(`Déduction famille (${employee.dependents} pers. × 30 MAD)`, fmtMAD(p.irFamille)) : ""}
</table>

<div class="net-box">
  <div class="net-label">Net à payer</div>
  <div class="net-amount">${fmtMAD(p.netSalary)}</div>
</div>

<div class="cost-box">
  <div class="cost-label">Charges patronales CNSS (~21.09%) · Coût total employeur</div>
  <div class="cost-value">${fmtMAD(p.grossSalary + p.cnssEmployer)}</div>
</div>

<div class="sig-area">
  <div class="sig-box"><div class="sig-line">Signature employeur</div></div>
  <div class="sig-box"><div class="sig-line">Signature employé(e)</div></div>
</div>

<div class="footer">
  Document généré le ${generated} · BLACKPINE Cabinet
</div>

</body></html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PayslipModal({ visible, employee, doctorName, doctorAddress, onClose, t }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  if (!employee) return null;

  const p = computePayroll(employee.baseSalary, employee.dependents ?? 0);
  const monthLabel = currentMonthLabel();

  const roleLabels: Record<string, string> = {
    secretaire: t("payroll.roles.secretaire"),
    infirmier: t("payroll.roles.infirmier"),
    aide_soignant: t("payroll.roles.aide_soignant"),
    technicien: t("payroll.roles.technicien"),
    autre: t("payroll.roles.autre"),
  };

  const handleShare = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const html = buildPayslipHTML(employee, doctorName, doctorAddress ?? "", monthLabel, t);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Bulletin de paie — ${employee.firstName} ${employee.lastName}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      // cancelled
    } finally {
      setLoading(false);
    }
  };

  function Row({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
    return (
      <View style={[styles.calcRow, accent && styles.calcRowAccent]}>
        <Text style={styles.calcLabel}>{label}</Text>
        <Text style={[styles.calcValue, negative && { color: colors.danger }]}>{value}</Text>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="receipt" size={18} color={colors.brand} />
              <Text style={styles.title}>{t("payroll.payslipTitle")}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Employee badge */}
          <View style={styles.empBadge}>
            <View style={styles.empAvatar}>
              <Text style={styles.empAvatarText}>
                {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.empName}>{employee.firstName} {employee.lastName}</Text>
              <Text style={styles.empRole}>{roleLabels[employee.role] ?? employee.role} · {monthLabel}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Calculation breakdown */}
            <View style={styles.calcCard}>
              <Text style={styles.calcSection}>{t("payroll.grossSalary")}</Text>
              <Row label={t("payroll.grossSalary")} value={fmtMAD(p.grossSalary)} />

              <Text style={[styles.calcSection, { marginTop: spacing.md }]}>Retenues</Text>
              <Row label={t("payroll.cnssEmployee")} value={`− ${fmtMAD(p.cnssEmployee)}`} negative />
              <Row label={t("payroll.deductionPro")} value={fmtMAD(p.deductionPro)} />
              <Row label={t("payroll.netImposable")} value={fmtMAD(p.netImposable)} accent />
              <Row label={t("payroll.irNet")} value={`− ${fmtMAD(p.irNet)}`} negative />
            </View>

            {/* Net salary hero */}
            <View style={styles.netHero}>
              <Text style={styles.netLabel}>{t("payroll.netSalary")}</Text>
              <Text style={styles.netAmount}>{fmtMAD(p.netSalary)}</Text>
            </View>

            {/* Employer cost */}
            <View style={styles.costBox}>
              <Text style={styles.costLabel}>{t("payroll.cnssEmployer")}</Text>
              <Text style={styles.costValue}>{fmtMAD(p.cnssEmployer)}</Text>
            </View>
            <View style={[styles.costBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger + "44" }]}>
              <Text style={[styles.costLabel, { color: colors.danger }]}>{t("payroll.totalCost")}</Text>
              <Text style={[styles.costValue, { color: colors.danger }]}>{fmtMAD(p.grossSalary + p.cnssEmployer)}</Text>
            </View>

            {/* Share button */}
            <Pressable
              style={[styles.shareBtn, loading && { opacity: 0.6 }]}
              onPress={handleShare}
              disabled={loading}
            >
              <Icon name="pdf" size={18} color={colors.textOnDark} />
              <Text style={styles.shareBtnText}>
                {loading ? "…" : t("payroll.generatePayslip")}
              </Text>
            </Pressable>
            <View style={{ height: spacing.xl }} />
          </ScrollView>
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
    paddingHorizontal: spacing.lg, maxHeight: "90%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: "center", marginTop: 10, marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: spacing.sm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },

  empBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.brandSoft, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md,
  },
  empAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  empAvatarText: { fontSize: 14, fontWeight: "800", color: colors.textOnDark },
  empName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  empRole: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  calcCard: {
    backgroundColor: colors.bg, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden", marginBottom: spacing.md,
  },
  calcSection: {
    fontSize: 9, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.5,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 2,
  },
  calcRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  calcRowAccent: { backgroundColor: colors.brandSoft },
  calcLabel: { fontSize: 12, color: colors.textSecondary, flex: 1, marginRight: spacing.sm },
  calcValue: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },

  netHero: {
    backgroundColor: colors.surfaceDark, borderRadius: radii.lg,
    alignItems: "center", paddingVertical: spacing.lg,
    marginBottom: spacing.sm, ...shadows.hero,
  },
  netLabel: { fontSize: 10, fontWeight: "600", color: colors.textOnDarkMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  netAmount: { fontSize: 30, fontWeight: "900", color: colors.textOnDark, letterSpacing: -1 },

  costBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.warningSoft, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.warning + "44",
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm,
  },
  costLabel: { fontSize: 11, color: colors.warning, flex: 1 },
  costValue: { fontSize: 13, fontWeight: "700", color: colors.warning },

  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.brand,
    borderRadius: radii.lg, paddingVertical: 15, marginTop: spacing.sm,
  },
  shareBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15 },
});
