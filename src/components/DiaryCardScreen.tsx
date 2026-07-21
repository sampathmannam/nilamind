import { localDateKey } from "../services/storageUtils";
import { loadDiaryMap } from "../services/diary";
import { updateSecureRecord, SECURE_KEYS } from "../services/secureData";
import { useState, useEffect } from "react";
import { DiaryCardEntry, DiaryUrge, SkillEffectiveness } from "../types";
import { ALL_DIARY_DBT_SKILLS, DEFAULT_DIARY_URGE_DEFS } from "../data";
import { Check, Clipboard, Calendar, MessageSquare, Sparkles, Loader2, Mic, MicOff } from "lucide-react";
import Markdown from "react-markdown";
import { analyzeQuickNote } from "../services/coachAssist";
import { useTypingSession } from "../hooks/useTypingSession";
import { hapticMedium } from "../hooks/useHaptics";
import CrisisCard from "./CrisisCard";
import { listenOnce, stopListening } from "../services/voice";
import DailyIntentionCard from "./DailyIntentionCard";

// Research-grounded redesign (product-brainstorming session, 2026-07-16): the standard DBT diary
// card's highest-priority tier — target-behavior urges (UW BRTC diary card; DBT Self Help) — was
// missing entirely. Rating an urge, even a high one, is purely self-report: it never surfaces the
// crisis flow on its own (user-confirmed design decision) — that's what makes honest tracking
// possible without every entry feeling like an alarm.
function defaultUrges(): DiaryUrge[] {
  return DEFAULT_DIARY_URGE_DEFS.map((d) => ({ key: d.key, label: d.label, intensity: 0, actedOn: false }));
}

function mergeUrges(existing: DiaryUrge[] | undefined): DiaryUrge[] {
  if (!existing || existing.length === 0) return defaultUrges();
  return DEFAULT_DIARY_URGE_DEFS.map((d) => existing.find((u) => u.key === d.key) ?? { key: d.key, label: d.label, intensity: 0, actedOn: false });
}

export default function DiaryCardScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(
    localDateKey()
  );
  
  const [emotions, setEmotions] = useState({
    misery: 0,
    shame: 0,
    anger: 0,
    fear: 0,
    joy: 0,
    love: 0,
  });

  const [urges, setUrges] = useState<DiaryUrge[]>(defaultUrges());
  const [skillEffectiveness, setSkillEffectiveness] = useState<Record<string, SkillEffectiveness>>({});
  const [quickNotes, setQuickNotes] = useState<string>("");
  const [quickNoteTags, setQuickNoteTags] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);

  const diaryTyping = useTypingSession("diary");
  const [crisis, setCrisis] = useState<boolean>(false);

  // Load entry for date
  useEffect(() => {
    setIsSaved(false);
    setAiAnalysis(null);
    setCrisis(false);
    const existing = loadDiaryMap()[selectedDate];
    if (existing) {
      setEmotions(existing.emotions);
      setUrges(mergeUrges(existing.urges));
      // Backward-compat: older entries have skillsUsed but no effectiveness map. Show them as
      // "tried, no help" rather than fabricating a "helped" rating we never captured.
      setSkillEffectiveness(
        existing.skillEffectiveness ?? Object.fromEntries((existing.skillsUsed || []).map((s) => [s, "tried_no_help" as SkillEffectiveness])),
      );
      setQuickNotes(existing.quickNotes || "");
      setQuickNoteTags(existing.quickNoteTags || []);
      return;
    }
    // Default reset
    setEmotions({
      misery: 0,
      shame: 0,
      anger: 0,
      fear: 0,
      joy: 0,
      love: 0,
    });
    setUrges(defaultUrges());
    setSkillEffectiveness({});
    setQuickNotes("");
    setQuickNoteTags([]);
  }, [selectedDate]);

  const handleEmotionChange = (key: keyof typeof emotions, val: number) => {
    setEmotions((prev) => ({ ...prev, [key]: val }));
    setIsSaved(false);
  };

  const handleUrgeIntensityChange = (key: string, intensity: number) => {
    setUrges((prev) =>
      prev.map((u) => (u.key === key ? { ...u, intensity, actedOn: intensity === 0 ? false : u.actedOn } : u))
    );
    setIsSaved(false);
  };

  const toggleUrgeActedOn = (key: string) => {
    setUrges((prev) => prev.map((u) => (u.key === key ? { ...u, actedOn: !u.actedOn } : u)));
    setIsSaved(false);
  };

  // Simplified from the official Linehan 0-7 skills-effectiveness scale to a 3-state tap
  // (unrated -> tried, didn't help -> tried, helped -> unrated) — an 8-option scale per skill is
  // exactly the kind of entry friction linked to lower diary-app completion (JMIR 2021 economic
  // evaluation of BPD diary apps found reduced clinical improvement vs. paper in year one).
  const cycleSkillEffectiveness = (skill: string) => {
    setSkillEffectiveness((prev) => {
      const current = prev[skill];
      const next = { ...prev };
      if (current === undefined) next[skill] = "tried_no_help";
      else if (current === "tried_no_help") next[skill] = "tried_helped";
      else delete next[skill];
      return next;
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    // morningIntention is no longer written here — Part 3 now defers to the unified daily-intention
    // store (weeklyIntention.ts's DailyIntention, via DailyIntentionCard) instead of its own
    // free-text field. The DiaryCardEntry type keeps the field (optional) for backward-compat
    // reads of older entries (see nilaContext.ts/coachAssist.ts's privacy scan, which still checks it).
    const skillsUsed = Object.keys(skillEffectiveness);
    // updateSecureRecord bails (no write) if the diary blob is corrupt, so saving one day can never wipe
    // the whole date-keyed map — the read-modify-write hazard the old loadDiaryMap()+setItem carried.
    updateSecureRecord<DiaryCardEntry>(SECURE_KEYS.diary, (entries) => {
      entries[selectedDate] = {
        date: selectedDate,
        emotions,
        skillsUsed,
        skillEffectiveness,
        urges,
        quickNotes,
        quickNoteTags,
      };
      return entries;
    });
    hapticMedium();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAnalyze = async () => {
    if (!quickNotes.trim()) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setCrisis(false);
    try {
      const result = await analyzeQuickNote(quickNotes); // §9-gated; crisis text never reaches the model
      if (result.crisis === false) {
        setAiAnalysis(result.analysis || "Unable to analyze right now.");
        // Replace tags with the model's set — an empty array clears now-stale tags from a prior run.
        setQuickNoteTags(result.tags);
        setIsSaved(false); // tags changed → prompt the user to save
      } else {
        setCrisis(true); // §9: surface crisis help, show no analysis
      }
    } catch (e) {
      setAiAnalysis("I couldn't reach Nila right now. Your note is safe — try again in a moment.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto" id="diary-card-screen">
      {/* Date Picker row */}
      <div className="flex justify-between items-center glass p-4 rounded-xl">
        <div>
          <h1 className="text-xl font-semibold text-ink">DBT Diary Card</h1>
          <p className="text-xs text-ink-faint">Your daily tracking metrics</p>
        </div>
        <div className="flex items-center gap-1.5 relative bg-page p-2 rounded-xl border border-line">
          <Calendar className="w-4 h-4 text-blue-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs text-ink-2 focus:outline-none cursor-pointer max-w-[110px]"
            aria-label="Diary date"
            id="diary-date-picker"
          />
        </div>
      </div>

      <div className="glass p-5 rounded-2xl space-y-6">
        {/* PART 0: Urges & Target Behaviors — the DBT diary card's highest-priority tier, added in
            the 2026-07-16 research-grounded redesign. Purely self-report: never surfaces the
            crisis flow on its own. */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-line pb-2">
            1. Urges &amp; Target Behaviors (0 to 5)
          </h3>
          <p className="text-[11px] text-ink-faint">
            Rating an urge — even a high one — is just tracking. It's private and never flags anything on its own.
          </p>

          {urges.map((urge) => (
            <div key={urge.key} className="space-y-1.5" id={`diary-urge-row-${urge.key}`}>
              <div className="flex justify-between text-xs font-semibold text-ink-2">
                <span>{urge.label}</span>
                <span className="font-mono text-blue-400">{urge.intensity} / 5</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={urge.intensity}
                  onChange={(e) => handleUrgeIntensityChange(urge.key, parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg bg-page accent-rose-500 cursor-pointer"
                  aria-label={`${urge.label} intensity (0 to 5)`}
                />

                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleUrgeIntensityChange(urge.key, num)}
                      className={`w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                        urge.intensity === num
                          ? "bg-rose-600 text-white"
                          : "bg-page text-ink-faint border border-line/80 hover:border-line-strong"
                      }`}
                      aria-label={`${urge.label} intensity ${num}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {urge.intensity > 0 && (
                <div className="flex items-center justify-between bg-page border border-line rounded-xl p-2.5 mt-1" id={`diary-urge-actedon-${urge.key}`}>
                  <span className="text-xs text-ink-muted">Did you act on this urge today?</span>
                  <button
                    role="switch"
                    aria-checked={urge.actedOn}
                    aria-label={`Did you act on: ${urge.label} today?`}
                    onClick={() => toggleUrgeActedOn(urge.key)}
                    className={`w-10 h-5.5 rounded-full relative transition-all cursor-pointer ${
                      urge.actedOn ? "bg-rose-600" : "bg-fill"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${
                        urge.actedOn ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* PART 1: Slide indicators for emotions */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-line pb-2">
            2. Daily Emotion Peak Ratings (0 to 5)
          </h3>

          {Object.entries(emotions).map(([key, val]) => (
            <div key={key} className="space-y-1.5" id={`diary-slider-row-${key}`}>
              <div className="flex justify-between text-xs font-semibold capitalize text-ink-2">
                <span>{key}</span>
                <span className="font-mono text-blue-400">{val} / 5</span>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={val}
                  onChange={(e) =>
                    handleEmotionChange(key as keyof typeof emotions, parseInt(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg bg-page accent-blue-500 cursor-pointer"
                  aria-label={`${key} rating (0 to 5)`}
                />
                
                {/* Visual Dot indicators as rapid tags */}
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleEmotionChange(key as keyof typeof emotions, num)}
                      className={`w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                        val === num
                          ? "bg-blue-600 text-white"
                          : "bg-page text-ink-faint border border-line/80 hover:border-line-strong"
                      }`}
                      aria-label={`${key} rating ${num}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PART 2: Skills used, rated for effectiveness — not just checked off. Simplified from the
            official Linehan 0-7 skills scale to a 3-state tap (research-grounded redesign,
            2026-07-16): tried-no-help vs tried-helped is the clinically useful distinction; an
            8-option scale per skill is friction the diary-app research links to lower completion. */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-line pb-2">
            3. Skills I Used Today
          </h3>
          <p className="text-[11px] text-ink-faint">Tap once for "tried, didn't help." Tap again for "tried, helped."</p>

          <div className="grid grid-cols-2 gap-2" id="skills-diary-grid">
            {ALL_DIARY_DBT_SKILLS.map((skill) => {
              const effectiveness = skillEffectiveness[skill];
              const isEngaged = effectiveness !== undefined;
              const helped = effectiveness === "tried_helped";
              return (
                <button
                  key={skill}
                  onClick={() => cycleSkillEffectiveness(skill)}
                  aria-pressed={isEngaged}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    helped
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-semibold"
                      : isEngaged
                      ? "bg-amber-500/10 border-amber-500/50 text-amber-300 font-semibold"
                      : "bg-page border-line text-ink-faint hover:text-ink-2 hover:border-line-strong"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                    helped
                      ? "bg-emerald-500 border-emerald-500 text-[#171311]"
                      : isEngaged
                      ? "bg-amber-500 border-amber-500 text-[#171311]"
                      : "border-line"
                  }`}>
                    {isEngaged && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="flex flex-col">
                    <span>{skill}</span>
                    {isEngaged && (
                      <span className="text-[10px] font-normal opacity-80">
                        {helped ? "Tried — helped" : "Tried — didn't help"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PART 3: Today's Intention — Wave 3 Group I: this used to be its own free-text field
            (one of three independent, contradictory "intention" surfaces). It now renders the
            same structured if-then DailyIntentionCard the Today hub uses, backed by the ONE
            canonical daily-intention store (weeklyIntention.ts), so setting/editing it here and
            on the Today hub stay in sync instead of drifting apart. */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-line pb-2 flex items-center gap-2">
            4. Today's Intention
          </h3>
          <DailyIntentionCard defaultOpen />
        </div>

        {/* PART 4: Quick Notes */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted border-b border-line pb-2">
            5. Quick Notes
          </h3>
          <p className="text-[11px] text-ink-faint">
            Jot down transient thoughts, observations, or brief reflections on your day.
          </p>
          <button
            onClick={async () => {
              if (voiceListening) {
                setVoiceListening(false);
                stopListening();
                return;
              }
              setVoiceListening(true);
              try {
                const text = await listenOnce();
                if (text && text.trim()) {
                  setQuickNotes((prev) => (prev ? prev + "\n" + text.trim() : text.trim()));
                  setIsSaved(false);
                }
              } catch {
                // best-effort
              } finally {
                setVoiceListening(false);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all mb-2 ${
              voiceListening
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                : "border-line-strong bg-card text-ink-muted hover:text-ink-2 hover:border-slate-600"
            }`}
            aria-label={voiceListening ? "Stop listening" : "Record a voice note"}
          >
            {voiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {voiceListening ? "Listening — tap to stop" : "Record voice note"}
          </button>
          <textarea
            value={quickNotes}
            onChange={(e) => {
              setQuickNotes(e.target.value);
              setIsSaved(false);
            }}
            onKeyDown={diaryTyping.onKeyDown}
            onKeyUp={diaryTyping.onKeyUp}
            onFocus={diaryTyping.start}
            onBlur={() => diaryTyping.onBlur(quickNotes.length)}
            placeholder="e.g., Felt a bit annoyed this morning before my meeting, but then practiced deep breathing. After lunch, I felt much more grounded."
            aria-label="Quick Notes"
            className="w-full bg-page border border-line rounded-xl p-3 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-y"
          />
          
          {quickNoteTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickNoteTags.map((tag, idx) => (
                <span key={idx} className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-900/50">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !quickNotes.trim()}
              className="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-blue-900/50"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Asking Nila...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Ask Nila</>
              )}
            </button>
          </div>

          {crisis && (
            <CrisisCard id="diary-crisis" className="mt-4" heading="What you wrote matters more than this note right now" />
          )}

          {aiAnalysis && !crisis && (
            <div className="mt-4 bg-slate-900/50 border border-blue-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-blue-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Nila's Insights ✨</span>
              </div>
              <div className="text-sm text-ink-2 leading-relaxed markdown-body">
                <Markdown>{aiAnalysis}</Markdown>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <button
          onClick={handleSave}
          className={`w-full font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isSaved
              ? "bg-emerald-500 text-[#171311] font-bold"
              : "bg-blue-600 hover:bg-blue-500 text-white font-bold"
          }`}
          id="save-diary-btn"
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" /> Log Saved Successfully
            </>
          ) : (
            <>
              <Clipboard className="w-4 h-4" /> Save Diary Entry
            </>
          )}
        </button>
      </div>
    </div>
  );
}
