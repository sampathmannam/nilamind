import { localDateKey } from "../services/storageUtils";
import React, { useState, useEffect } from "react";
import { Sparkles, X, Trash2, BellRing } from "lucide-react";
import { JournalEntry } from "../types";
import { loadJournalEntries, saveJournalEntry, deleteJournalEntry, groupByDate } from "../services/journal";
import { getDailyPrompt, JournalMode } from "../services/journalPrompt";
import { getDiaryReminderPrefs, setDiaryReminderPrefs } from "../services/diaryReminderPrefs";
import { syncDiaryReminder, clearDiaryReminder } from "../services/notifications";
import { detectCrisis } from "../services/crisisClassifier";
import { saveEmaEntry, emaDateKey } from "../services/ema";
import { generateTinyId } from "../services/idGen";
import { hapticMedium } from "../hooks/useHaptics";
import CrisisCard from "./CrisisCard";

const MODE_PLACEHOLDER: Record<JournalMode, string> = {
  free: "What's on your mind...",
  gratitude: "e.g., 1) The coffee actually tasted good today. 2) A stranger held the door.",
};

const MOOD_OPTIONS: { valence: number; label: string; glyph: string }[] = [
  { valence: -3, label: "Very bad", glyph: "😞" },
  { valence: -1, label: "Bad", glyph: "😕" },
  { valence: 0, label: "Neutral", glyph: "😐" },
  { valence: 1, label: "Good", glyph: "🙂" },
  { valence: 3, label: "Very good", glyph: "😄" },
];

function formatDateHeader(date: string): string {
  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 86400000));
  if (date === today) return "TODAY";
  if (date === yesterday) return "YESTERDAY";
  return date;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function moodGlyph(valence?: number): string {
  if (valence === undefined) return "";
  const closest = MOOD_OPTIONS.reduce((a, b) => (Math.abs(b.valence - valence) < Math.abs(a.valence - valence) ? b : a));
  return closest.glyph;
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mode, setMode] = useState<JournalMode>("free");
  const [text, setText] = useState("");
  const [valence, setValence] = useState<number | undefined>(undefined);
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reminderPrefs, setReminderPrefsState] = useState(getDiaryReminderPrefs());

  useEffect(() => {
    setEntries(loadJournalEntries());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPromptDismissed(false);
    getDailyPrompt(mode).then((p) => { if (!cancelled) setDailyPrompt(p); });
    return () => { cancelled = true; };
  }, [mode]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setCrisis(false);
    if (await detectCrisis(trimmed)) {
      setCrisis(true);
      return;
    }
    const now = new Date();
    const entry: JournalEntry = {
      id: generateTinyId(),
      date: localDateKey(now),
      timestamp: now.toISOString(),
      mode,
      text: trimmed,
      valence,
    };
    saveJournalEntry(entry);
    if (valence !== undefined) {
      saveEmaEntry({ id: generateTinyId(), date: emaDateKey(now), timestamp: now.toISOString(), valence, trigger: "user_initiated" });
    }
    setEntries(loadJournalEntries());
    setText("");
    setValence(undefined);
    hapticMedium();
  };

  const handleDelete = (id: string) => {
    deleteJournalEntry(id);
    setEntries(loadJournalEntries());
    setExpandedId(null);
  };

  const handleReminderToggle = async (enabled: boolean) => {
    setDiaryReminderPrefs({ enabled });
    setReminderPrefsState(getDiaryReminderPrefs());
    if (enabled) await syncDiaryReminder();
    else await clearDiaryReminder();
  };

  const handleReminderTimeChange = async (time: string) => {
    setDiaryReminderPrefs({ time });
    setReminderPrefsState(getDiaryReminderPrefs());
    if (getDiaryReminderPrefs().enabled) await syncDiaryReminder();
  };

  const groups = groupByDate(entries);

  return (
    <div className="space-y-4 max-w-md mx-auto" id="journal-screen">
      {/* Composer — always visible, at the top of the feed. */}
      <div className="glass p-4 rounded-2xl space-y-3">
        <div className="flex gap-2" role="group" aria-label="Journal mode">
          {(["free", "gratitude"] as JournalMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 min-h-[44px] inline-flex items-center rounded-full text-xs font-medium border cursor-pointer transition-all ${
                mode === m ? "bg-blue-900/40 border-blue-700/50 text-blue-300" : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
              }`}
              aria-pressed={mode === m}
            >
              {m === "free" ? "Free write" : "Gratitude"}
            </button>
          ))}
        </div>

        {dailyPrompt && !promptDismissed && (
          <div className="flex items-start gap-2 bg-page border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span className="flex-1">Try writing about: {dailyPrompt}</span>
            <button onClick={() => setPromptDismissed(true)} aria-label="Dismiss prompt" className="text-slate-600 hover:text-slate-400 cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -m-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={MODE_PLACEHOLDER[mode]}
          aria-label="Journal entry text"
          className="w-full bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 min-h-[80px] resize-y"
        />

        <div className="flex gap-1.5" role="group" aria-label="Mood">
          {MOOD_OPTIONS.map((o) => (
            <button
              key={o.valence}
              onClick={() => setValence(o.valence)}
              aria-label={`Mood: ${o.label}`}
              aria-pressed={valence === o.valence}
              className={`flex-1 min-h-[44px] inline-flex items-center justify-center rounded-lg text-lg cursor-pointer border transition-all ${
                valence === o.valence ? "bg-blue-900/40 border-blue-700/50" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {o.glyph}
            </button>
          ))}
        </div>

        {crisis && <CrisisCard id="journal-crisis" heading="What you wrote matters more than this note right now" />}

        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="w-full font-semibold py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Save entry
        </button>

        <div className="flex items-center justify-between gap-2 bg-page border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BellRing className="w-3.5 h-3.5" />
            <span>Remind me to journal</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={reminderPrefs.time}
              disabled={!reminderPrefs.enabled}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              aria-label="Journal reminder time"
              className="bg-transparent text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1 focus:outline-none disabled:opacity-40"
            />
            <button
              role="switch"
              aria-checked={reminderPrefs.enabled}
              aria-label="Toggle journal reminder"
              onClick={() => handleReminderToggle(!reminderPrefs.enabled)}
              className={`w-10 h-5.5 rounded-full relative transition-all cursor-pointer ${reminderPrefs.enabled ? "bg-blue-600" : "bg-slate-800"}`}
            >
              <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${reminderPrefs.enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Feed — compact timeline list, grouped by date. */}
      {groups.map((g) => (
        <div key={g.date}>
          <div className="text-[11px] font-semibold text-slate-500 mb-1 mt-3">{formatDateHeader(g.date)}</div>
          {g.entries.map((e) => (
            <div key={e.id} className="border-b border-slate-800/60">
              <button
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                className="w-full flex items-baseline gap-2 py-2 text-left cursor-pointer"
              >
                <span className="text-[11px] text-slate-500 w-14 shrink-0">{formatTime(e.timestamp)}</span>
                <span className="text-xs text-slate-300 flex-1 truncate">
                  {moodGlyph(e.valence)} {e.text}
                </span>
              </button>
              {expandedId === e.id && (
                <div className="pb-3 pl-16 pr-2 space-y-2">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{e.text}</p>
                  <button
                    onClick={() => handleDelete(e.id)}
                    aria-label="Delete entry"
                    className="flex items-center gap-1.5 min-h-[44px] text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete entry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
