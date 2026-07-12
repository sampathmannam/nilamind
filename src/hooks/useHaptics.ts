import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticLight(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticMedium(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticSuccess(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Success });
}