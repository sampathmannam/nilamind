import React, { useState } from "react";
import { Cloud, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { t } from "../../services/i18n";
import {
  isCloudApiEnabled,
  setCloudApiEnabled,
  getCloudApiKey,
  setCloudApiKey,
  getCloudApiUrl,
  setCloudApiUrl,
  getCloudApiModel,
  setCloudApiModel,
} from "../../services/cloudApi";

export default function CloudApiSection() {
  const [enabled, setEnabled] = useState(isCloudApiEnabled());
  const [apiKey, setApiKey] = useState(getCloudApiKey());
  const [apiUrl, setApiUrl] = useState(getCloudApiUrl());
  const [showKey, setShowKey] = useState(false);
  const [apiModel, setApiModelState] = useState(getCloudApiModel());

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-cloud-api">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-400" /> {t("sec_cloud_api")}
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          By default Nila runs entirely on your phone. Optionally, you can connect your own
          OpenAI-compatible API key to use a cloud model instead. When enabled, your messages
          will be sent to the external endpoint you configure.
        </p>
      </div>

      {/* Privacy warning */}
      <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl p-3">
        <p className="text-[11px] text-amber-200/90 leading-relaxed flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>Privacy notice:</strong> When cloud API is enabled, your chat and voice-call
            messages (and Nila's replies) leave your device and go directly to the endpoint you
            configure — NilaMind cannot see or store them. Everything else stays on your phone:
            background features (daily reflection, memory, coach insights) never use the cloud,
            and the on-device safety gates (crisis detection, output screening) always run locally.
            Takes effect from your next message — no restart needed.
          </span>
        </p>
      </div>

      {/* Toggle */}
      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page" id="cloud-api-toggle">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-slate-200">Enable cloud API</div>
          <div className="text-xs text-slate-500">
            {enabled ? "Cloud model active — messages sent externally" : "Disabled — on-device only (recommended)"}
          </div>
        </div>
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
      </div>

      {enabled && (
        <div className="space-y-3 animate-fade-in">
          {/* API Key */}
          <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-key">
            <label className="text-xs font-medium text-slate-300">API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setCloudApiKey(e.target.value);
                }}
                placeholder="sk-..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">Your key stays on this device. It is sent only to the endpoint below.</p>
          </div>

          {/* API URL */}
          <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-url">
            <label className="text-xs font-medium text-slate-300">API Endpoint</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => {
                setApiUrl(e.target.value);
                setCloudApiUrl(e.target.value);
              }}
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-xs text-slate-500">
              Any OpenAI-compatible endpoint (OpenAI, Together, Groq, etc.)
            </p>
          </div>

          {/* Model */}
          <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="cloud-api-model">
            <label className="text-xs font-medium text-slate-300">Model name</label>
            <input
              type="text"
              value={apiModel}
              onChange={(e) => {
                setApiModelState(e.target.value);
                setCloudApiModel(e.target.value);
              }}
              placeholder="gpt-3.5-turbo"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-xs text-slate-500">
              The model to use (e.g. gpt-4o, claude-3-haiku, llama-3-70b)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
