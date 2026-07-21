import { localDateKey } from "../services/storageUtils";
import { useState, useEffect } from "react";
import {
  BA_CATEGORIES,
  ACTIVITY_MENU,
  BACategory,
  BAActivityLog,
  ActivityIdea,
  loadActivities,
  upsertActivity,
  categoryMeta,
  computeInsight,
  BAInsight,
} from "../services/behaviouralActivation";
import {
  VALUE_DOMAINS,
  ValuesSnapshot,
  DomainRating,
  CommittedAction,
  loadValues,
  saveValues,
  loadActions,
  upsertAction,
  computeGaps,
  domainLabel,
} from "../services/values";
import { toDoList, DoItem } from "../services/valuesToAction";
import {
  Compass,
  Target,
  Plus,
  Check,
  X,
  Pencil,
  ChevronLeft,
  ArrowRight,
  CalendarClock,
  TrendingUp,
  Footprints,
} from "lucide-react";
import { hapticLight, hapticSuccess } from "../hooks/useHaptics";

// "Values to Action" — zero-migration merge of the Values Compass (WHY: what matters, where life has
// drifted) and Behavioural Activation (DO: act before the mood catches up). All three legacy stores
// are untouched: nilamind_values (snapshot), nilamind_values_actions (va_ steps),
// nilamind_ba_activities (ba_ activities). This screen only composes them into one Why→Do flow.

const TONE: Record<string, { text: string; bg: string; border: string; bar: string; chipOn: string }> = {
  emerald: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40", bar: "bg-emerald-500", chipOn: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200" },
  sky: { text: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/40", bar: "bg-sky-500", chipOn: "bg-sky-500/20 border-sky-500/50 text-sky-200" },
  amber: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/40", bar: "bg-amber-500", chipOn: "bg-amber-500/20 border-amber-500/50 text-amber-200" },
  purple: { text: "text-purple-300", bg: "bg-purple-500/10", border: "border-purple-500/40", bar: "bg-purple-500", chipOn: "bg-purple-500/20 border-purple-500/50 text-purple-200" },
  rose: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/40", bar: "bg-rose-500", chipOn: "bg-rose-500/20 border-rose-500/50 text-rose-200" },
};

const todayStr = () => localDateKey();

const emptyDraft = (): Record<string, DomainRating> => {
  const d: Record<string, DomainRating> = {};
  for (const dom of VALUE_DOMAINS) d[dom.id] = { importance: 5, consistency: 5 };
  return d;
};

// `highlightDomains` are value areas the on-device model noticed the person talking about (valuesDraft).
// They're surfaced as a gentle starting point — NEVER pre-rated. The person still rates every domain; ACT
// values are self-chosen, so the model only points at what came up, it doesn't decide what matters.
export default function ValuesToActionScreen({ highlightDomains = [] }: { highlightDomains?: string[] } = {}) {
  // ── Values (WHY) state ──
  const [snapshot, setSnapshot] = useState<ValuesSnapshot | null>(null);
  const [valuesMode, setValuesMode] = useState<"rate" | "review">("rate");
  const [draft, setDraft] = useState<Record<string, DomainRating>>(emptyDraft());
  const [actions, setActions] = useState<CommittedAction[]>([]);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");
  // Progressive values (2026-07-18 design review): rather than 20 sliders (10 domains × 2) presented at
  // once, first pick the areas that matter, then rate only those. Unpicked domains keep the neutral 5/5
  // default in the saved snapshot, so VLQ scoring + computeGaps are unchanged — a neutral domain simply
  // shows no gap. Highlighted-from-chat domains start pre-selected.
  const [rateStep, setRateStep] = useState<"select" | "rate">("select");
  const [selectedDomains, setSelectedDomains] = useState<string[]>(
    () => highlightDomains.filter((id) => VALUE_DOMAINS.some((d) => d.id === id)),
  );

  // ── Activities (DO) state ──
  const [activities, setActivities] = useState<BAActivityLog[]>([]);
  const [selectedCat, setSelectedCat] = useState<BACategory>("movement");
  const [picked, setPicked] = useState<ActivityIdea | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [rating, setRating] = useState<
    { title: string; category: BACategory; existingId?: string; mastery: number; pleasure: number; moodAfter: number; note: string } | null
  >(null);
  // Mood BEFORE the activity — the pre-rating half of BA's before/after mood loop (Jacobson, Martell &
  // Dimidjian, 2001, Clin Psychol Sci Pract) — the ingredient most commercial apps omit.
  const [moodBefore, setMoodBefore] = useState(5);

  useEffect(() => {
    const snap = loadValues();
    setActions(loadActions());
    setActivities(loadActivities());
    if (snap) {
      setSnapshot(snap);
      setDraft({ ...emptyDraft(), ...snap.ratings });
      setValuesMode("review");
    } else {
      setValuesMode("rate");
    }
  }, []);

  // ── Values handlers ──
  const setRatingFor = (domainId: string, key: keyof DomainRating, value: number) => {
    setDraft((prev) => ({ ...prev, [domainId]: { ...prev[domainId], [key]: value } }));
  };
  const toggleDomain = (id: string) => {
    setSelectedDomains((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    hapticLight();
  };
  // Re-entering rate mode from review (Edit): jump straight to rating the domains the person previously
  // cared about (rated off-neutral); if none, fall back to the picker.
  const startEditRatings = () => {
    const rated = VALUE_DOMAINS.filter((d) => {
      const r = draft[d.id];
      return r && (r.importance !== 5 || r.consistency !== 5);
    }).map((d) => d.id);
    setSelectedDomains(rated.length > 0 ? rated : VALUE_DOMAINS.map((d) => d.id));
    setRateStep(rated.length > 0 ? "rate" : "select");
    setValuesMode("rate");
  };
  const saveCompass = () => {
    const snap: ValuesSnapshot = { date: todayStr(), timestamp: new Date().toLocaleTimeString(), ratings: draft };
    saveValues(snap);
    setSnapshot(snap);
    setValuesMode("review");
    hapticSuccess();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const addAction = (domainId: string) => {
    if (!actionText.trim()) return;
    const entry: CommittedAction = {
      id: "va_" + Date.now(),
      date: todayStr(),
      domainId,
      action: actionText.trim(),
      status: "open",
    };
    setActions(upsertAction(entry));
    setActionText("");
    setAddingFor(null);
  };
  const markStepDone = (a: CommittedAction) => {
    setActions(upsertAction({ ...a, status: "done", doneDate: todayStr() }));
    hapticLight();
  };

  // ── Activity handlers ──
  const resetChoice = () => { setPicked(null); setCustomTitle(""); };
  const chosenTitle = picked?.title ?? (customTitle.trim() || null);
  const chosenCategory: BACategory = picked?.category ?? selectedCat;
  const menu = ACTIVITY_MENU.filter((a) => a.category === selectedCat);

  const planForLater = () => {
    if (!chosenTitle) return;
    const entry: BAActivityLog = {
      id: "ba_" + Date.now(),
      date: todayStr(),
      timestamp: new Date().toLocaleTimeString(),
      title: chosenTitle,
      category: chosenCategory,
      status: "planned",
      moodBefore,
    };
    setActivities(upsertActivity(entry));
    hapticLight();
    resetChoice();
    setMoodBefore(5);
  };
  const startRating = (title: string, category: BACategory, existingId?: string) => {
    setRating({ title, category, existingId, mastery: 5, pleasure: 5, moodAfter: 5, note: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveRating = () => {
    if (!rating) return;
    // If this activity was already planned (has a moodBefore from planForLater), preserve it — never
    // clobber the pre-rating with the picking-screen's current slider position.
    const existing = rating.existingId ? activities.find((a) => a.id === rating.existingId) : undefined;
    const entry: BAActivityLog = {
      id: rating.existingId ?? "ba_" + Date.now(),
      date: todayStr(),
      timestamp: new Date().toLocaleTimeString(),
      title: rating.title,
      category: rating.category,
      status: "done",
      mastery: rating.mastery,
      pleasure: rating.pleasure,
      moodAfter: rating.moodAfter,
      moodBefore: existing?.moodBefore ?? (rating.existingId ? undefined : moodBefore),
      note: rating.note.trim() || undefined,
    };
    setActivities(upsertActivity(entry));
    hapticSuccess();
    setRating(null);
    resetChoice();
    setMoodBefore(5);
  };
  const skipPlanned = (id: string) => {
    const a = activities.find((x) => x.id === id);
    if (!a) return;
    setActivities(upsertActivity({ ...a, status: "skipped" }));
  };

  // ── Derived ──
  const insight: BAInsight = computeInsight(activities);
  const gaps = computeGaps(snapshot);
  // Unified DO list (open work first), via the pure helper so both record shapes round-trip.
  const doItems: DoItem[] = toDoList(activities, actions);
  const todo = doItems.filter((i) => !i.done && !i.skipped);
  const completed = doItems.filter((i) => i.done).slice(0, 8);

  // ── RATING PANEL (takes over the top when active) ──
  if (rating) {
    const tone = TONE[categoryMeta(rating.category).tone];
    return (
      <div className="space-y-5 max-w-md mx-auto" id="vta-rating">
        <header className="space-y-1">
          <h2 className="text-lg font-bold text-ink">How was it?</h2>
          <p className="text-xs text-ink-muted">You did: <span className={`font-semibold ${tone.text}`}>{rating.title}</span>. That counts — you acted before the mood caught up.</p>
        </header>
        <RatingSlider label="Mastery" help="A sense of accomplishment or 'I did that' — even small." value={rating.mastery} onChange={(v) => setRating({ ...rating, mastery: v })} />
        <RatingSlider label="Pleasure" help="How enjoyable or soothing it felt, even slightly." value={rating.pleasure} onChange={(v) => setRating({ ...rating, pleasure: v })} />
        <RatingSlider label="Mood after" help="How's your mood right now, after doing it? Comparing before/after is how BA actually works." value={rating.moodAfter} onChange={(v) => setRating({ ...rating, moodAfter: v })} />
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold">Note (optional)</label>
          <textarea aria-label="Note (optional)" value={rating.note} onChange={(e) => setRating({ ...rating, note: e.target.value })} placeholder="Anything you noticed…" className="w-full bg-page border border-line rounded-xl p-3 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 min-h-[60px] resize-y" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRating(null)} className="flex-1 glass hover:bg-raised text-ink-2 font-semibold py-3 rounded-xl text-sm cursor-pointer">Cancel</button>
          <button onClick={saveRating} id="vta-save-rating" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Log it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto" id="vta-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
          <Compass className="w-5 h-5 text-rose-400" /> Values to Action
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed">
          Start with <span className="text-ink-2 font-semibold">why</span> — what matters and where
          life has drifted from it — then take one small step. You act first, in tiny steps, and let
          the feeling catch up. You don't have to feel like it.
        </p>
      </header>

      {/* ═══ WHY — Values compass ═══ */}
      <section className="space-y-3" id="vta-why">
        {valuesMode === "rate" ? (
          <>
            {rateStep === "rate" && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                <p className="text-xs text-ink-faint leading-relaxed">
                  For each area, rate how <span className="text-ink-2 font-semibold">important</span> it is
                  to you and how <span className="text-ink-2 font-semibold">consistently</span> you've lived
                  it recently. There are no right answers and no judgement. (Structure: Valued Living
                  Questionnaire, Wilson et al., 2010; ACT, Hayes et al., 2011)
                </p>
              </div>
            )}
            {highlightDomains.length > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3" id="vta-highlight-note">
                <p className="text-xs text-ink-muted leading-relaxed">
                  These came up when we talked:{" "}
                  <span className="text-ink-2 font-semibold">
                    {VALUE_DOMAINS.filter((d) => highlightDomains.includes(d.id)).map((d) => d.label).join(", ")}
                  </span>
                  . A natural place to start — but rate whatever feels right to you.
                </p>
              </div>
            )}
            {rateStep === "select" ? (
              /* Step 1 — pick the areas that matter most right now (design review 2026-07-18: don't open on
                 20 sliders). Highlighted-from-chat domains start selected. */
              <>
                <p className="text-sm font-semibold text-ink-2 px-0.5">Which areas matter most right now?</p>
                <div className="flex flex-wrap gap-2" id="vta-domain-picker">
                  {VALUE_DOMAINS.map((dom) => {
                    const on = selectedDomains.includes(dom.id);
                    return (
                      <button
                        key={dom.id}
                        onClick={() => toggleDomain(dom.id)}
                        aria-pressed={on}
                        id={`vta-pick-${dom.id}`}
                        className={`px-3.5 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                          on ? "bg-rose-500/20 border-rose-500/50 text-rose-200 font-semibold" : "bg-page border-line text-ink-2 hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        {dom.label}
                        {on && <Check className="w-3.5 h-3.5 inline ml-1.5 -mt-0.5" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDomains(VALUE_DOMAINS.map((d) => d.id))}
                    className="flex-1 glass hover:bg-raised text-ink-2 font-semibold py-3 rounded-xl text-sm cursor-pointer"
                  >
                    Rate all
                  </button>
                  <button
                    onClick={() => { if (selectedDomains.length > 0) setRateStep("rate"); }}
                    disabled={selectedDomains.length === 0}
                    id="vta-pick-continue"
                    className="flex-[2] bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    Rate {selectedDomains.length > 0 ? `these ${selectedDomains.length}` : "these"} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              /* Step 2 — rate only the chosen areas. Unpicked domains keep 5/5 in the snapshot (no gap). */
              <>
                <button
                  onClick={() => setRateStep("select")}
                  className="text-[11px] font-semibold text-ink-muted hover:text-ink flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Choose areas ({selectedDomains.length})
                </button>
                <div className="space-y-3">
                  {VALUE_DOMAINS.filter((d) => selectedDomains.includes(d.id)).map((dom) => {
                    const r = draft[dom.id];
                    return (
                      <div key={dom.id} className={`glass rounded-2xl p-4 space-y-3 ${highlightDomains.includes(dom.id) ? "ring-1 ring-blue-400/40" : ""}`} id={`vta-domain-${dom.id}`}>
                        <div>
                          <h3 className="text-sm font-bold text-ink">{dom.label}</h3>
                          <p className="text-xs text-ink-faint italic">{dom.examples}</p>
                        </div>
                        <CompactSlider label="Importance" tone="rose" value={r.importance} onChange={(v) => setRatingFor(dom.id, "importance", v)} />
                        <CompactSlider label="Lived recently" tone="sky" value={r.consistency} onChange={(v) => setRatingFor(dom.id, "consistency", v)} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  {snapshot && (
                    <button onClick={() => setValuesMode("review")} className="flex-1 glass hover:bg-raised text-ink-2 font-semibold py-3 rounded-xl text-sm cursor-pointer">Cancel</button>
                  )}
                  <button onClick={saveCompass} id="vta-values-save" className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2"><Check className="w-4 h-4" /> See where to focus</button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs uppercase font-mono tracking-widest text-ink-muted flex items-center gap-1.5 pt-1">
                <Target className="w-3.5 h-3.5" /> Why — highest-leverage areas
              </h3>
              <button onClick={startEditRatings} className="shrink-0 text-[11px] font-semibold text-ink-muted hover:text-ink flex items-center gap-1 cursor-pointer glass rounded-lg px-2.5 py-1.5">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
            {gaps.length === 0 ? (
              <div className="glass rounded-2xl p-4">
                <p className="text-xs text-ink-muted leading-relaxed">
                  No big gaps showing between what you value and how you're living — or nothing rated as
                  highly important yet. Tap <span className="text-ink-2 font-semibold">Edit</span> any time.
                </p>
              </div>
            ) : (
              <div className="space-y-3" id="vta-gaps">
                {gaps.slice(0, 4).map((g) => (
                  <div key={g.domainId} className="glass rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-ink">{g.label}</span>
                      {g.gap > 0 && (
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">gap {g.gap}</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <GapBar label="Matters to you" value={g.importance} tone="rose" />
                      <GapBar label="Lived recently" value={g.consistency} tone="sky" />
                    </div>
                    {addingFor === g.domainId ? (
                      <div className="space-y-2 pt-1">
                        <input aria-label="One small step" value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder={`One small "toward" step for ${g.label.toLowerCase()}…`} className="w-full bg-page border border-line rounded-xl px-3 py-2.5 text-xs text-ink-2 placeholder-slate-600 focus:outline-none focus:border-rose-500/50" autoFocus />
                        <div className="flex gap-2">
                          <button onClick={() => { setAddingFor(null); setActionText(""); }} className="flex-1 bg-page border border-line text-ink-muted text-xs py-2 rounded-lg cursor-pointer">Cancel</button>
                          <button onClick={() => addAction(g.domainId)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 rounded-lg cursor-pointer">Add step</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingFor(g.domainId); setActionText(""); }} className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> Choose a small step
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ═══ DO — pick an activity ═══ */}
      <section className="space-y-3" id="vta-do">
        <h3 className="text-xs uppercase font-mono tracking-widest text-ink-muted flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-emerald-400" /> Do — one small thing
        </h3>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-xs text-ink-faint leading-relaxed">
            Acting on a plan rather than a mood is the core of Behavioural Activation, which on its own
            matches full CBT and antidepressants for depression. (Jacobson et al., 1996; Dimidjian et
            al., 2006; Ekers et al., 2014)
          </p>
        </div>

        {insight.done > 0 && (
          <div className="glass rounded-2xl p-4 space-y-3" id="vta-insight">
            <h4 className="text-xs uppercase font-mono tracking-widest text-ink-muted flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Your pattern · {insight.done} done
            </h4>
            {insight.avgMastery !== null && insight.avgPleasure !== null ? (
              <div className="space-y-2">
                <MiniBar label="Avg mastery" value={insight.avgMastery} tone="amber" />
                <MiniBar label="Avg pleasure" value={insight.avgPleasure} tone="purple" />
              </div>
            ) : (
              <p className="text-[11px] text-ink-faint">Rate a few activities to see what lifts you most.</p>
            )}
            {insight.topCategory && (
              <p className="text-[11px] text-ink-2 leading-relaxed">
                So far, <span className={`font-semibold ${TONE[categoryMeta(insight.topCategory.id).tone].text}`}>{insight.topCategory.label}</span> activities have given you the most mastery + pleasure combined. Worth leaning into.
              </p>
            )}
          </div>
        )}

        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {BA_CATEGORIES.map((c) => {
              const on = selectedCat === c.id;
              const tone = TONE[c.tone];
              return (
                <button key={c.id} id={`vta-cat-${c.id}`} onClick={() => { setSelectedCat(c.id); setPicked(null); }} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${on ? tone.chipOn : "bg-page border-line text-ink-muted hover:text-ink-2"}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-faint italic">{categoryMeta(selectedCat).blurb}</p>
          <div className="space-y-1.5">
            {menu.map((idea) => {
              const on = picked?.title === idea.title;
              return (
                <button key={idea.title} onClick={() => { setPicked(on ? null : idea); setCustomTitle(""); }} className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${on ? "bg-blue-600/20 border-blue-500/50" : "bg-page border-line hover:border-line-strong"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${on ? "text-blue-200" : "text-ink-2"}`}>{idea.title}</span>
                    {on && <Check className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
                  </div>
                  <span className="text-xs text-ink-faint">Tiny version: {idea.tiny}</span>
                </button>
              );
            })}
          </div>
          <input aria-label="Write your own activity" value={customTitle} onChange={(e) => { setCustomTitle(e.target.value); setPicked(null); }} placeholder="…or write your own" className="w-full bg-page border border-line rounded-xl px-3 py-2.5 text-xs text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          {chosenTitle && (
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-ink-muted">How are you feeling right now? (optional)</span>
                  <span className="font-mono text-ink-2">{moodBefore}/10</span>
                </div>
                <input aria-label="How are you feeling right now?" type="range" min={0} max={10} value={moodBefore} onChange={(e) => setMoodBefore(parseInt(e.target.value))} className="w-full h-1.5 rounded-lg bg-page accent-blue-500 cursor-pointer" />
              </div>
              <div className="flex gap-2">
                <button onClick={planForLater} id="vta-plan-btn" className="flex-1 bg-raised border border-line-strong hover:bg-fill text-ink-2 font-semibold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Plan for later</button>
                <button onClick={() => startRating(chosenTitle, chosenCategory)} id="vta-did-btn" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> I did this</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Unified TO-DO list (activities + committed steps) ═══ */}
      {todo.length > 0 && (
        <section className="space-y-2" id="vta-todo">
          <h3 className="text-xs uppercase font-mono tracking-widest text-ink-muted">To do</h3>
          {todo.map((item) =>
            item.kind === "activity" && item.activity ? (
              <div key={item.id} className="glass rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs text-ink-2 font-medium">{item.title}</span>
                  <span className={`block text-xs ${TONE[categoryMeta(item.activity.category).tone].text}`}>{categoryMeta(item.activity.category).label}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => startRating(item.activity!.title, item.activity!.category, item.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer">Done</button>
                  <button aria-label="Skip this activity" onClick={() => skipPlanned(item.id)} className="bg-page border border-line text-ink-faint hover:text-ink-2 text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ) : item.kind === "step" && item.step ? (
              <div key={item.id} className="glass rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs text-ink-2">{item.title}</span>
                  <span className="block text-xs text-rose-300 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {domainLabel(item.step.domainId)}</span>
                </div>
                <button onClick={() => markStepDone(item.step!)} className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Done</button>
              </div>
            ) : null,
          )}
        </section>
      )}

      {/* ═══ Recently done (both kinds) ═══ */}
      {completed.length > 0 && (
        <section className="space-y-2" id="vta-done">
          <h3 className="text-xs uppercase font-mono tracking-widest text-slate-600">You acted</h3>
          {completed.map((item) =>
            item.kind === "activity" && item.activity ? (
              <div key={item.id} className={`rounded-xl p-3 border ${TONE[categoryMeta(item.activity.category).tone].bg} ${TONE[categoryMeta(item.activity.category).tone].border}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-2 font-medium">{item.title}</span>
                  <span className="text-xs text-ink-faint">{item.date.slice(5)}</span>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs">
                  <span className="text-amber-300">Mastery {item.activity.mastery ?? "–"}/10</span>
                  <span className="text-purple-300">Pleasure {item.activity.pleasure ?? "–"}/10</span>
                  {typeof item.activity.moodBefore === "number" && typeof item.activity.moodAfter === "number" && (
                    <span className="text-blue-300">Mood {item.activity.moodBefore}→{item.activity.moodAfter}</span>
                  )}
                </div>
                {item.activity.note && <p className="text-[11px] text-ink-muted mt-1.5 italic">"{item.activity.note}"</p>}
              </div>
            ) : item.kind === "step" && item.step ? (
              <div key={item.id} className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-ink-2 line-through decoration-slate-600">{item.title}</span>
                <span className="ml-auto text-xs text-emerald-400/70">{domainLabel(item.step.domainId)}</span>
              </div>
            ) : null,
          )}
        </section>
      )}
    </div>
  );
}

function RatingSlider({ label, help, value, onChange }: { label: string; help: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-bold text-ink">{label}</span>
        <span className="font-mono text-blue-400 text-sm">{value} / 10</span>
      </div>
      <p className="text-[11px] text-ink-faint">{help}</p>
      <input aria-label={label} type="range" min={0} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 rounded-lg bg-page accent-blue-500 cursor-pointer" />
    </div>
  );
}

function CompactSlider({ label, value, onChange, tone }: { label: string; value: number; onChange: (v: number) => void; tone: "rose" | "sky" }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-ink-muted">{label}</span>
        <span className={`font-mono ${TONE[tone].text}`}>{value}/10</span>
      </div>
      <input aria-label={label} type="range" min={0} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className={`w-full h-1.5 rounded-lg bg-page cursor-pointer ${tone === "rose" ? "accent-rose-500" : "accent-sky-500"}`} />
    </div>
  );
}

function GapBar({ label, value, tone }: { label: string; value: number; tone: "rose" | "sky" }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-ink-muted">{label}</span>
        <span className={TONE[tone].text}>{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-page overflow-hidden">
        <div className={`h-full ${TONE[tone].bar} rounded-full`} style={{ width: `${Math.round((value / 10) * 100)}%` }} />
      </div>
    </div>
  );
}

function MiniBar({ label, value, tone }: { label: string; value: number; tone: "amber" | "purple" }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-ink-muted">{label}</span>
        <span className={TONE[tone].text}>{value.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-page overflow-hidden">
        <div className={`h-full ${TONE[tone].bar} rounded-full`} style={{ width: `${Math.round((value / 10) * 100)}%` }} />
      </div>
    </div>
  );
}
