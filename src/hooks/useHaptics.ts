import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticLight(): Promise<void> {
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* web fallback */ }
}

export async function hapticMedium(): Promise<void> {
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { /* web fallback */ }
}

export async function hapticHeavy(): Promise<void> {
  try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch { /* web fallback */ }
}

export async function hapticSuccess(): Promise<void> {
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* web fallback */ }
}

export async function hapticWarning(): Promise<void> {
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch { /* web fallback */ }
}

export async function hapticError(): Promise<void> {
  try { await Haptics.notification({ type: NotificationType.Error }); } catch { /* web fallback */ }
}

/** Vibrate for a specific duration (ms). Used for celebration patterns. */
export async function hapticVibrate(durationMs: number = 50): Promise<void> {
  try { await Haptics.vibrate({ duration: durationMs }); } catch { /* web fallback */ }
}

/** Double-tap pattern for milestone celebrations. */
export async function hapticCelebration(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise((r) => setTimeout(r, 100));
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((r) => setTimeout(r, 100));
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* web fallback */ }
}