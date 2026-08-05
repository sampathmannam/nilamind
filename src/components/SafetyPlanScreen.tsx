import { secureLocal } from "../services/secureLocal";
import { useState, useEffect, useRef } from "react";
import { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";
import { parseSafetyPlan } from "../services/safetyPlan";
import { getCrisisLines } from "../services/crisisResources";
import {
  getMeansSafetyCategories,
  generateSafeEnvironmentBlock,
  type MeansCoachingProgress,
} from "../services/lethalMeansCoaching";
import { CheckCircle2, ChevronDown, ChevronRight, Save, Sparkles, Play, ArrowRight } from "lucide-react";
import { DEFAULT_LADDER, type SafetyLadderStep } from "../services/safetyPlanSkills";

const INITIAL_MEANS_PROGRESS: MeansCoachingProgress = {
  startedAt: 0,
  completedCategories: [],
  selectedStrategies: {},
  commitmentText: "",
  completed: false,
};

// `draft` holds the four coping fields the on-device model structured out of the chat (safetyPlanDraft).
// It only pre-fills fields that are currently EMPTY — it never overwrites a saved plan — and it is NOT
// persisted here: the person reviews every field and the existing save/edit path is what commits it.
// The model never drafts trustedPeople or professionals (contacts + crisis hotlines stay theirs / hardcoded).
export default function SafetyPlanScreen({ draft }: { draft?: Partial<Pick<SafetyPlan, "warningSigns" | "internalCoping" | "socialDistractors" | "safeEnvironment">> } = {}) {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>(INITIAL_SAFETY_PLAN);
  const [draftApplied, setDraftApplied] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCoaching, setShowCoaching] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [meansProgress, setMeansProgress] = useState<MeansCoachingProgress>(INITIAL_MEANS_PROGRESS);
  const [commitmentInput, setCommitmentInput] = useState("");

  useEffect(() => {
    const saved = secureLocal.getItem("nilamind_safetyplan");
    const base: SafetyPlan = saved
      ? parseSafetyPlan(saved) // defensive: recovers valid fields, never throws on a corrupt blob
      // Pre-fill the crisis-lines section with the user's region (editable, not yet persisted).
      : { ...INITIAL_SAFETY_PLAN, professionals: getCrisisLines().map((l) => `${l.name}: ${l.display}`).join("\n") };

    // Draft merge — fill ONLY empty coping fields from the chat draft; never overwrite saved content, and
    // never persist here (the person edits/saves themselves). Contacts + hotlines are untouched by design.
    let applied = false;
    for (const k of ["warningSigns", "internalCoping", "socialDistractors", "safeEnvironment"] as const) {
      if (draft?.[k] && !base[k]) { base[k] = draft[k] as string; applied = true; }
    }
    if (applied) setDraftApplied(true);
    setSafetyPlan(base);

    const savedCoaching = secureLocal.getItem("nilamind_means_coaching");
    if (savedCoaching) {
      try {
        const parsed = JSON.parse(savedCoaching);
        if (parsed && typeof parsed === "object" && typeof parsed.startedAt === "number") {
          setMeansProgress(parsed);
          if (parsed.startedAt > 0) setShowCoaching(true);
        }
      } catch { /* ignore corrupt data */ }
    }

    // Audit 2026-07-06 #7: the autosaved-status timeout was created inside an event handler and its cleanup
    // function was never wired up, so the timeout could fire after unmount and leak. Clear it on unmount.
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = null;
      }
    };
  }, []);

  const persistMeansProgress = (p: MeansCoachingProgress) => {
    setMeansProgress(p);
    secureLocal.setItem("nilamind_means_coaching", JSON.stringify(p));
  };

  const updateSection = (field: keyof SafetyPlan, value: string) => {
    const updated = { ...safetyPlan, [field]: value, lastUpdatedAt: Date.now() };
    setSafetyPlan(updated);
    secureLocal.setItem("nilamind_safetyplan", JSON.stringify(updated));
    setSavedStatus(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => {
      savedTimeoutRef.current = null;
      setSavedStatus(false);
    }, 1200);
  };

  const toggleCoaching = () => {
    if (!showCoaching) {
      persistMeansProgress({ ...meansProgress, startedAt: meansProgress.startedAt || Date.now() });
    }
    setShowCoaching(!showCoaching);
  };

  const toggleCategory = (catId: string) => {
    setExpandedCat(expandedCat === catId ? null : catId);
    if (!meansProgress.completedCategories.includes(catId)) {
      persistMeansProgress({
        ...meansProgress,
        completedCategories: [...meansProgress.completedCategories, catId],
      });
    }
  };

  const toggleStrategy = (catId: string, strategy: string) => {
    const current = meansProgress.selectedStrategies[catId] || [];
    const exists = current.includes(strategy);
    const updated = exists
      ? current.filter((s) => s !== strategy)
      : [...current, strategy];
    persistMeansProgress({
      ...meansProgress,
      selectedStrategies: { ...meansProgress.selectedStrategies, [catId]: updated },
    });
  };

  const handleGenerateSafeEnvironment = () => {
    const updatedProgress = {
      ...meansProgress,
      commitmentText: commitmentInput || meansProgress.commitmentText,
      completed: true,
    };
    persistMeansProgress(updatedProgress);
    const block = generateSafeEnvironmentBlock(updatedProgress);
    updateSection("safeEnvironment", safetyPlan.safeEnvironment
      ? safetyPlan.safeEnvironment + "\n\n" + block
      : block
    );
  };

  const categories = getMeansSafetyCategories();

  return (
    <div className="space-y-6 max-w-md mx-auto" id="safety-plan-screen">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-line">
        <div>
          <h1 className="text-xl font-semibold text-ink">My Safety Plan</h1>
          <p className="text-xs text-ink-faint">Your secure emergency dashboard</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-success" role="status" aria-live="polite">
          {savedStatus ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Autosaved</span>
            </>
          ) : (
            <span className="text-ink-faint flex items-center gap-1">
              <Save className="w-3.5 h-3.5 text-ink-faint" /> Idle
            </span>
          )}
        </div>
      </div>

      <div className="text-sm text-ink-2 leading-relaxed bg-card border-l-4 border-accent p-4 rounded-r-xl border-y border-r border-line/80">
        This plan stores everything strictly 100% locally on your phone. Fill this out during a calm moment so you have instant strategies when distress surges.
      </div>

      {draftApplied && (
        <div className="bg-warn/5 border border-warn/25 rounded-xl p-3" id="safety-plan-draft-note">
          <p className="text-base text-ink-2 leading-relaxed">
            <span className="font-semibold text-warn-hi">Started from our chat.</span> I filled in a few
            fields from what you told me — please read each one, change anything that isn't right, and add the
            people you'd reach out to yourself. Nothing is saved until you edit or save it.
          </p>
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-2">1. Warning signs I notice:</span>
            <span className="block text-xs text-ink-faint mt-0.5">
              Thoughts, moods, or situations that tell me things are getting hard
            </span>
          </label>
          <textarea
            value={safetyPlan.warningSigns}
            onChange={(e) => updateSection("warningSigns", e.target.value)}
            className="w-full h-24 bg-card border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
            placeholder="e.g. Staying up late scrolling, feeling minor comments hold extreme weight, withdrawing from text messages..."
            aria-label="1. Warning signs I notice:"
            id="sp-warningsigns-input"
          />
        </div>

        {/* Section 2 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-2">2. Things I can do on my own to cope:</span>
            <span className="block text-xs text-ink-faint mt-0.5">
              Strategies I can use by myself, without needing anyone else
            </span>
          </label>
          <textarea
            value={safetyPlan.internalCoping}
            onChange={(e) => updateSection("internalCoping", e.target.value)}
            className="w-full h-24 bg-card border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
            placeholder="e.g. Splash ice cold water on face for 10 seconds, or put on Fira Mono font, or do box breathing 4 counts..."
            aria-label="2. Things I can do on my own to cope:"
            id="sp-internalcoping-input"
          />
        </div>

        {/* Section 3 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-2">3. People and places that distract me:</span>
            <span className="block text-xs text-ink-faint mt-0.5">
              Who or where helps take my mind off things
            </span>
          </label>
          <textarea
            value={safetyPlan.socialDistractors}
            onChange={(e) => updateSection("socialDistractors", e.target.value)}
            className="w-full h-24 bg-card border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
            placeholder="e.g. Taking a walk down the high-contrast street, going to a busy local botanical park, or listening to ambient audio loops..."
            aria-label="3. People and places that distract me:"
            id="sp-distractors-input"
          />
        </div>

        {/* Section 4 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-2">4. People I can reach out to for help:</span>
            <span className="block text-xs text-ink-faint mt-0.5">
              Name and phone number of people I trust
            </span>
          </label>
          <textarea
            value={safetyPlan.trustedPeople}
            onChange={(e) => updateSection("trustedPeople", e.target.value)}
            className="w-full h-24 bg-card border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
            placeholder="e.g. Maya (+91 xxxxxxxxxx) - call anytime. John - text if feeling numb..."
            aria-label="4. People I can reach out to for help:"
            id="sp-trustedpeople-input"
          />
        </div>

        {/* Section 5 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-2">5. Professionals and crisis lines:</span>
            <span className="block text-xs text-ink-faint mt-0.5">
              Crisis lines for your region — pre-filled, edit freely
            </span>
          </label>
          <textarea
            value={safetyPlan.professionals}
            onChange={(e) => updateSection("professionals", e.target.value)}
            className="w-full h-24 bg-card border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none font-mono text-xs"
            placeholder="e.g. a local crisis line, your doctor, or therapist…"
            aria-label="5. Professionals and crisis lines:"
            id="sp-professionals-input"
          />
        </div>

        {/* Section 6 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-2">6. Making my space safer:</span>
            <span className="block text-xs text-ink-faint mt-0.5">
              Steps I can take to make my environment safer right now
            </span>
          </label>
          <textarea
            value={safetyPlan.safeEnvironment}
            onChange={(e) => updateSection("safeEnvironment", e.target.value)}
            className="w-full h-24 bg-card border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
            placeholder="e.g. Locking medications away, deleting social media venting apps, throwing out blades or cleaning instruments..."
            aria-label="6. Making my space safer:"
            id="sp-safeenvironment-input"
          />
        </div>
      </div>

      {/* Means safety coaching (Phase 7 — Lethal Means Counseling) */}
      <div className="border-t border-line/50 pt-4">
        <button
          onClick={toggleCoaching}
          className="w-full flex items-center gap-2 text-left text-sm font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer"
          id="sp-means-coaching-toggle"
        >
          {showCoaching ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Sparkles className="w-4 h-4 text-accent" />
          Means safety coaching (optional)
          {meansProgress.completedCategories.length > 0 && (
            <span className="ml-auto text-xs text-success">
              {meansProgress.completedCategories.length} explored
            </span>
          )}
        </button>

        {showCoaching && (
          <div className="mt-4 space-y-4">
            <p className="text-base text-ink-muted leading-relaxed">
              A calm, no-pressure look at your home environment. The idea is simple: in a really tough moment,
              having easy access to things that could cause harm can make things harder. This is about small
              adjustments — not getting rid of things you need. Explore the categories below, one at a time.
            </p>

            {/* Category cards */}
            <div className="space-y-2">
              {categories.map((cat) => {
                const isExpanded = expandedCat === cat.id;
                const isDone = meansProgress.completedCategories.includes(cat.id);
                const selectedStrat = meansProgress.selectedStrategies[cat.id] || [];
                return (
                  <div
                    key={cat.id}
                    className="bg-card border border-line rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-2 hover:bg-fill/30 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                      <span className="flex-1">{cat.label}</span>
                      {isDone && <span className="text-xs text-success">Done</span>}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-3 text-xs text-ink-muted">
                        <p>{cat.description}</p>
                        <div className="text-ink-faint">
                          <span className="text-ink-muted">Examples: </span>
                          {cat.examples.join(", ")}
                        </div>
                        <p className="text-ink-2 italic">{cat.collaborativePrompt}</p>

                        {/* Strategies */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-ink-2 font-medium">Ideas that have helped others:</p>
                          {cat.strategies.map((s) => (
                            <label
                              key={s}
                              className="flex items-start gap-2 cursor-pointer hover:text-ink-2 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedStrat.includes(s)}
                                onChange={() => toggleStrategy(cat.id, s)}
                                className="mt-0.5 accent-violet-500 cursor-pointer"
                              />
                              <span>{s}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Commitment */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-ink-2">
                One small step I'd like to take (optional)
              </label>
              <textarea
                value={commitmentInput || meansProgress.commitmentText}
                onChange={(e) => setCommitmentInput(e.target.value)}
                className="w-full h-16 bg-card border border-line rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
                placeholder="e.g. I'll ask my brother to hold my medication and give me a weekly supply."
              />
            </div>

            {/* Generate section 6 block */}
            <button
              onClick={handleGenerateSafeEnvironment}
              className="w-full px-3 py-2 rounded-xl bg-accent/20 hover:opacity-90/30 text-accent-hi text-sm font-medium transition-colors cursor-pointer"
              id="sp-generate-safeenv-btn"
            >
              Add to section 6 above
            </button>
          </div>
        )}

        {/* Skills Ladder — Feature 11 / Phase J: ordered crisis-response steps.
            Evidence: Bryan et al. 2017, Rizvi et al. 2016. Pure data, no LLM involvement. */}
        <div className="space-y-3 bg-card p-4 rounded-xl border border-line" id="skills-ladder">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <Play className="w-4 h-4 text-accent" />
            Skills Ladder
          </h3>
          <p className="text-xs text-ink-muted">
            When crisis hits, follow these steps in order. Each one builds on the last.
          </p>
          <div className="space-y-2">
            {DEFAULT_LADDER.map((step, i) => (
              <div key={step.skillId} className="flex items-start gap-3 p-2 rounded-lg bg-page border border-line/50">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{step.label}</span>
                    {step.duration && (
                      <span className="text-[10px] text-ink-faint bg-fill px-1.5 py-0.5 rounded">{step.duration}</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">{step.instructions}</p>
                </div>
                {i < DEFAULT_LADDER.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-ink-faint mt-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
