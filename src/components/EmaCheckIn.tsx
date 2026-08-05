// Micro-check-in that opens from push notification (<10s interaction).
// Three-tap interaction: tap valence → tap energy (optional) → save.

import { useState } from "react";
import { Smile, Frown, Meh, Sparkle, Flame } from "lucide-react";
import { t } from "../services/i18n";
import { saveEmaEntry, emaDateKey } from "../services/ema";
import { buildCheckinEntry, appendCheckin } from "../services/checkin";

/** Map the 5-point EMA valence onto the check-in store's mood vocabulary (labels that MOOD_EMOJI/getTodayMood
 *  understand), so an EMA entry registers as today's check-in on the Today tab. */
function emaValenceToMood(valence: number): [string, number] {
  if (valence <= -3) return ["overwhelmed", 7];
  if (valence <= -1) return ["low", 5];
  if (valence === 0) return ["okay", 3];
  if (valence === 1) return ["good", 3];
  return ["calm", 2]; // +3 = very good
}
import { generateTinyId } from "../services/idGen";
import { scanForCrisis } from "../safety";


const VALENCE_OPTIONS = [
  { key: -3, label: "Very bad", icon: Frown, class: "text-warn" },
  { key: -1, label: "Bad", icon: Frown, class: "text-orange-400" },
  { key: 0, label: "Neutral", icon: Meh, class: "text-ink-muted" },
  { key: 1, label: "Good", icon: Smile, class: "text-green-400" },
  { key: 3, label: "Very good", icon: Smile, class: "text-cyan-400" },
];

const ENERGY_OPTIONS = [
  { key: 1, label: "Low", icon: Flame },
] as const;

export default function EmaCheckIn({ onLogged, onCrisis }: { onLogged?: () => void; onCrisis?: () => void }) {
  const [step, setStep] = useState<"valence" | "energy" | "note">("valence");
  const [valence, setValence] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col min-h-full bg-page" id="ema-checkin">
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="text-center">
          <p className="text-sm text-ink-2 font-semibold">How are you right now?</p>
        </div>

        {step === "valence" && (
          <div className="grid grid-cols-5 gap-3" id="ema-valence">
            {VALENCE_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => {
                  setValence(o.key);
                  setStep("energy");
                }}
                className={`flex flex-col items-center justify-center aspect-square rounded-2xl cursor-pointer transition-colors ${
                  valence === o.key ? "bg-accent/20 border border-accent" : "bg-card hover:bg-raised"
                }`}
                id={`ema-valence-${o.key}`}
              >
                <o.icon className={`w-7 h-7 ${o.class}`} />
                <span className="text-[11px] mt-2 text-ink-muted">{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === "energy" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2 font-semibold text-center">Your energy?</p>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setEnergy(e);
                    setStep("note");
                  }}
                  className={`flex flex-col items-center justify-center aspect-square rounded-2xl cursor-pointer transition-colors ${
                    energy === e ? "bg-accent/20 border border-accent" : "bg-card hover:bg-raised"
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    {[...Array(e)].map((_, i) => (
                      <Sparkle key={i} className={`w-4 h-4 ${
                        e === 1 ? "text-danger" : 
                        e === 2 ? "text-success" :
                        e === 3 ? "text-accent" :
                        
                         "text-cyan-400"
                      }`} />
                    ))}
                  </div>
                  <span className="text-[11px] mt-2 text-ink-muted">{
                    e === 1 ? "Very low" :
                    e === 2 ? "Low" :
                    e === 3 ? "Moderate" : "High"
                  }</span>
                </button>
              ))}
            </div>
           </div>
        )}

        {step === "note" && (
          <div className="flex flex-col gap-4 flex-1">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Two-word note..."
              // Matches the canonical `glass` input pattern (see DailyIntentionCard). Its existing
              // ring-based focus (focus:ring-1 focus:ring-accent) is unaffected - a box-shadow ring
              // doesn't compete with .glass's unlayered border the way a border-color utility would.
              className="glass text-sm text-ink-2 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-accent placeholder-ink-faint"
              maxLength={30}
            />
            <button
              onClick={saveAndClose}
              className="bg-accent hover:opacity-90 mt-auto text-ink font-semibold py-3 rounded-2xl transition-colors"
              id="ema-save"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );

  function saveAndClose() {
    if (valence === null) return;
    const trimmed = note.trim();
    // §9 (re-audit #1): the note is a consequential free-text input. A crisis disclosure routes to help
    // and is NEVER silently persisted as a mood note. The mood chip itself is not scanned (a low mood is
    // not a crisis) — only the free text the person typed.
    if (trimmed && scanForCrisis(trimmed)) {
      onCrisis?.();
      return;
    }
    const now = new Date();
    const timestamp = now.toISOString();
    const date = emaDateKey(now); // local day-bucket — matches check-ins + emaElevationSignal
    saveEmaEntry({
      id: generateTinyId(),
      date,
      timestamp,
      valence,
      energy: energy ?? undefined,
      note: trimmed || undefined,
      trigger: "user_initiated",
    });
    // Bridge to the canonical mood log (design review 2026-07-18): EMA wrote only `nilamind_ema`, but Today's
    // `hasCheckinToday` / `getTodayMood` / week-insight / streak all read `nilamind_checkins` — so a user who
    // answered "How are you feeling?" returned to a card that still asked the same question. Mirror the entry,
    // best-effort — the primary EMA save already succeeded; a mirror failure must never block onLogged.
    try {
      const [moodLabel, moodIntensity] = emaValenceToMood(valence);
      appendCheckin(buildCheckinEntry(moodLabel, moodIntensity, null, undefined, energy ?? null));
    } catch { /* mirror is best-effort */ }
    onLogged?.();
  }
}
