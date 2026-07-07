// src/services/nilaCardDispatch.ts
// Pure mapping from a NilaCard to the action the Nila screen dispatches when it's tapped.
// Keeps card-tap routing testable and the React render thin.

import type { NilaCard } from "./nilaOrchestration";

export type NilaCardAction =
  | { type: "grounding" }
  | { type: "episode" }
  | { type: "skill"; skillId: string }
  | { type: "screening"; instrument: "PHQ-9" | "GAD-7" }
  | { type: "protocol"; protocolId: string }
  | { type: "weekly_synthesis" };

export function actionForCard(card: NilaCard): NilaCardAction | null {
  switch (card.kind) {
    case "grounding":
      return { type: "grounding" };
    case "episode":
      return { type: "episode" };
    case "skill":
      return card.skillId ? { type: "skill", skillId: card.skillId } : null;
    case "screening":
      return card.instrument ? { type: "screening", instrument: card.instrument } : null;
    case "protocol":
      return card.protocolId ? { type: "protocol", protocolId: card.protocolId } : null;
    case "weekly_synthesis":
      return { type: "weekly_synthesis" };
    default:
      return null;
  }
}
