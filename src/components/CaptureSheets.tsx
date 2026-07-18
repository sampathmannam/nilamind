import type { ReactNode } from "react";
import Sheet from "./Sheet";
import LearnScreen from "./LearnScreen";
import ThoughtRecordScreen from "./ThoughtRecordScreen";
import ProblemSolvingScreen from "./ProblemSolvingScreen";
import ValuesToActionScreen from "./ValuesToActionScreen";
import SafetyPlanScreen from "./SafetyPlanScreen";
import type { ThoughtRecordDraft } from "../services/thoughtRecordDraft";
import type { SafetyPlanDraftFields } from "../services/safetyPlanDraft";

// The Nila capture sheets, extracted from ModeScreen (re-architecture Phase 4, slice 1). One sheet is open at
// a time, keyed by the auxView discriminant. This component is PRESENTATIONAL: auxView, the drafts, and the
// onInternalSheetChange / closeSheetSignal wiring all still live in ModeScreen (which owns opening/closing and
// reporting sheet state upward for the hardware-back rooting + stack-aware focus-trap). Here we only render
// the active sheet and clear ITS draft on close.

export type AuxCaptureView =
  | "learn"
  | "thought_record"
  | "problem_solving"
  | "values_to_action"
  | "safety_plan";

export interface CaptureSheetsProps {
  auxView: AuxCaptureView | null;
  thoughtRecordDraft?: ThoughtRecordDraft;
  problemDraft?: { problem: string };
  valuesHighlight: string[];
  safetyPlanDraft?: SafetyPlanDraftFields;
  /** Close the active sheet — parent owns auxView, so this is setAuxView(null). */
  onClose: () => void;
  clearThoughtRecordDraft: () => void;
  clearProblemDraft: () => void;
  clearValuesHighlight: () => void;
  clearSafetyPlanDraft: () => void;
}

// Each entry pairs a capture screen with the draft it must clear on close, INSIDE one registry entry, so the
// screen and its draft-clear can never desync — the old inline onClose closures could close one sheet while
// clearing another's draft. title/id are the exact strings the hand-rolled <Sheet>s used, so the focus-trap
// ids and back-button behaviour are unchanged.
interface SheetDef {
  title: string;
  id: string;
  render(p: CaptureSheetsProps): ReactNode;
  clearDraft(p: CaptureSheetsProps): void;
}

const REGISTRY: Record<AuxCaptureView, SheetDef> = {
  learn: {
    title: "Learn",
    id: "learn-sheet",
    render: () => <LearnScreen />,
    clearDraft: () => {},
  },
  thought_record: {
    title: "Thought Record",
    id: "thought-record-sheet",
    render: (p) => <ThoughtRecordScreen draft={p.thoughtRecordDraft} />,
    clearDraft: (p) => p.clearThoughtRecordDraft(),
  },
  problem_solving: {
    title: "Problem-Solving",
    id: "problem-solving-sheet",
    render: (p) => <ProblemSolvingScreen draft={p.problemDraft} />,
    clearDraft: (p) => p.clearProblemDraft(),
  },
  values_to_action: {
    title: "Do one thing",
    id: "values-to-action-sheet",
    render: (p) => <ValuesToActionScreen highlightDomains={p.valuesHighlight} />,
    clearDraft: (p) => p.clearValuesHighlight(),
  },
  safety_plan: {
    title: "My Safety Plan",
    id: "safety-plan-sheet",
    render: (p) => <SafetyPlanScreen draft={p.safetyPlanDraft} />,
    clearDraft: (p) => p.clearSafetyPlanDraft(),
  },
};

export default function CaptureSheets(props: CaptureSheetsProps) {
  const { auxView, onClose } = props;
  if (!auxView) return null;
  const def = REGISTRY[auxView];
  return (
    <Sheet
      open
      title={def.title}
      id={def.id}
      bodyClassName="p-4"
      faultIsolated
      onClose={() => {
        onClose();
        def.clearDraft(props);
      }}
    >
      {def.render(props)}
    </Sheet>
  );
}
