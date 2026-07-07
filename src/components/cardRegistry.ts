// cardRegistry — maps NilaCard kinds to their inline React components.
// Used by the stream renderer to activate the right interactive card in-stream.

import React from "react";
import type { NilaCard } from "../services/nilaOrchestration";
import type { ComponentType } from "react";

export interface InlineCardProps {
  onComplete?: () => void;
  skillId?: string;
  instrument?: string;
  initialFeeling?: string;
}

// Lazy-loaded inline card components — using `any` for the component type to allow
// different prop signatures while keeping the registry type-safe at the call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CARD_COMPONENTS: Record<string, React.LazyExoticComponent<ComponentType<any>>> = {
  grounding: React.lazy(() => import("./cards/GroundingInlineCard")),
  breathing: React.lazy(() => import("./cards/BreathingInlineCard")),
  diary_quick: React.lazy(() => import("./cards/DiaryQuickCard")),
  medication_check: React.lazy(() => import("./cards/MedicationCheckCard")),
  thought_record_inline: React.lazy(() => import("./cards/ThoughtRecordInlineCard")),
  assessment_inline: React.lazy(() => import("./cards/AssessmentInlineCard")),
  skill: React.lazy(() => import("./cards/SkillInlineCard")),
  reach_out_inline: React.lazy(() => import("./cards/ReachOutInlineCard")),
  wind_down_inline: React.lazy(() => import("./cards/WindDownInlineCard")),
};

/** Get the inline component for a card kind, or null if the card should navigate instead. */
export function getInlineCardComponent(kind: NilaCard["kind"]): ComponentType<any> | null {
  return CARD_COMPONENTS[kind] ?? null;
}

/** Card kinds that render inline (interactive in-stream) vs navigate to a separate screen. */
export const INLINE_CARD_KINDS = new Set<string>([
  "grounding",
  "breathing",
  "diary_quick",
  "medication_check",
  "thought_record_inline",
  "assessment_inline",
  "skill",
  "reach_out_inline",
  "wind_down_inline",
]);

/** Check if a card kind should render inline. */
export function isInlineCard(kind: NilaCard["kind"]): boolean {
  return INLINE_CARD_KINDS.has(kind);
}
