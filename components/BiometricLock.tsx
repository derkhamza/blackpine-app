import { useEffect, useRef, useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { radii, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { Icon } from "../lib/icons";
import { useT } from "../lib/useT";
import { authenticateAsync } from "../lib/biometric";

const MAX_ATTEMPTS   = 5;   // failures before lockout
const LOCKOUT_SEC    = 30;  // seconds per lockout tier
const LOCKOUT_TIERS  = [30, 60, 120]; // escalating lockout durations (seconds)

interface Props {
  onUnlock: () => void;
}

export function BiometricLock({ onUnlock }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [failed, setFailed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [failCount, setFailCount]   = useState(0);
  const [lockSecs, setLockSecs]     = useState(0);   // countdown seconds remaining
  const lockoutTier = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocked = lockSecs > 0;

  // Auto-prompt on mount
  useEffect(() => {
    promptAuth();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startLockout = (tier: number) => {
    const duration = LOCKOUT_TIERS[Math.min(tier, LOCKOUT_TIERS.length - 1)];
    setLockSecs(duration);
    countdownRef.current = setInterval(() => {
      setLockSecs(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const promptAuth = async () => {
    if (loading || isLocked) return;
    setFailed(false);
    setLoading(true);
    const success = await authenticateAsync(t("profile.biometricPrompt"));
    setLoading(false);
    if (success) {
      onUnlock();
    } else {
      const next = failCount + 1;
      setFailCount(next);
      setFailed(true);
      if (next >= MAX_ATTEMPTS) {
        setFailCount(0);
        startLockout(lockoutTier.current);
        lockoutTier.current = Math.min(lockoutTier.current + 1, LOCKOUT_TIERS.length - 1);
      }
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.logoMark}>
        <Icon name="lock" size={26} color={colors.textOnDark} />
      </View>
      <Text style={styles.brand}>BLACKPINE</Text>
      <Text style={styles.brandSub}>CABINET</Text>

      <Text style={styles.message}>{t("profile.biometricLocked")}</Text>

      {isLocked ? (
        <Text style={styles.lockoutText}>
          Trop de tentatives échouées.{"\n"}Réessayez dans {lockSecs}s
        </Text>
      ) : (
        failed && (
          <Text style={styles.errorText}>
            {t("profile.biometricFailed")}
            {failCount > 0 && failCount < MAX_ATTEMPTS && (
              `  (${MAX_ATTEMPTS - failCount} essai${MAX_ATTEMPTS - failCount > 1 ? "s" : ""} restant${MAX_ATTEMPTS - failCount > 1 ? "s" : ""})`
            )}
          </Text>
        )
      )}

      <Pressable
        style={({ pressed }) => [
          styles.unlockBtn,
          pressed && { opacity: 0.82 },
          (loading || isLocked) && styles.unlockBtnDisabled,
        ]}
        onPress={promptAuth}
        disabled={loading || isLocked}
      >
        <Icon name="lock" size={16} color="#fff" />
        <Text style={styles.unlockBtnText}>
          {isLocked
            ? `Verrouillé (${lockSecs}s)`
            : loading
              ? t("loading")
              : t("profile.biometricUnlock")}
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
    gap: 0,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 5,
    color: "rgba(255,255,255,0.95)",
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 5,
    color: colors.gold,
    marginTop: 4,
    fontWeight: "600",
    marginBottom: spacing.xxl,
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.60)",
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  lockoutText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  unlockBtnDisabled: {
    opacity: 0.6,
  },
  unlockBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
