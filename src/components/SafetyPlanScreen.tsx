import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect } from "react";
import { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";
import { getCrisisLines } from "../services/crisisResources";
import { CheckCircle2, Save } from "lucide-react";

export default function SafetyPlanScreen() {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>(INITIAL_SAFETY_PLAN);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  useEffect(() => {
    const saved = secureLocal.getItem("nilamind_safetyplan");
    if (saved) {
      try {
        setSafetyPlan(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Pre-fill the crisis-lines section with the user's region (editable, not yet persisted).
      const lines = getCrisisLines().map((l) => `${l.name}: ${l.display}`).join("\n");
      setSafetyPlan((p) => ({ ...p, professionals: lines }));
    }
  }, []);

  const updateSection = (field: keyof SafetyPlan, value: string) => {
    const updated = { ...safetyPlan, [field]: value };
    setSafetyPlan(updated);
    secureLocal.setItem("nilamind_safetyplan", JSON.stringify(updated));
    setSavedStatus(true);
    const timeout = setTimeout(() => setSavedStatus(false), 1200);
    return () => clearTimeout(timeout);
  };

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
        <div className="space-y-2 pb-12">
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
    </div>
  );
}
