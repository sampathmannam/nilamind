import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { chainId, suggestSkillForEmotion, prefillVulnerability, type ChainAnalysis, type ChainLink, type VulnerabilityFactors } from "../services/chainAnalysis";
import { updateSecureArray, type SECURE_KEYS } from "../services/secureData";
import { t, tn, useLanguage, type I18nKey } from "../services/i18n";

type Step = "vulnerability" | "prompting" | "chain" | "behavior" | "consequences" | "intervention";

const STEP_ORDER: Step[] = ["vulnerability", "prompting", "chain", "behavior", "consequences", "intervention"];

// 2026-08-06 i18n: label lookups are now t()-key maps (resolved live) instead of static strings, so a
// language switch mid-session updates them, matching every other localized string in the app.
const STEP_LABEL_KEYS: Record<Step, I18nKey> = {
  vulnerability: "ca_step_vulnerability",
  prompting: "ca_step_prompting",
  chain: "ca_step_chain",
  behavior: "ca_step_behavior",
  consequences: "ca_step_consequences",
  intervention: "ca_step_intervention",
};

// TIPP and DEAR MAN are English-letter mnemonics (Temperature-Intense exercise-Paced breathing-Paired
// muscle relaxation; Describe-Express-Assert-Reinforce Mindful-Appear confident-Negotiate) -- translating
// them would break the mnemonic itself, so they stay as-is in every language, matching how "CBT"/"DBT"
// are kept untranslated elsewhere in this app.
const SKILL_OPTION_KEYS: { id: string; labelKey: I18nKey }[] = [
  { id: "opposite_action", labelKey: "ca_skill_oppositeAction" },
  { id: "tipp", labelKey: "ca_skill_tipp" },
  { id: "check_the_facts", labelKey: "ca_skill_checkFacts" },
  { id: "radical_acceptance", labelKey: "ca_skill_radicalAcceptance" },
  { id: "dear_man", labelKey: "ca_skill_dearMan" },
  { id: "mindfulness", labelKey: "ca_skill_mindfulness" },
  { id: "pros_cons", labelKey: "ca_skill_prosCons" },
];

export default function ChainAnalysisScreen() {
  const lang = useLanguage();
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
            aria-label={tn("ca_stepAria", lang, { n: i + 1, label: t(STEP_LABEL_KEYS[s]) })}
          />
        ))}
        <span className="ml-auto">{stepIdx + 1} / {STEP_ORDER.length}</span>
      </div>

      <h2 className="text-lg font-semibold text-ink">{t(STEP_LABEL_KEYS[step])}</h2>

      {/* Step 1: Vulnerability */}
      {step === "vulnerability" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            {t("ca_v_intro")}
          </p>
          <label className="flex items-center gap-3 p-3 rounded-lg bg-page border border-line cursor-pointer">
            <input
              type="checkbox"
              checked={vuln.sleepProdrome}
              onChange={(e) => setVuln((p) => ({ ...p, sleepProdrome: e.target.checked }))}
              className="accent-accent"
            />
            <span className="text-sm">{t("ca_v_sleepProdrome")}</span>
          </label>
          <div className="space-y-1">
            <span className="text-sm font-medium">{t("ca_v_elevationLevel")}</span>
            <div className="flex gap-2">
              {([
                { lvl: "none" as const, key: "ca_v_levelNone" as I18nKey },
                { lvl: "elevated" as const, key: "ca_v_levelElevated" as I18nKey },
                { lvl: "high" as const, key: "ca_v_levelHigh" as I18nKey },
              ]).map(({ lvl, key }) => (
                <button
                  key={lvl}
                  onClick={() => setVuln((p) => ({ ...p, elevationLevel: lvl }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    vuln.elevationLevel === lvl
                      ? "bg-accent text-white"
                      : "bg-page text-ink-2 border border-line"
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="vuln-other" className="text-sm font-medium">{t("ca_v_otherFactors")}</label>
            <input
              id="vuln-other"
              value={otherVuln}
              onChange={(e) => setOtherVuln(e.target.value)}
              placeholder={t("ca_v_otherPlaceholder")}
              className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 2: Prompting event */}
      {step === "prompting" && (
        <div className="space-y-2">
          <label htmlFor="prompting" className="text-sm font-medium">{t("ca_p_label")}</label>
          <textarea
            id="prompting"
            value={prompting}
            onChange={(e) => setPrompting(e.target.value)}
            placeholder={t("ca_p_placeholder")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
          />
        </div>
      )}

      {/* Step 3: Chain links */}
      {step === "chain" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            {t("ca_c_intro")}
          </p>
          {links.map((link, i) => (
            <div key={i} className="p-3 rounded-lg bg-page border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">{tn("ca_c_link", lang, { n: i + 1 })}</span>
                {links.length > 1 && (
                  <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-300 cursor-pointer" aria-label={tn("ca_c_removeLink", lang, { n: i + 1 })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                value={link.moment}
                onChange={(e) => updateLink(i, "moment", e.target.value)}
                placeholder={t("ca_c_whatHappened")}
                className="w-full px-3 py-2 rounded bg-white/5 border border-line text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={link.thought ?? ""}
                  onChange={(e) => updateLink(i, "thought", e.target.value)}
                  placeholder={t("ca_c_thought")}
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
                <input
                  value={link.emotion ?? ""}
                  onChange={(e) => updateLink(i, "emotion", e.target.value)}
                  placeholder={t("ca_c_emotion")}
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
                <input
                  value={link.sensation ?? ""}
                  onChange={(e) => updateLink(i, "sensation", e.target.value)}
                  placeholder={t("ca_c_sensation")}
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
                <input
                  value={link.action ?? ""}
                  onChange={(e) => updateLink(i, "action", e.target.value)}
                  placeholder={t("ca_c_action")}
                  className="px-2 py-1.5 rounded bg-white/5 border border-line text-xs"
                />
              </div>
            </div>
          ))}
          <button
            onClick={addLink}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> {t("ca_c_addLink")}
          </button>
        </div>
      )}

      {/* Step 4: Behavior */}
      {step === "behavior" && (
        <div className="space-y-2">
          <label htmlFor="behavior" className="text-sm font-medium">{t("ca_b_label")}</label>
          <textarea
            id="behavior"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder={t("ca_b_placeholder")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
          />
        </div>
      )}

      {/* Step 5: Consequences */}
      {step === "consequences" && (
        <div className="space-y-2">
          <label htmlFor="consequences" className="text-sm font-medium">{t("ca_cons_label")}</label>
          <textarea
            id="consequences"
            value={consequences}
            onChange={(e) => setConsequences(e.target.value)}
            placeholder={t("ca_cons_placeholder")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
          />
        </div>
      )}

      {/* Step 6: Intervention */}
      {step === "intervention" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            {t("ca_i_intro")}
          </p>
          <div className="space-y-1">
            <label htmlFor="int-link" className="text-sm font-medium">{t("ca_i_intervene")}</label>
            <select
              id="int-link"
              value={intLinkIdx}
              onChange={(e) => setIntLinkIdx(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm"
            >
              {links.filter((l) => l.moment.trim()).map((l, i) => (
                <option key={i} value={i}>{tn("ca_i_linkOption", lang, { n: i + 1, text: l.moment.slice(0, 40) })}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium">{t("ca_i_skillToUse")}</span>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTION_KEYS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setIntSkill(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    intSkill === s.id
                      ? "bg-accent text-white"
                      : "bg-page text-ink-2 border border-line"
                  }`}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="int-plan" className="text-sm font-medium">{t("ca_i_whatDifferently")}</label>
            <textarea
              id="int-plan"
              value={intPlan}
              onChange={(e) => setIntPlan(e.target.value)}
              placeholder={t("ca_i_placeholder")}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-page border border-line text-sm resize-none"
            />
          </div>
          {intPlan.trim() && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm text-ink-2">
              <span className="font-medium">{t("ca_i_suggestedSkill")}</span>{" "}
              {suggestSkillForEmotion(links[intLinkIdx]?.emotion) && (
                <span className="text-accent">
                  {tn("ca_i_basedOn", lang, {
                    emotion: links[intLinkIdx]?.emotion ?? "",
                    skill: (() => {
                      const suggestedId = suggestSkillForEmotion(links[intLinkIdx]?.emotion);
                      const opt = SKILL_OPTION_KEYS.find((s) => s.id === suggestedId);
                      return opt ? t(opt.labelKey) : (suggestedId ?? "");
                    })(),
                  })}
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
          <ArrowLeft className="w-4 h-4" /> {t("ca_back")}
        </button>
        {stepIdx < STEP_ORDER.length - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 cursor-pointer"
          >
            {t("ca_next")} <ArrowRight className="w-4 h-4" />
          </button>
        ) : saved ? (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <Check className="w-4 h-4" /> {t("ca_saved")}
          </span>
        ) : (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 cursor-pointer"
          >
            <Check className="w-4 h-4" /> {t("ca_saveChain")}
          </button>
        )}
      </div>
    </div>
  );
}
