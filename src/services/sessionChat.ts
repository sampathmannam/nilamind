// In-memory (ephemeral) transcript store for the Nila chat.
//
// The chat screen (AiCoachScreen) unmounts when the user switches tabs, so its useState transcript was lost —
// returning to Nila showed an empty/greeting screen and the conversation was gone. This store keeps the
// transcript alive for the app SESSION so a tab-switch restores it. It is DELIBERATELY in-memory only: a
// mental-health conversation is never written to disk by this fix (that would be a privacy decision, not a
// bug fix). It clears on app restart (module reload) and via clearSessionChat().
import type { NilaUiMessage } from "./nilaSend";

let transcript: NilaUiMessage[] = [];

/** The current session transcript (a copy — callers can't mutate the store in place). */
export function getSessionChat(): NilaUiMessage[] {
  return transcript.slice();
}

/** Mirror the live transcript into the store (called whenever the chat's messages change). */
export function setSessionChat(msgs: NilaUiMessage[]): void {
  transcript = msgs.slice();
}

/** True when there's an in-progress conversation to restore. */
export function hasSessionChat(): boolean {
  return transcript.length > 0;
}

/** Drop the session transcript (e.g. an explicit "new conversation"). */
export function clearSessionChat(): void {
  transcript = [];
}
