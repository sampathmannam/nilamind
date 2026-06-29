// af_heart (cloud Kokoro) voice — RETIRED. NilaMind is fully on-device now: there is no backend to
// synthesise speech, so these stubs route everything to the phone's built-in (on-device) voice.
//   • afHeartAvailable() is always false → the voice picker never offers af_heart.
//   • speakAfHeart() always returns false → voice.ts falls back to the system voice.
// The exports are kept so the call sites (voice.ts, SettingsScreen) compile unchanged. No network.

export const AF_HEART_ID = "kokoro:af_heart"; // kept so an old saved preference resolves to system voice

export async function afHeartAvailable(): Promise<boolean> {
  return false;
}

export async function speakAfHeart(_text: string): Promise<boolean> {
  return false;
}

export function stopAfHeart(): void {
  /* nothing of ours is playing; system TTS stop is handled in voice.ts */
}
