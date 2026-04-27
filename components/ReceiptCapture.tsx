import { useState } from "react";
import { Alert, Image,Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { saveReceipt, deleteReceipt } from "../lib/receipts";
import { extractReceipt, OcrExtraction } from "../lib/api";
import { OcrPreview } from "./OcrPreview";
import { colors, radii, spacing, typography } from "../lib/theme";
import { Icon } from "../lib/icons";
import { tapLight, tapSuccess } from "../lib/haptics";
import { useT } from "../lib/useT";

interface Props {
  uri?: string;
  compact?: boolean;
  onChange: (uri: string | undefined) => void;
  onOcrAmount?: (amount: number) => void;
  onOcrDate?: (date: string) => void;
  onOcrStart?: () => void;
  onOcrDismiss?: () => void;
}

export function ReceiptCapture({ uri,compact, onChange, onOcrAmount, onOcrDate, onOcrStart, onOcrDismiss  }: Props) {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtraction | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleRemove = () => {
    Alert.alert(  t("receipt.deleteConfirm"),t("receipt.deleteWarning"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"), style: "destructive",
        onPress: async () => {
          if (uri) await deleteReceipt(uri);
          onChange(undefined);
          setOcrResult(null);
        },
      },
    ]);
  };
  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("receipt.permissionRequired"), t("receipt.cameraPermission"));
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("receipt.permissionRequired"), t("receipt.galleryPermission"));
        return;
      }
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
        });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

    const tempUri = pickerResult.assets[0].uri;

    setSaving(true);
    try {
      const permanent = await saveReceipt(tempUri);
      setOcrLoading(true);
      onOcrStart?.();
      onChange(permanent);
      tapSuccess();

      // Run OCR in background if callbacks provided
      if (onOcrAmount || onOcrDate) {
        setOcrLoading(true);
        setOcrResult(null);
        try {
          console.log("[APP] Starting OCR extraction...");
          const extraction = await extractReceipt(permanent);
          console.log("[APP] OCR result:", JSON.stringify(extraction).substring(0, 200));
          setOcrResult(extraction);
        } catch (ocrErr: any) {
          console.error("[APP] OCR failed:", ocrErr?.message || ocrErr);
          Alert.alert("OCR", "Extraction échouée: " + (ocrErr?.message || "erreur inconnue"));
        } finally {
          setOcrLoading(false);
        }
      }
    } catch (err: any) {
      console.error("Receipt save error:", err?.message || err);
      Alert.alert(t("error"), t("receipt.saveError"));
    } finally {
      setSaving(false);
    }
  };

if (compact) {
  return (
    <View>
      <View style={styles.compactRow}>
        {uri ? (
          <>
            <Pressable onPress={() => setShowPreview(true)} style={styles.compactBtn}>
              <Icon name="receipt" size={20} color={colors.success} />
            </Pressable>
            <Modal visible={showPreview} transparent animationType="fade">
              <Pressable style={styles.previewOverlay} onPress={() => setShowPreview(false)}>
                <View style={styles.previewModal} onStartShouldSetResponder={() => true}>
                  <Image source={{ uri }} style={styles.previewFullImage} resizeMode="contain" />
                  <View style={styles.previewModalActions}>
<Pressable style={styles.previewModalBtn} onPress={() => { setShowPreview(false); pickImage(true); }}>
  <Icon name="camera" size={14} color={colors.brand} />
  <Text style={styles.previewBtnText}>{t("receipt.photograph")}</Text>
</Pressable>
<Pressable style={styles.previewModalBtn} onPress={() => { setShowPreview(false); pickImage(false); }}>
  <Icon name="gallery" size={14} color={colors.brand} />
  <Text style={styles.previewBtnText}>{t("receipt.gallery")}</Text>
</Pressable>
                    <Pressable style={[styles.previewModalBtn, styles.previewBtnDanger]} onPress={() => { setShowPreview(false); handleRemove(); }}>
                      <Text style={styles.previewBtnTextDanger}>{t("receipt.delete")}</Text>
                    </Pressable>
                    <Pressable style={styles.previewModalBtn} onPress={() => setShowPreview(false)}>
                      <Text style={styles.previewBtnText}>{t("close")}</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </Modal>
          </>
        ) : (
          <>
            <Pressable style={styles.compactBtn} onPress={() => pickImage(true)}>
              <Icon name="camera" size={20} color={colors.brand} />
            </Pressable>
            <Pressable style={styles.compactBtn} onPress={() => pickImage(false)}>
              <Icon name="gallery" size={20} color={colors.brand} />
            </Pressable>
          </>
        )}
        {saving && <Text style={styles.compactSaving}>{t("receipt.saving")}</Text>}
        {ocrLoading && <Text style={styles.compactSaving}>OCR...</Text>}
      </View>
      {ocrResult && (
        <View style={styles.ocrResultFull}>
          <OcrPreview
            loading={false}
            amounts={ocrResult.amounts}
            dates={ocrResult.dates}
            bestAmount={ocrResult.bestAmount}
            bestDate={ocrResult.bestDate}
            confidence={ocrResult.confidence}
            onAcceptAmount={(a) => { onOcrAmount?.(a); }}
onAcceptDate={(d) => { onOcrDate?.(d); }}
onDismiss={() => { setOcrResult(null); onOcrDismiss?.(); }}
          />
        </View>
      )}
    </View>
  );
}
  // Non-compact (full) mode
  return (
    <View style={styles.captureContainer}>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <Pressable style={styles.previewBtn} onPress={() => pickImage(true)}>
              <Text style={styles.previewBtnText}>{t("receipt.replace")}</Text>
            </Pressable>
            <Pressable style={[styles.previewBtn, styles.previewBtnDanger]} onPress={handleRemove}>
              <Text style={styles.previewBtnTextDanger}>{t("receipt.delete")}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.btnRow}>
          <Pressable style={styles.captureBtn} onPress={() => pickImage(true)}>
            <Icon name="camera" size={18} color={colors.textPrimary} />
            <Text style={styles.captureBtnText}>{t("receipt.photograph")}</Text>
          </Pressable>
          <Pressable style={styles.captureBtn} onPress={() => pickImage(false)}>
            <Icon name="gallery" size={18} color={colors.textPrimary} />
            <Text style={styles.captureBtnText}>{t("receipt.gallery")}</Text>
          </Pressable>
        </View>
      )}
      {saving && <Text style={styles.savingText}>{t("receipt.saving")}</Text>}
      {ocrLoading && <Text style={styles.savingText}>OCR...</Text>}
      {ocrResult && (
        <OcrPreview
          loading={false}
          amounts={ocrResult.amounts}
          dates={ocrResult.dates}
          bestAmount={ocrResult.bestAmount}
          bestDate={ocrResult.bestDate}
          confidence={ocrResult.confidence}
onAcceptAmount={(a) => { onOcrAmount?.(a); }}
onAcceptDate={(d) => { onOcrDate?.(d); }}
onDismiss={() => { setOcrResult(null); onOcrDismiss?.(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  captureContainer: { marginTop: spacing.md },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  btnRow: { flexDirection: "row", gap: spacing.sm },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  captureBtnText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  savingText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  previewActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  previewBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBtnText: { fontSize: 12, fontWeight: "600", color: colors.brand },
  previewBtnDanger: { borderColor: colors.dangerSoft },
  previewBtnTextDanger: { fontSize: 12, fontWeight: "600", color: colors.danger },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  compactBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  compactThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    overflow: "hidden",
  },
  previewOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.8)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
},
previewModalBtn: {
  flex: 1,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  paddingVertical: 10,
  paddingHorizontal: 4,
  backgroundColor: colors.surface,
  borderRadius: radii.sm,
  borderWidth: 1,
  borderColor: colors.border,
},
previewModal: {
  width: "100%",
  maxHeight: "80%",
  backgroundColor: colors.bg,
  borderRadius: radii.lg,
  overflow: "hidden",
},
ocrResultFull: {
  marginTop: spacing.sm,
  width: "100%",
},
previewFullImage: {
  width: "100%",
  height: 400,
},
previewModalActions: {
  flexDirection: "row",
  gap: spacing.sm,
  padding: spacing.md,
},
  compactImage: {
    width: 40,
    height: 40,
  },
  compactSaving: {
    fontSize: 10,
    color: colors.textTertiary,
  },
});