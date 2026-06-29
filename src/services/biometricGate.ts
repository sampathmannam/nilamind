// Biometric gate: require fingerprint / device-credential before high-stakes actions.
// Privacy: the OS verifies the fingerprint; we only ever receive a boolean. Nothing stored or logged.
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";

/** A secure prompt is possible if a biometric is enrolled OR the device has a secure lock (PIN/pattern/password). */
export function mapBiometryToAvailable(r: { isAvailable: boolean; deviceIsSecure?: boolean }): boolean {
  return !!(r.isAvailable || r.deviceIsSecure);
}

/** True if we can show Android's secure prompt (biometric or device credential). False on web/preview. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return mapBiometryToAvailable(await BiometricAuth.checkBiometry());
  } catch {
    return false;
  }
}

// ── Fallback confirm bridge (BiometricGateHost registers a calm modal here) ──
let _confirm: ((reason: string) => Promise<boolean>) | null = null;
export function __registerConfirm(fn: ((reason: string) => Promise<boolean>) | null): void {
  _confirm = fn;
}
function confirmFallback(reason: string): Promise<boolean> {
  // Host not mounted → fail closed.
  return _confirm ? _confirm(reason) : Promise.resolve(false);
}

/**
 * Require the user to prove it's them before a sensitive action.
 * Resolves true only on a successful biometric/device-credential auth, or an explicit
 * in-app confirm when no secure lock exists. Cancel / failure / error → false (fail-closed).
 */
export async function requireAuth(reason: string): Promise<boolean> {
  if (await isBiometricAvailable()) {
    try {
      await BiometricAuth.authenticate({
        reason,
        allowDeviceCredential: true,
        androidTitle: "Confirm it's you",
        androidSubtitle: reason,
        cancelTitle: "Cancel",
      });
      return true; // authenticate() resolves only on success; it throws on cancel/fail
    } catch {
      return false;
    }
  }
  return confirmFallback(reason);
}
