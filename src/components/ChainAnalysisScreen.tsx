import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { chainId, suggestSkillForEmotion, prefillVulnerability, type ChainAnalysis, type ChainLink, type VulnerabilityFactors } from "../services/chainAnalysis";
import { updateSecureArray, type SECURE_KEYS } from "../services/secureData";

type Step = "vulnerability" | "prompting" | "chain" | "behavior" | "consequences" | "intervention";

const STEP_ORDER: Step[] = ["vulnerability", "prompting", "chain", "behavior", "consequences", "intervention"];

const STEP_LABELS: Record<Step, string> = {
  vulnerability: "What made me fragile?",
  prompting: "What set it off?",
  chain: "Moment by moment",
  behavior: "What did I do?",
  consequences: "What happened after?",
  intervention: "Where could I intervene?",
};

const SKILL_OPTIONS = [
  { id: "opposite_action", label: "Opposite Action" },
  { id: "tipp", label: "TIPP" },
  { id: "check_the_facts", label: "Check the Facts" },
  { id: "radical_acceptance", label: "Radical Acceptance" },
  { id: "dear_man", label: "DEAR MAN" },
  { id: "mindfulness", label: "Mindfulness" },
  { id: "pros_cons", label: "Pros & Cons" },
];

export default function ChainAnalysisScreen() {
  const [step, setStep] = useState<Step>("vulnerability");
  const [vuln, setVuln] = useState<VulnerabilityFactors>(prefillVulnerability());
  const [otherVuln, setOtherVuln] = useState("");
  const [prompting, setPrompting] = useState("");
  const [links, setLinks] = useState<ChainLink[]>([{ moment: "" }]);
  const [behavior, setBehavior] = useState("");
  const [consequences, setConsequences] = useState("");
  const [intLinkIdx, setIntLinkIdx] = useState<number>(0);
  const [intSkill, setIntSkill] = useState("");
  const [intPlan, setIntPlan] = useState("");
  const [saved, setSaved] = useState(false);

  const stepIdx = STEP_ORDER.indexOf(step);

  const addLink = () => setLinks((p) => [...p, { moment: "" }]);
  const removeLink = (i: number) => setLinks((p) => p.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: keyof ChainLink, val: string) =>
    setLinks((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)));

  const next = () => {
    if (stepIdx < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIdx + 1]);
  };
  const prev = () => {
    if (stepIdx > 0) setStep(STEP_ORDER[stepIdx - 1]);
  };

  const buildAnalysis = (): ChainAnalysis => ({
    id: chainId(),
    date: new Date().toISOString().slice(0, 10),
    vulnerability: {
      ...vuln,
      other: otherVuln.trim() ? [otherVuln.trim()] : vuln.other,
    },
    promptingEvent: prompting,
    chainLinks: links.filter((l) => l.moment.trim()),
    behavior,
    consequences,
    interventionPoint:
      intPlan.trim()
        ? { linkIndex: intLinkIdx, skillId: intSkill || "mindfulness", plan: intPlan }
        : undefined,
  });

  const handleSave = () => {
    const analysis = buildAnalysis();
    updateSecureArray("nilamind_chain_analyses", (arr) => [...arr, analysis]);
    setSaved(true);
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6" role="main" aria-label="Guided Chain Analysis">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {STEP_ORDER.map((s, i) => (
          <span
            key={s}
            className={`w-2 h-2 rounded-full ${i === stepIdx ? "bg-accent" : i < stepIdx ? "bg-accent/50" : "bg-line"}`}
            aria-label={`Step ${i + 1}: ${STEP_LABELS[s]}`}
          />
        ))}
        <span className="ml-auto">{stepIdx + 1} / {STEP_ORDER.length}</span>
      </div>

      <h2 className="text-lg font-semibold text-ink">{STEP_LABELS[step]}</h2>

      {/* Step 1: Vulnerability */}
      {step === "vulnerability" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            What conditions made you more likely to react strongly? Check any that apply from your own data.
          </p>
          <label className="flex items-center gap-3 p-3 rounded-lg bg-page border border-line cursor-pointer">
            <input
              type="checkbox"
              checked={vuln.sleepProdrome}
              onChange={(e) => setVuln((p) => ({ ...p, sleepProdrome: e.target.checked }))}
              className="accent-accent"
            />
            <span className="text-sm">Poor sleep / sleep prodrome detected</span>
          </label>
          <div className="space-y-1">
            <span className="text-sm font-medium">Elevation level</span>
            <div className="flex gap-2">
              {(["none", "elevated", "high"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setVuln((p) => ({ ...p, elevationLevel: lvl }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    vuln.elevationLevel === lvl
                      ? "bg-accent text-white"
                      : "bg-page text-ink-2 border border-line"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="vuln-other" className="text-sm font-medium">Other factors</label>
            <input
              id="vuln-other"
              value={otherVuln}
              onChange={(e) => setOtherVuln(e.target.value)}
              placeholder="e.g. skipped meals, conflict at work"
              className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 2: Prompting event */}
      {step === "prompting" && (
        <div className="space-y-2">
          <label htmlFor="prompting" className="text-sm font-medium">What was the triggering event?</label>
          <textarea
            id="prompting"
            value={prompting}
            onChange={(e) => setPrompting(e.target.value)}
            placeholder="e.g. received a critical message from my manager"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
          />
        </div>
      )}

      {/* Step 3: Chain links */}
      {step === "chain" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Walk through it moment by moment. For each step, note what you thought, felt, sensed, or did.
          </p>
          {links.map((link, i) => (
            <div key={i} className="p-3 rounded-lg bg-page border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Link {i + 1}</span>
                {links.length > 1 && (
                  <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-300 cursor-pointer" aria-label={`Remove link ${i + 1}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                value={link.moment}
                onChange={(e) => updateLink(i, "moment", e.target.value)}
                placeholder="What happened?"
                className="w-full px-3 py-2 rounded bg-white/5 border border-line text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={link.thought ?? ""}
                  onChange={(e) => updateLink(i, "thought", e.target.value)}
                  placeholder="Thought"
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
                <input
                  value={link.emotion ?? ""}
                  onChange={(e) => updateLink(i, "emotion", e.target.value)}
                  placeholder="Emotion"
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
                <input
                  value={link.sensation ?? ""}
                  onChange={(e) => updateLink(i, "sensation", e.target.value)}
                  placeholder="Sensation"
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
                <input
                  value={link.action ?? ""}
                  onChange={(e) => updateLink(i, "action", e.target.value)}
                  placeholder="Action"
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
              </div>
            </div>
          ))}
          <button
            onClick={addLink}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add link
          </button>
        </div>
      )}

      {/* Step 4: Behavior */}
      {step === "behavior" && (
        <div className="space-y-2">
          <label htmlFor="behavior" className="text-sm font-medium">What was the target behavior? (What actually happened?)</label>
          <textarea
            id="behavior"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder="e.g. sent an angry reply, skipped the meeting"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
          />
        </div>
      )}

      {/* Step 5: Consequences */}
      {step === "consequences" && (
        <div className="space-y-2">
          <label htmlFor="consequences" className="text-sm font-medium">What happened after?</label>
          <textarea
            id="consequences"
            value={consequences}
            onChange={(e) => setConsequences(e.target.value)}
            placeholder="e.g. felt worse, relationship strained, missed work"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
          />
        </div>
      )}

      {/* Step 6: Intervention */}
      {step === "intervention" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Look at your chain. Where could you have intervened? Pick a link and a skill.
          </p>
          <div className="space-y-1">
            <label htmlFor="int-link" className="text-sm font-medium">Intervene at link</label>
            <select
              id="int-link"
              value={intLinkIdx}
              onChange={(e) => setIntLinkIdx(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm"
            >
              {links.filter((l) => l.moment.trim()).map((l, i) => (
                <option key={i} value={i}>Link {i + 1}: {l.moment.slice(0, 40)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium">Skill to use</span>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setIntSkill(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    intSkill === s.id
                      ? "bg-accent text-white"
                      : "bg-page text-ink-2 border border-line"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="int-plan" className="text-sm font-medium">What would you do differently?</label>
            <textarea
              id="int-plan"
              value={intPlan}
              onChange={(e) => setIntPlan(e.target.value)}
              placeholder="e.g. When I notice my chest tightening (Link 2), I'll use TIPP to bring my body out of fight-or-flight before responding."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
            />
          </div>
          {intPlan.trim() && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm text-ink-2">
              <span className="font-medium">Suggested skill:</span>{" "}
              {suggestSkillForEmotion(links[intLinkIdx]?.emotion) && (
                <span className="text-accent">
                  Based on "{links[intLinkIdx]?.emotion}", try{" "}
                  {SKILL_OPTIONS.find((s) => s.id === suggestSkillForEmotion(links[intLinkIdx]?.emotion))?.label ?? suggestSkillForEmotion(links[intLinkIdx]?.emotion)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-line">
        <button
          onClick={prev}
          disabled={stepIdx === 0}
          className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {stepIdx < STEP_ORDER.length - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 cursor-pointer"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : saved ? (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <Check className="w-4 h-4" /> Saved
          </span>
        ) : (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Save chain
          </button>
        )}
      </div>
    </div>
  );
}
