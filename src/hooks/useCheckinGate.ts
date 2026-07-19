import { useState } from "react";

// useCheckinGate — owns the "show today's check-in card?" gate (Phase 4 slice 3). The card shows on mount
// when the user hasn't checked in today, and hides once they log or skip it. Kept tiny + separate so the
// companion-chat extraction (slice 4) doesn't have to juggle this gate. The log/skip SIDE-EFFECTS (appending
// the check-in turn to chat, refreshing mode, relaxing chat elevation) stay in ModeScreen — this hook owns
// only the boolean and its transitions.
export function useCheckinGate(hasCheckedInToday: boolean) {
  const [showCheckin, setShowCheckin] = useState(() => !hasCheckedInToday);
  return {
    showCheckin,
    hideCheckin: () => setShowCheckin(false),
  };
}
