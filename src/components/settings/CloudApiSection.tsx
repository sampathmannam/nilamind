import React, { useMemo, useState } from "react";
import { Cloud, AlertTriangle } from "lucide-react";
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
  GROQ_DEFAULT_MODEL,
  type CloudProvider,
} from "../../services/cloudApi";
import CloudApiKeyForm from "./CloudApiKeyForm";

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

  const isGroq = provider === "groq";
  const model = apiModel || (isGroq ? GROQ_DEFAULT_MODEL : "your model");
  const summary = useMemo(
    () =>
      isGroq
        ? `${model} on api.groq.com`
        : `${model} on ${apiUrl.replace(/^https?:\/\//, "")}`,
    [model, apiUrl, isGroq],
  );

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
        enabled ? "bg-purple-600" : "bg-line-strong"
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-400" /> {t("sec_cloud_api")}
       </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">{t("sec_cloud_apiSub")}</p>
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
        className="border border-line rounded-xl p-3 flex items-center justify-between bg-page"
        id="cloud-api-toggle"
      >
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-ink-2">Enable cloud API</div>
          <div className="text-xs text-ink-faint" id="cloud-api-status">
            {statusNode}
         </div>
       </div>
        {toggleNode}
     </div>

      {enabled ? (
        <div className="space-y-3 animate-fade-in">
          <CloudApiKeyForm
            provider={provider}
            onProviderChange={setProviderAndSync}
            apiKey={apiKey}
            onApiKeyChange={(k) => {
              setApiKey(k);
              setCloudApiKey(k);
            }}
            apiModel={apiModel}
            onApiModelChange={(m) => {
              setApiModel(m);
              setCloudApiModel(m);
            }}
            apiUrl={apiUrl}
            onApiUrlChange={(u) => {
              setApiUrl(u);
              setCloudApiUrl(u);
            }}
            showKey={showKey}
            onShowKeyChange={setShowKey}
            showAdvanced={showAdvanced}
            onShowAdvancedChange={setShowAdvanced}
          />
       </div>
      ) : null}
   </div>
  );
}
