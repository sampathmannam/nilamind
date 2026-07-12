import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect, useRef } from "react";
import { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";
import { parseSafetyPlan } from "../services/safetyPlan";
import { getCrisisLines } from "../services/crisisResources";
import {
  getMeansSafetyCategories,
  generateSafeEnvironmentBlock,
  type MeansCoachingProgress,
} from "../services/lethalMeansCoaching";
import { CheckCircle2, ChevronDown, ChevronRight, Save, Sparkles } from "lucide-react";

const INITIAL_MEANS_PROGRESS: MeansCoachingProgress = {
  startedAt: 0,
  completedCategories: [],
  selectedStrategies: {},
  commitmentText: "",
  completed: false,
};

export default function SafetyPlanScreen() {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>(INITIAL_SAFETY_PLAN);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCoaching, setShowCoaching] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [meansProgress, setMeansProgress] = useState<MeansCoachingProgress>(INITIAL_MEANS_PROGRESS);
  const [commitmentInput, setCommitmentInput] = useState("");

  useEffect(() => {
    const saved = secureLocal.getItem("nilamind_safetyplan");
    if (saved) {
      setSafetyPlan(parseSafetyPlan(saved)); // defensive: recovers valid fields, never throws on a corrupt blob
    } else {
      // Pre-fill the crisis-lines section with the user's region (editable, not yet persisted).
      const lines = getCrisisLines().map((l) => `${l.name}: ${l.display}`).join("\n");
      setSafetyPlan((p) => ({ ...p, professionals: lines }));
    }

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
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">My Safety Plan</h1>
          <p className="text-xs text-slate-500">Your secure emergency dashboard</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          {savedStatus ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Autosaved</span>
            </>
          ) : (
            <span className="text-slate-500 flex items-center gap-1">
              <Save className="w-3.5 h-3.5 text-slate-500" /> Idle
            </span>
          )}
        </div>
      </div>

      <div className="text-sm text-slate-300 leading-relaxed bg-card border-l-4 border-blue-500 p-4 rounded-r-xl border-y border-r border-slate-800/80">
        This plan stores everything strictly 100% locally on your phone. Fill this out during a calm moment so you have instant strategies when distress surges.
      </div>

      {/* Form sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">1. Warning signs I notice:</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Thoughts, moods, or situations that tell me things are getting hard
            </span>
          </label>
          <textarea
            value={safetyPlan.warningSigns}
            onChange={(e) => updateSection("warningSigns", e.target.value)}
            className="w-full h-24 bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
            placeholder="e.g. Staying up late scrolling, feeling minor comments hold extreme weight, withdrawing from text messages..."
            aria-label="1. Warning signs I notice:"
            id="sp-warningsigns-input"
          />
        </div>

        {/* Section 2 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">2. Things I can do on my own to cope:</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Strategies I can use by myself, without needing anyone else
            </span>
          </label>
          <textarea
            value={safetyPlan.internalCoping}
            onChange={(e) => updateSection("internalCoping", e.target.value)}
            className="w-full h-24 bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
            placeholder="e.g. Splash ice cold water on face for 10 seconds, or put on Fira Mono font, or do box breathing 4 counts..."
            aria-label="2. Things I can do on my own to cope:"
            id="sp-internalcoping-input"
          />
        </div>

        {/* Section 3 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">3. People and places that distract me:</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Who or where helps take my mind off things
            </span>
          </label>
          <textarea
            value={safetyPlan.socialDistractors}
            onChange={(e) => updateSection("socialDistractors", e.target.value)}
            className="w-full h-24 bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
            placeholder="e.g. Taking a walk down the high-contrast street, going to a busy local botanical park, or listening to ambient audio loops..."
            aria-label="3. People and places that distract me:"
            id="sp-distractors-input"
          />
        </div>

        {/* Section 4 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">4. People I can reach out to for help:</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Name and phone number of people I trust
            </span>
          </label>
          <textarea
            value={safetyPlan.trustedPeople}
            onChange={(e) => updateSection("trustedPeople", e.target.value)}
            className="w-full h-24 bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
            placeholder="e.g. Maya (+91 xxxxxxxxxx) - call anytime. John - text if feeling numb..."
            aria-label="4. People I can reach out to for help:"
            id="sp-trustedpeople-input"
          />
        </div>

        {/* Section 5 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">5. Professionals and crisis lines:</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Crisis lines for your region — pre-filled, edit freely
            </span>
          </label>
          <textarea
            value={safetyPlan.professionals}
            onChange={(e) => updateSection("professionals", e.target.value)}
            className="w-full h-24 bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none font-mono text-xs"
            placeholder="e.g. a local crisis line, your doctor, or therapist…"
            aria-label="5. Professionals and crisis lines:"
            id="sp-professionals-input"
          />
        </div>

        {/* Section 6 */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">6. Making my space safer:</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Steps I can take to make my environment safer right now
            </span>
          </label>
          <textarea
            value={safetyPlan.safeEnvironment}
            onChange={(e) => updateSection("safeEnvironment", e.target.value)}
            className="w-full h-24 bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
            placeholder="e.g. Locking medications away, deleting social media venting apps, throwing out blades or cleaning instruments..."
            aria-label="6. Making my space safer:"
            id="sp-safeenvironment-input"
          />
        </div>
      </div>

      {/* Means safety coaching (Phase 7 — Lethal Means Counseling) */}
      <div className="border-t border-slate-800/50 pt-4">
        <button
          onClick={toggleCoaching}
          className="w-full flex items-center gap-2 text-left text-sm font-medium text-slate-200 hover:text-slate-100 transition-colors cursor-pointer"
          id="sp-means-coaching-toggle"
        >
          {showCoaching ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Sparkles className="w-4 h-4 text-violet-400" />
          Means safety coaching (optional)
          {meansProgress.completedCategories.length > 0 && (
            <span className="ml-auto text-xs text-emerald-400">
              {meansProgress.completedCategories.length} explored
            </span>
          )}
        </button>

        {showCoaching && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
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
                    className="bg-card border border-slate-800 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                      <span className="flex-1">{cat.label}</span>
                      {isDone && <span className="text-xs text-emerald-400">Done</span>}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-3 text-xs text-slate-400">
                        <p>{cat.description}</p>
                        <div className="text-slate-500">
                          <span className="text-slate-400">Examples: </span>
                          {cat.examples.join(", ")}
                        </div>
                        <p className="text-slate-300 italic">{cat.collaborativePrompt}</p>

                        {/* Strategies */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-slate-300 font-medium">Ideas that have helped others:</p>
                          {cat.strategies.map((s) => (
                            <label
                              key={s}
                              className="flex items-start gap-2 cursor-pointer hover:text-slate-200 transition-colors"
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
              <label className="block text-xs font-medium text-slate-300">
                One small step I'd like to take (optional)
              </label>
              <textarea
                value={commitmentInput || meansProgress.commitmentText}
                onChange={(e) => setCommitmentInput(e.target.value)}
                className="w-full h-16 bg-card border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all resize-none"
                placeholder="e.g. I'll ask my brother to hold my medication and give me a weekly supply."
              />
            </div>

            {/* Generate section 6 block */}
            <button
              onClick={handleGenerateSafeEnvironment}
              className="w-full px-3 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-sm font-medium transition-colors cursor-pointer"
              id="sp-generate-safeenv-btn"
            >
              Add to section 6 above
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
