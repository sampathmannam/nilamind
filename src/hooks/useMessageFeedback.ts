import { useState } from "react";
import { recordFeedback, attachSuggestion } from "../services/nilaFeedback";
import { hapticLight } from "./useHaptics";

// useMessageFeedback — per-message thumbs up/down + the optional "what would've helped?" suggestion flow +
// skill-card dismissal (Phase 4 slice 4b). A self-contained, §9-free concern: it touches only its own state
// and the nilaFeedback services — never messages / loading / the crisis path — so it lifts cleanly out of
// ModeScreen. Feedback is keyed by the message's render index.
export function useMessageFeedback() {
  const [ratedMessages, setRatedMessages] = useState<Set<number>>(new Set());
  const [dismissedSkillMessages, setDismissedSkillMessages] = useState<Set<number>>(new Set());
  // 2026-07-12 Wave 3, Group F: the one-tap, dismissable "what would've helped?" follow-up after a
  // thumbs-down — completes the already-built attachSuggestion() flow. Optional, never forced.
  const [suggestionPrompt, setSuggestionPrompt] = useState<{ index: number; feedbackId: string } | null>(null);
  const [suggestionText, setSuggestionText] = useState("");

  return {
    ratedMessages,
    dismissedSkillMessages,
    suggestionPrompt,
    suggestionText,
    setSuggestionText,

    rateUp: (content: string, index: number) => {
      recordFeedback(content, "up");
      setRatedMessages((prev) => new Set(prev).add(index));
      hapticLight();
    },
    rateDown: (content: string, index: number) => {
      const entry = recordFeedback(content, "down");
      setRatedMessages((prev) => new Set(prev).add(index));
      hapticLight();
      setSuggestionText("");
      setSuggestionPrompt({ index, feedbackId: entry.id });
    },
    dismissSkill: (index: number) => {
      setDismissedSkillMessages((prev) => new Set(prev).add(index));
    },
    cancelSuggestion: () => {
      setSuggestionPrompt(null);
      setSuggestionText("");
    },
    submitSuggestion: () => {
      if (suggestionPrompt && suggestionText.trim()) {
        attachSuggestion(suggestionPrompt.feedbackId, suggestionText);
      }
      setSuggestionPrompt(null);
      setSuggestionText("");
    },
    // "New conversation" clears the per-index rating/dismissal state (mirrors startNewConversation — it did
    // NOT clear an open suggestion prompt, so neither do we).
    reset: () => {
      setRatedMessages(new Set());
      setDismissedSkillMessages(new Set());
    },
  };
}
