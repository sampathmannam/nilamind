import { useMemo } from "react";
import { Eye, EyeOff, ExternalLink, Sparkles, Cpu } from "lucide-react";
import { t } from "../../services/i18n";
import {
  GROQ_DEFAULT_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_RECOMMENDED_MODELS,
  GROQ_KEY_PREFIX,
  validateGroqKey,
  type CloudProvider,
} from "../../services/cloudApi";

const GROQ_KEYS_URL = "https://console.groq.com/keys";
const GOOGLE_AI_STUDIO_KEYS_URL = "https://aistudio.google.com/apikey";

export interface CloudApiKeyFormProps {
  provider: CloudProvider;
  onProviderChange: (p: CloudProvider) => void;
  apiKey: string;
  onApiKeyChange: (k: string) => void;
  apiModel: string;
  onApiModelChange: (m: string) => void;
  apiUrl: string;
  onApiUrlChange: (u: string) => void;
  showKey: boolean;
  onShowKeyChange: (b: boolean) => void;
  showAdvanced: boolean;
  onShowAdvancedChange: (b: boolean) => void;
}

// Shared provider-picker + key-entry form used by both Settings (CloudApiSection) and the first-run
// setup screen (ModelSetupScreen's "api" mode). Purely controlled — callers own persistence, so the
// same JSX can back an auto-persisting Settings toggle and a "type first, save on Continue" onboarding
// form without duplicating the Groq/Custom panel markup twice.
export default function CloudApiKeyForm(props: CloudApiKeyFormProps) {
  const isGroq = props.provider === "groq";
  const keyValidation = useMemo(() => validateGroqKey(props.apiKey), [props.apiKey]);
  const modelPresetMatch = useMemo(
    () => (isGroq ? GROQ_RECOMMENDED_MODELS.some((m) => m.id === props.apiModel) : false),
    [isGroq, props.apiModel],
  );
  const dropdownValue = modelPresetMatch ? props.apiModel : "custom";

  return (
    <>
      <div className="space-y-2" id="cloud-api-provider">
        <label className="text-xs font-medium text-ink-2">
          {t("cloud_api_provider_label")}
       </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => props.onProviderChange("groq")}
            aria-pressed={isGroq}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              isGroq
                ? "bg-emerald-600 border-emerald-400 text-white"
                : "bg-fill border-line-strong text-ink-2 hover:bg-line-strong"
            }`}
          >
            <Sparkles className="w-3 h-3" /> {t("cloud_api_groq_recommended")}
         </button>
          <button
            type="button"
            onClick={() => props.onProviderChange("openai-compatible")}
            aria-pressed={!isGroq}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              !isGroq
                ? "bg-emerald-600 border-emerald-400 text-white"
                : "bg-fill border-line-strong text-ink-2 hover:bg-line-strong"
            }`}
          >
            <Cpu className="w-3 h-3" /> {t("cloud_api_custom_label")}
         </button>
       </div>
     </div>

      {isGroq ? (
        <GroqPanel
          apiKey={props.apiKey}
          apiModel={props.apiModel}
          showKey={props.showKey}
          setShowKey={props.onShowKeyChange}
          setApiKey={props.onApiKeyChange}
          keyValidation={keyValidation}
          dropdownValue={dropdownValue}
          setApiModel={props.onApiModelChange}
          showAdvanced={props.showAdvanced}
          setShowAdvanced={props.onShowAdvancedChange}
          advancedUrl={props.apiUrl}
          setAdvancedUrl={props.onApiUrlChange}
        />
      ) : (
        <OpenAiCompatiblePanel
          apiUrl={props.apiUrl}
          apiKey={props.apiKey}
          apiModel={props.apiModel}
          showKey={props.showKey}
          setShowKey={props.onShowKeyChange}
          setApiUrl={props.onApiUrlChange}
          setApiKey={props.onApiKeyChange}
          setApiModel={props.onApiModelChange}
        />
      )}
    </>
  );
}

function GroqPanel(props: {
  apiKey: string;
  apiModel: string;
  showKey: boolean;
  setShowKey: (b: boolean) => void;
  setApiKey: (k: string) => void;
  keyValidation: { ok: boolean; hint: string };
  dropdownValue: string;
  setApiModel: (m: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (b: boolean) => void;
  advancedUrl: string;
  setAdvancedUrl: (u: string) => void;
}) {
  const matched = GROQ_RECOMMENDED_MODELS.find((m) => m.id === props.apiModel);
  const modelHint = matched ? matched.description : t("cloud_api_model_hint_groq");
  const keyHint = !props.apiKey
    ? t("cloud_api_groq_key_hint_empty")
    : props.keyValidation.ok
      ? t("cloud_api_groq_key_hint_ok")
      : `⚠ ${props.keyValidation.hint}`;
  const keyHintColor = !props.apiKey
    ? "text-ink-faint"
    : props.keyValidation.ok
      ? "text-emerald-400"
      : "text-amber-300";

  return (
    <>
      <a
        href={GROQ_KEYS_URL}
        target="_blank"
        rel="noopener noreferrer"
        id="cloud-api-groq-getkey"
        className="flex items-center justify-between w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-xl px-3 py-2.5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-100">
            {t("cloud_api_get_key_label")}
         </span>
       </span>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
     </a>

      <div className="border border-line rounded-xl p-3 bg-page space-y-2" id="cloud-api-key">
        <label className="text-xs font-medium text-ink-2">
          {t("cloud_api_groq_key_label")}
       </label>
        <div className="flex gap-2">
          <input
            type={props.showKey ? "text" : "password"}
            value={props.apiKey}
            onChange={(e) => props.setApiKey(e.target.value)}
            placeholder={`${GROQ_KEY_PREFIX}…`}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => props.setShowKey(!props.showKey)}
            className="px-2 py-1 text-ink-muted hover:text-ink-2 transition-colors"
            aria-label={props.showKey ? "Hide API key" : "Show API key"}
          >
            {props.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
       </div>
        <p id="cloud-api-key-hint" className={`text-[11px] leading-relaxed ${keyHintColor}`}>
          {keyHint}
       </p>
     </div>

      <div className="border border-line rounded-xl p-3 bg-page space-y-2" id="cloud-api-model">
        <label className="text-xs font-medium text-ink-2">
          {t("cloud_api_model_label")}
       </label>
        <select
          value={props.dropdownValue}
          onChange={(e) => {
            if (e.target.value !== "custom") props.setApiModel(e.target.value);
            else props.setApiModel("");
          }}
          className="w-full bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {GROQ_RECOMMENDED_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
           </option>
          ))}
          <option value="custom">{t("cloud_api_model_custom_option")}</option>
       </select>
        {props.dropdownValue === "custom" ? (
          <input
            type="text"
            value={props.apiModel}
            onChange={(e) => props.setApiModel(e.target.value)}
            placeholder="llama-3.1-8b-instant"
            className="w-full bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        ) : null}
        <p className="text-[11px] text-ink-faint">{modelHint}</p>
     </div>

      <button
        onClick={() => props.setShowAdvanced(!props.showAdvanced)}
        className="w-full flex items-center justify-between py-1 px-1 text-ink-faint hover:text-ink-2 cursor-pointer transition-colors text-xs"
        type="button"
      >
        <span className="uppercase tracking-widest font-mono">
          {t("cloud_api_advanced_label")}
       </span>
        <span>{props.showAdvanced ? "▲" : "▼"}</span>
     </button>

      {props.showAdvanced ? (
        <div className="border border-line rounded-xl p-3 bg-page space-y-2" id="cloud-api-url">
          <label className="text-xs font-medium text-ink-2">
            {t("cloud_api_endpoint_label")}
         </label>
          <input
            type="text"
            value={props.advancedUrl}
            onChange={(e) => props.setAdvancedUrl(e.target.value)}
            placeholder={GROQ_DEFAULT_URL}
            className="w-full bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="text-[11px] text-ink-faint">
            {t("cloud_api_endpoint_hint_groq")}
         </p>
       </div>
      ) : null}
    </>
  );
}

function OpenAiCompatiblePanel(props: {
  apiUrl: string;
  apiKey: string;
  apiModel: string;
  showKey: boolean;
  setShowKey: (b: boolean) => void;
  setApiUrl: (u: string) => void;
  setApiKey: (k: string) => void;
  setApiModel: (m: string) => void;
}) {
  return (
    <>
      <a
        href={GOOGLE_AI_STUDIO_KEYS_URL}
        target="_blank"
        rel="noopener noreferrer"
        id="cloud-api-google-getkey"
        className="flex items-center justify-between w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-xl px-3 py-2.5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-100">
            {t("cloud_api_get_key_label_custom")}
         </span>
       </span>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
     </a>

      <div className="border border-line rounded-xl p-3 bg-page space-y-2" id="cloud-api-url">
        <label className="text-xs font-medium text-ink-2">
          {t("cloud_api_endpoint_label")}
       </label>
        <input
          type="text"
          value={props.apiUrl}
          onChange={(e) => props.setApiUrl(e.target.value)}
          placeholder="https://api.openai.com/v1/chat/completions"
          className="w-full bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="text-[11px] text-ink-faint">{t("cloud_api_endpoint_hint_custom")}</p>
     </div>

      <div className="border border-line rounded-xl p-3 bg-page space-y-2" id="cloud-api-key">
        <label className="text-xs font-medium text-ink-2">
          {t("cloud_api_groq_key_label")}
       </label>
        <div className="flex gap-2">
          <input
            type={props.showKey ? "text" : "password"}
            value={props.apiKey}
            onChange={(e) => props.setApiKey(e.target.value)}
            placeholder="sk-... or your provider's key"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={() => props.setShowKey(!props.showKey)}
            className="px-2 py-1 text-ink-muted hover:text-ink-2 transition-colors"
            aria-label={props.showKey ? "Hide API key" : "Show API key"}
          >
            {props.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
       </div>
        <p className="text-[11px] text-ink-faint">{t("cloud_api_openai_key_hint")}</p>
     </div>

      <div className="border border-line rounded-xl p-3 bg-page space-y-2" id="cloud-api-model">
        <label className="text-xs font-medium text-ink-2">
          {t("cloud_api_model_label")}
       </label>
        <input
          type="text"
          value={props.apiModel}
          onChange={(e) => props.setApiModel(e.target.value)}
          placeholder="gpt-4o-mini"
          className="w-full bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs text-ink-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="text-[11px] text-ink-faint">{t("cloud_api_model_hint_custom")}</p>
     </div>
    </>
  );
}
