// Session transcript store for the Nila chat — now ENCRYPTED-PERSISTENT, so a conversation survives not just a
// tab-switch but LEAVING THE APP entirely (Android killing the backgrounded process). It used to be in-memory
// only, which meant "come out of the app" lost the whole chat and forced a restart every time.
//
// PRIVACY — the deliberate decision behind persisting a mental-health conversation (previously declined here as
// "a privacy decision, not a bug fix"): the transcript is written via `secureLocal`, so it is ENCRYPTED at rest,
// stays ON-DEVICE, and sits behind the app's biometric/secure gate exactly like the diary and safety plan. It is
// fully clearable (clearSessionChat / an explicit "new conversation"). Its key is registered in secureLocal's
// SENSITIVE_KEYS so it is never written in plaintext.
import type { NilaUiMessage } from "./nilaSend";
import { secureLocal } from "./secureLocal";

const KEY = "nilamind_session_chat";

// null = not yet hydrated from encrypted storage this process. On the first access after an app (re)start we read
// the persisted transcript back in; within a running app the in-memory copy is authoritative (and mirrored on
// every write). secureLocal is hydrated at boot behind the unlock gate, so by the time the chat screen mounts and
// reads this, the decrypted value is available synchronously.
let transcript: NilaUiMessage[] | null = null;

function ensureHydrated(): NilaUiMessage[] {
  if (transcript === null) {
    try {
      const raw = secureLocal.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      transcript = Array.isArray(parsed) ? parsed : [];
    } catch {
      transcript = []; // a corrupt/undecryptable blob must never wedge the chat — start clean
    }
  }
  return transcript;
}

/** The current session transcript (a copy — callers can't mutate the store in place). */
export function getSessionChat(): NilaUiMessage[] {
  return ensureHydrated().slice();
}

/** Mirror the live transcript into the store AND persist it (encrypted) so it survives leaving the app. */
export function setSessionChat(msgs: NilaUiMessage[]): void {
  transcript = msgs.slice();
  try {
    secureLocal.setItem(KEY, JSON.stringify(transcript));
  } catch {
    // Persistence is best-effort: a failed encrypted write only means this turn isn't restorable after a kill —
    // never a lost reply in the LIVE session, since the in-memory copy above still serves the running app.
  }
}

/** True when there's an in-progress conversation to restore (in memory, or persisted from a prior run). */
export function hasSessionChat(): boolean {
  return ensureHydrated().length > 0;
}

/** Drop the session transcript everywhere — memory AND encrypted storage (explicit "new conversation"). */
export function clearSessionChat(): void {
  transcript = [];
  try {
    secureLocal.removeItem(KEY);
  } catch {
    /* ignore — a failed remove is retried next clear; worst case a stale blob rehydrates and can be cleared again */
  }
}
