import { useState } from "react";
import { Target, Check } from "lucide-react";
import { getDailyIntention, setDailyIntention, type DailyIntention } from "../services/weeklyIntention";
import { hapticMedium } from "../hooks/useHaptics";

// Wave 3 Group I (2026-07-12) — the if-then ("implementation intention") picker that replaces
// the free-text diary "Morning Intention" field (DiaryCardScreen.tsx) and the chat-embedded
// "What's your intention for today?" question (modeEngine.ts) with the ONE canonical structured
// store (weeklyIntention.ts's daily intention). Specific/structured plans outperform vague/open
// prompts at producing follow-through: d=0.65 on goal attainment generally, d=0.61 specifically on
// overcoming failure-to-start, per Gollwitzer & Sheeran (2006), Adv Exp Soc Psychol.
export default function DailyIntentionCard() {
  const [intention, setIntentionState] = useState<DailyIntention | null>(() => getDailyIntention());
  const [editing, setEditing] = useState(() => !getDailyIntention());
  const [ifText, setIfText] = useState(intention?.if ?? "");
  const [thenText, setThenText] = useState(intention?.then ?? "");
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    const result = setDailyIntention(ifText, thenText);
    if (!result) return; // blank field(s) — no-op, keep the form open for the user to finish
    setIntentionState(result);
    setEditing(false);
    void hapticMedium();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const startEdit = () => {
    setIfText(intention?.if ?? "");
    setThenText(intention?.then ?? "");
    setEditing(true);
  };

  if (intention && !editing) {
    return (
      <div
        id="today-daily-intention"
        className="glass p-4 rounded-2xl border-l-4 border-l-amber-500/50 space-y-2"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's intention</p>
        </div>
        <p className="text-sm text-slate-200">
          If <span className="font-semibold">{intention.if}</span>, then I will{" "}
          <span className="font-semibold">{intention.then}</span>.
        </p>
        <button
          onClick={startEdit}
          className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Edit
        </button>
      </div>
    );
  }

  const canSave = ifText.trim().length > 0 && thenText.trim().length > 0;

  return (
    <div
      id="today-daily-intention"
      className="glass p-4 rounded-2xl border-l-4 border-l-amber-500/50 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Set today's intention</p>
      </div>
      <p className="text-[11px] text-slate-500">
        A tiny if-then plan makes it more likely you'll follow through — no pressure, just a nudge.
      </p>
      <div className="space-y-2">
        <input
          type="text"
          value={ifText}
          onChange={(e) => setIfText(e.target.value)}
          placeholder="If… (e.g. I feel anxious after lunch)"
          aria-label="If"
          className="w-full bg-page border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
        />
        <input
          type="text"
          value={thenText}
          onChange={(e) => setThenText(e.target.value)}
          placeholder="…then I will (e.g. do a 2-minute breathing exercise)"
          aria-label="Then"
          className="w-full bg-page border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl sun-cta text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {justSaved && <Check className="w-4 h-4" aria-hidden="true" />}
        {justSaved ? "Saved" : "Save intention"}
      </button>
    </div>
  );
}
