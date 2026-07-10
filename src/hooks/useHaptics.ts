import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Light impact - for subtle interactions (button presses, toggle switches)
 */
export async function hapticLight(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Light });
}

/**
 * Medium impact - for significant actions (form submit, primary actions)
 */
export async function hapticMedium(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Medium });
}

/**
 * Heavy impact - for destructive actions (delete, logout)
 */
export async function hapticHeavy(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Heavy });
}

/**
 * Selection change - for picker wheels, segmented controls
 */
export async function hapticSelection(): Promise<void> {
  await Haptics.selectionStart();
}

/**
 * Success notification - for completed actions
 */
export async function hapticSuccess(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Success });
}

/**
 * Warning notification - for potentially destructive actions
 */
export async function hapticWarning(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Warning });
}

/**
 * Error notification - for failed actions
 */
export async function hapticError(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Error });
}