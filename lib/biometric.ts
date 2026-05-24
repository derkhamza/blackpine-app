// expo-local-authentication is a native module — not available in Expo Go or web.
// Use a lazy require so the app degrades gracefully in those environments.
function getLA(): any | null {
  try {
    return require("expo-local-authentication");
  } catch {
    return null;
  }
}

/** True if the device has biometric hardware AND at least one enrolled credential. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const LA = getLA();
    if (!LA) return false;
    const hasHardware = await LA.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LA.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Prompt the user to authenticate.
 * Falls back to device passcode if biometrics fail / are unavailable.
 * Returns false immediately if the native module is not present.
 */
export async function authenticateAsync(promptMessage: string): Promise<boolean> {
  try {
    const LA = getLA();
    if (!LA) return false;
    const result = await LA.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use passcode",
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    return result.success;
  } catch {
    return false;
  }
}
