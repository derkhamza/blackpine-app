import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { saveReceipt, deleteReceipt } from "../lib/receipts";
import { extractReceipt, OcrExtraction } from "../lib/api";
import { OcrPreview } from "./OcrPreview";
import { colors, radii, spacing, typography } from "../lib/theme";

interface Props {
  uri: string | undefined;
  onChange: (uri: string | undefined) => void;
  onOcrAmount?: (amount: number) => void;
  onOcrDate?: (date: string) => void;
}

export function ReceiptCapture({ uri, onChange, onOcrAmount, onOcrDate }: Props) {
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtraction | null>(null);

  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission requise", "L'accès à la caméra est nécessaire.");
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission requise", "L'accès à la galerie est nécessaire.");
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
      onChange(permanent);

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
      Alert.alert("Erreur", "Impossible de sauvegarder le reçu.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert("Supprimer le justificatif ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          if (uri) await deleteReceipt(uri);
          onChange(undefined);
          setOcrResult(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.captureContainer}>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <Pressable style={styles.previewBtn} onPress={() => pickImage(false)}>
              <Text style={styles.previewBtnText}>Remplacer</Text>
            </Pressable>
            <Pressable
              style={[styles.previewBtn, styles.previewBtnDanger]}
              onPress={handleRemove}
            >
              <Text style={styles.previewBtnTextDanger}>Supprimer</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Justificatif</Text>
          <View style={styles.btnRow}>
            <Pressable
              style={styles.captureBtn}
              onPress={() => pickImage(true)}
              disabled={saving}
            >
              <Text style={styles.captureBtnIcon}>📷</Text>
              <Text style={styles.captureBtnText}>Photographier</Text>
            </Pressable>
            <Pressable
              style={styles.captureBtn}
              onPress={() => pickImage(false)}
              disabled={saving}
            >
              <Text style={styles.captureBtnIcon}>🖼️</Text>
              <Text style={styles.captureBtnText}>Galerie</Text>
            </Pressable>
          </View>
          {saving && (
            <Text style={styles.savingText}>Sauvegarde en cours…</Text>
          )}
        </>
      )}

      {/* OCR Results */}
      {(ocrLoading || ocrResult) && (
        <OcrPreview
          loading={ocrLoading}
          amounts={ocrResult?.amounts ?? []}
          dates={ocrResult?.dates ?? []}
          bestAmount={ocrResult?.bestAmount ?? null}
          bestDate={ocrResult?.bestDate ?? null}
          confidence={ocrResult?.confidence ?? 0}
          onAcceptAmount={(amount) => {
            onOcrAmount?.(amount);
          }}
          onAcceptDate={(date) => {
            onOcrDate?.(date);
          }}
          onDismiss={() => setOcrResult(null)}
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
  captureBtnIcon: { fontSize: 18 },
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
});