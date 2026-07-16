import React, { useMemo, useState } from "react";
import { Cloud, Eye, EyeOff, AlertTriangle, ExternalLink, Sparkles, Cpu } from "lucide-react";
import { t, useLanguage } from "../../services/i18n";
import {
  isCloudApiEnabled,
  setCloudApiEnabled,
  getCloudApiKey,
  setCloudApiKey,
  getCloudApiUrl,
  setCloudApiUrl,
  getCloudApiModel,
  setCloudApiModel,
  getCloudApiProvider,
  setCloudApiProvider,
  GROQ_DEFAULT_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_RECOMMENDED_MODELS,
  GROQ_KEY_PREFIX,
  validateGroqKey,
  type CloudProvider,
} from "../../services/cloudApi";

const GROQ_KEYS_URL = "https://console.groq.com/keys";
const GROQ_PRIVACY_URL = "https://wow.groq.com/privacy-notice/";

export default function CloudApiSection() {
  useLanguage();
  const [enabled, setEnabled] = useState(isCloudApiEnabled());
  const [apiKey, setApiKey] = useState(getCloudApiKey());
  const [apiUrl, setApiUrl] = useState(getCloudApiUrl());
  const [showKey, setShowKey] = useState(false);
  const [apiModel, setApiModel] = useState(getCloudApiModel());
  const [provider, setProvider] = useState<CloudProvider>(getCloudApiProvider());
  const [showAdvanced, setShowAdvanced] = useState(provider !== "groq");

  const keyValidation = useMemo(() => validateGroqKey(apiKey), [apiKey]);
  const isGroq = provider === "groq";
  const model = apiModel || (isGroq ? GROQ_DEFAULT_MODEL : "your model");
  const summary = useMemo(
    () =>
      isGroq
        ? `${model} on api.groq.com`
        : `${model} on ${apiUrl.replace(/^https?:\/\//, "")}`,
    [model, apiUrl, isGroq],
  );

  const modelPresetMatch = useMemo(
    () => (isGroq ? GROQ_RECOMMENDED_MODELS.some((m) => m.id === apiModel) : false),
    [isGroq, apiModel],
  );
  const dropdownValue = modelPresetMatch ? apiModel : "custom";

  const setProviderAndSync = (p: CloudProvider) => {
    setProvider(p);
    setCloudApiProvider(p);
    setApiUrl(getCloudApiUrl());
    setApiModel(getCloudApiModel());
    setShowAdvanced(p !== "groq");
  };

  const statusNode = enabled
    ? (
        <>
          <span className="text-emerald-400">{t("cloud_api_status_active")}</span>
          {" · "}
          {summary}
        </>
      )
    : t("cloud_api_status_disabled");

  const toggleNode = (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Toggle cloud API"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        setCloudApiEnabled(next);
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
        enabled ? "bg-purple-600" : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
   </button>
  );

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-cloud-api">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-400" /> {t("sec_cloud_api")}
       </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t("sec_cloud_apiSub")}</p>
     </div>

      <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl p-3">
        <p className="text-[11px] text-amber-200/90 leading-relaxed flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>Privacy notice</strong>{" "}
            {isGroq ? (
              <>
                {t("cloud_api_privacy_groq")}{" "}
                <a
                  href={GROQ_PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-100"
                >
                  Groq&apos;s privacy notice
               </a>
              </>
            ) : (
              t("cloud_api_privacy_generic")
            )}
         </span>
       </p>
     </div>

      <div
        className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page"
        id="cloud-api-toggle"
      >
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-slate-200">Enable cloud API</div>
          <div className="text-xs text-slate-500" id="cloud-api-status">
            {statusNode}
         </div>
       </div>
        {toggleNode}
     </div>

      {enabled ? (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-2" id="cloud-api-provider">
            <label className="text-xs font-medium text-slate-300">
              {t("cloud_api_provider_label")}
           </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderAndSync("groq")}
                aria-pressed={isGroq}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  isGroq
                    ? "bg-emerald-600 border-emerald-400 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Sparkles className="w-3 h-3" /> {t("cloud_api_groq_recommended")}
             </button>
              <button
                type="button"
                onClick={() => setProviderAndSync("openai-compatible")}
                aria-pressed={!isGroq}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  !isGroq
                    ? "bg-emerald-600 border-emerald-400 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Cpu className="w-3 h-3" /> {t("cloud_api_custom_label")}
             </button>
           </div>
         </div>

          {isGroq ? (
            <GroqPanel
              apiKey={apiKey}
              apiModel={apiModel}
              showKey={showKey}
              setShowKey={setShowKey}
              setApiKey={(k) => {
                setApiKey(k);
                setCloudApiKey(k);
              }}
              keyValidation={keyValidation}
              dropdownValue={dropdownValue}
              setApiModel={(m) => {
                setApiModel(m);
                setCloudApiModel(m);
              }}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              advancedUrl={apiUrl}
              setAdvancedUrl={(u) => {
                setApiUrl(u);
                setCloudApiUrl(u);
              }}
            />
          ) : (
            <OpenAiCompatiblePanel
              apiUrl={apiUrl}
              apiKey={apiKey}
              apiModel={apiModel}
              showKey={showKey}
              setShowKey={setShowKey}
              setApiUrl={(u) => {
                setApiUrl(u);
                setCloudApiUrl(u);
              }}
              setApiKey={(k) => {
                setApiKey(k);
                setCloudApiKey(k);
              }}
              setApiModel={(m) => {
                setApiModel(m);
                setCloudApiModel(m);
              }}
            />
          )}
       </div>
      ) : null}
   </div>
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
    ? "text-slate-500"
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

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-key">
        <label className="text-xs font-medium text-slate-300">
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
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => props.setShowKey(!props.showKey)}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={props.showKey ? "Hide API key" : "Show API key"}
          >
            {props.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
       </div>
        <p id="cloud-api-key-hint" className={`text-[11px] leading-relaxed ${keyHintColor}`}>
          {keyHint}
       </p>
     </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-model">
        <label className="text-xs font-medium text-slate-300">
          {t("cloud_api_model_label")}
       </label>
        <select
          value={props.dropdownValue}
          onChange={(e) => {
            if (e.target.value !== "custom") props.setApiModel(e.target.value);
            else props.setApiModel("");
          }}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        ) : null}
        <p className="text-[11px] text-slate-500">{modelHint}</p>
     </div>

      <button
        onClick={() => props.setShowAdvanced(!props.showAdvanced)}
        className="w-full flex items-center justify-between py-1 px-1 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors text-xs"
        type="button"
      >
        <span className="uppercase tracking-widest font-mono">
          {t("cloud_api_advanced_label")}
       </span>
        <span>{props.showAdvanced ? "▲" : "▼"}</span>
     </button>

      {props.showAdvanced ? (
        <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-url">
          <label className="text-xs font-medium text-slate-300">
            {t("cloud_api_endpoint_label")}
         </label>
          <input
            type="text"
            value={props.advancedUrl}
            onChange={(e) => props.setAdvancedUrl(e.target.value)}
            placeholder={GROQ_DEFAULT_URL}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="text-[11px] text-slate-500">
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
      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-url">
        <label className="text-xs font-medium text-slate-300">
          {t("cloud_api_endpoint_label")}
       </label>
        <input
          type="text"
          value={props.apiUrl}
          onChange={(e) => props.setApiUrl(e.target.value)}
          placeholder="https://api.openai.com/v1/chat/completions"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="text-[11px] text-slate-500">{t("cloud_api_endpoint_hint_custom")}</p>
     </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-key">
        <label className="text-xs font-medium text-slate-300">
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
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={() => props.setShowKey(!props.showKey)}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={props.showKey ? "Hide API key" : "Show API key"}
          >
            {props.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
       </div>
        <p className="text-[11px] text-slate-500">{t("cloud_api_openai_key_hint")}</p>
     </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-model">
        <label className="text-xs font-medium text-slate-300">
          {t("cloud_api_model_label")}
       </label>
        <input
          type="text"
          value={props.apiModel}
          onChange={(e) => props.setApiModel(e.target.value)}
          placeholder="gpt-4o-mini"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="text-[11px] text-slate-500">{t("cloud_api_model_hint_custom")}</p>
     </div>
    </>
  );
}
