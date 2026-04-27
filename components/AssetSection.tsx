import { useState } from "react";
import { ReceiptCapture } from "./ReceiptCapture";
import { TouchableOpacity } from "react-native";
import {
  Alert, FlatList, Modal, ScrollView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FixedAsset, calculateAmortization } from "blackpine-engine";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

const SUBCATEGORIES = [
  { id: "constructions", label: "Constructions", rate: 0.05, duration: 20, explanation: "Amortissement linéaire sur 20 ans (5%/an). Inclut le local professionnel si propriétaire." },
  { id: "materiel_outillage", label: "Installations techniques et outillage", rate: 0.10, duration: 10, explanation: "Amortissement sur 10 ans (10%/an). Fauteuils dentaires, appareils médicaux, échographie..." },
  { id: "materiel_transport", label: "Matériel de transport", rate: 0.20, duration: 5, explanation: "Amortissement sur 5 ans (20%/an). Plafonné à 300 000 MAD TTC (Art. 10-II CGI). 400 000 MAD pour les véhicules électriques." },
  { id: "mobilier_bureau", label: "Mobilier et matériel de bureau", rate: 0.20, duration: 5, explanation: "Amortissement sur 5 ans (20%/an). Bureaux, chaises, rangements, décoration professionnelle." },
  { id: "informatique", label: "Matériel informatique", rate: 0.20, duration: 5, explanation: "Amortissement sur 5 ans (20%/an). Ordinateurs, imprimantes, écrans, tablettes professionnelles." },
  { id: "agencements", label: "Agencements et aménagements", rate: 0.10, duration: 10, explanation: "Amortissement sur 10 ans (10%/an). Travaux d'aménagement du cabinet, climatisation, plomberie." },
  { id: "frais_preliminaires", label: "Frais préliminaires", rate: 0.20, duration: 5, explanation: "Amortissement sur 5 ans (20%/an). Frais de constitution, frais d'installation, études préalables." },
];

export function AssetSection() {
  const { t } = useT();
  const { assets, addAsset, updateAsset, deleteAsset, fiscalYear } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Add form state
  const [label, setLabel] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rate, setRate] = useState(0.20);
    const [receiptUri, setReceiptUri] = useState<string | undefined>(undefined);
  const resetForm = () => {
    setLabel(""); setSubcategory(""); setAmount(""); setRate(0.20);
    setDate(new Date().toISOString().split("T")[0]);
    setReceiptUri(undefined);
  };

  const handleAdd = () => {
    if (!label.trim() || !amount || !subcategory) return;
    addAsset({
      label: label.trim(),
      category: subcategory === "frais_preliminaires" ? "non_valeur" : "immobilisation_corporelle",
      subcategory,
      acquisitionDate: date,
      acquisitionAmount: parseFloat(amount),
      amortizationRate: rate,
      amortizationMethod: "linear",
    });
    resetForm();
    setModalVisible(false);
  };

  const handleDelete = (id: string, assetLabel: string) => {
    Alert.alert(
      t("delete"),
      `Supprimer "${assetLabel}" ?`,
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => deleteAsset(id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("assets.title")}</Text>
          <Text style={styles.subtitle}>{assets.length} {t("assets.items")}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Icon name="add" size={16} color={colors.textOnDark} />
          <Text style={styles.addBtnText}>{t("assets.add")}</Text>
        </Pressable>
      </View>

      {assets.map((asset) => {
        const schedule = calculateAmortization(asset, fiscalYear);
        const currentLine = schedule.lines.find(l => l.year === fiscalYear);
        const isExpanded = expanded === asset.id;

        return (
          <Pressable
            key={asset.id}
            style={styles.assetCard}
            onPress={() => setExpanded(isExpanded ? null : asset.id)}
          >
            <View style={styles.assetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assetLabel}>{asset.label}</Text>
                <Text style={styles.assetMeta}>
                  {SUBCATEGORIES.find(s => s.id === asset.subcategory)?.label || asset.subcategory}
                  {" · "}{Math.round(asset.amortizationRate * 100)}% · {Math.ceil(1 / asset.amortizationRate)} ans
                </Text>
              </View>
              <View style={styles.assetValues}>
                <Text style={styles.assetAmount}>{Math.round(asset.acquisitionAmount).toLocaleString("fr-FR")} MAD</Text>
                <Text style={styles.assetVnc}>VNC: {Math.round(schedule.netBookValue).toLocaleString("fr-FR")}</Text>
              </View>
            </View>

            {currentLine && (
              <View style={styles.dotationRow}>
                <Text style={styles.dotationLabel}>{t("assets.dotation")} {fiscalYear}</Text>
                <Text style={styles.dotationValue}>
                  {Math.round(currentLine.dotation).toLocaleString("fr-FR")} MAD
                  {currentLine.isProrata ? " (prorata)" : ""}
                </Text>
              </View>
            )}

            {isExpanded && (
              <View style={styles.scheduleBox}>
                <Text style={styles.scheduleTitle}>{t("assets.schedule")}</Text>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleCol}>{t("assets.year")}</Text>
                  <Text style={styles.scheduleCol}>{t("assets.opening")}</Text>
                  <Text style={styles.scheduleCol}>{t("assets.dotationShort")}</Text>
                  <Text style={styles.scheduleCol}>VNC</Text>
                </View>
                {schedule.lines.map((line) => (
                  <View key={line.year} style={[styles.scheduleLine, line.year === fiscalYear && styles.scheduleLineCurrent]}>
                    <Text style={styles.scheduleCol}>{line.year}{line.isProrata ? "*" : ""}</Text>
                    <Text style={styles.scheduleCol}>{Math.round(line.openingValue).toLocaleString("fr-FR")}</Text>
                    <Text style={styles.scheduleCol}>{Math.round(line.dotation).toLocaleString("fr-FR")}</Text>
                    <Text style={styles.scheduleCol}>{Math.round(line.closingValue).toLocaleString("fr-FR")}</Text>
                  </View>
                ))}
                <Text style={styles.scheduleNote}>* prorata temporis</Text>

                <Pressable style={styles.deleteAssetBtn} onPress={() => handleDelete(asset.id, asset.label)}>
                  <Icon name="delete" size={14} color={colors.danger} />
                  <Text style={styles.deleteAssetText}>{t("delete")}</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      })}

      {assets.length === 0 && (
        <Text style={styles.empty}>{t("assets.empty")}</Text>
      )}

      {/* Add Asset Modal */}
<Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => { resetForm(); setModalVisible(false); }}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("assets.add")}</Text>
              <Pressable onPress={() => { resetForm(); setModalVisible(false); }}>
                <Text style={styles.modalCancel}>{t("close")}</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>{t("assets.label")}</Text>
            
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Fauteuil dentaire, Ordinateur..."
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>{t("assets.type")}</Text>
<View style={styles.catGrid}>
  {SUBCATEGORIES.map((sub) => (
    <Pressable
      key={sub.id}
      style={[styles.catBtn, subcategory === sub.id && styles.catBtnActive]}
      onPress={() => { setSubcategory(sub.id); setRate(sub.rate); }}
    >
      <Text style={[styles.catBtnText, subcategory === sub.id && styles.catBtnTextActive]}>
        {sub.label}
      </Text>
      <Text style={styles.catBtnRate}>{Math.round(sub.rate * 100)}% · {sub.duration} ans</Text>
      {subcategory === sub.id && (
        <Text style={styles.catExplanation}>{sub.explanation}</Text>
      )}
    </Pressable>
  ))}
</View>
<Text style={styles.fieldLabel}>{t("addTransaction.scanReceipt")}</Text>
                <ReceiptCapture
                uri={receiptUri}
                compact
                onChange={setReceiptUri}
                onOcrAmount={(ocrAmount) => setAmount(String(ocrAmount))}
                onOcrDate={(ocrDate) => setDate(ocrDate)}
                />

            <Text style={styles.fieldLabel}>{t("assets.amount")}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>{t("assets.acquisitionDate")}</Text>
            <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: colors.textPrimary, fontSize: 15 }}>
                {new Date(date).toLocaleDateString("fr-FR")}
              </Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(_, d) => {
                  if (Platform.OS !== "ios") setShowDatePicker(false);
                  if (d) setDate(d.toISOString().split("T")[0]);
                }}
              />
            )}

            {subcategory === "materiel_transport" && (
              <Text style={styles.ceilingNote}>
                ⚠️ Amortissement plafonné à 300 000 MAD TTC (Art. 10-II CGI)
              </Text>
            )}
                </ScrollView>
                <View style={styles.saveBtnWrapper}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.saveBtn, (!label.trim() || !amount || !subcategory) && styles.saveBtnDisabled]}
                onPress={() => {
                  if (!label.trim() || !amount || !subcategory) return;
                  handleAdd();
                }}
              >
                <Text style={styles.saveBtnText}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md, overflow: "hidden", ...shadows.card },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase" },
  subtitle: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brand, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill },
  addBtnText: { color: colors.textOnDark, fontSize: 12, fontWeight: "600" },
  assetCard: { backgroundColor: colors.bg, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  assetHeader: { flexDirection: "row", justifyContent: "space-between" },
  assetLabel: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  assetMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  assetValues: { alignItems: "flex-end" },
  assetAmount: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  assetVnc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  dotationRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  dotationLabel: { fontSize: 12, color: colors.textSecondary },
  dotationValue: { fontSize: 12, fontWeight: "600", color: colors.brand },
  scheduleBox: { marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radii.sm, padding: spacing.sm },
  scheduleTitle: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },
  scheduleHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4, marginBottom: 4 },
  scheduleLine: { flexDirection: "row", paddingVertical: 3 },
  scheduleLineCurrent: { backgroundColor: colors.brandSoft, borderRadius: 4 },
  scheduleCol: { flex: 1, fontSize: 10, color: colors.textSecondary, textAlign: "center" },
  scheduleNote: { fontSize: 9, color: colors.textTertiary, fontStyle: "italic", marginTop: 4 },
  deleteAssetBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.md, alignSelf: "flex-end" },
  deleteAssetText: { fontSize: 12, color: colors.danger },
  empty: { ...typography.caption, color: colors.textTertiary, textAlign: "center", paddingVertical: spacing.lg },
catExplanation: {
  fontSize: 10,
  color: colors.brand,
  marginTop: 4,
  lineHeight: 14,
  fontStyle: "italic",
},
  // Modal
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  modalCancel: { fontSize: 15, color: colors.brand, fontWeight: "600" },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: "600", marginBottom: 4, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface },
  catGrid: { gap: 6 },
  
  catBtn: { padding: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  catBtnActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  catBtnText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  catBtnTextActive: { color: colors.brand },
  catBtnRate: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  ceilingNote: { fontSize: 11, color: colors.warning, marginTop: spacing.sm, fontStyle: "italic" },
  saveBtnDisabled: { backgroundColor: colors.borderStrong },
  saveBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
modalSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: "80%", paddingBottom: 0 },
saveBtnWrapper: { padding: spacing.lg, paddingBottom: 30, backgroundColor: colors.bg },
saveBtn: { backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radii.md, alignItems: "center" },
});