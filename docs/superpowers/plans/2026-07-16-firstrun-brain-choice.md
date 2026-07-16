# First-run Brain Choice (On-device vs. Cloud API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a first-run user choose between the on-device model and a bring-your-own cloud API key (Groq or custom OpenAI-compatible) right after onboarding, instead of only ever seeing the download-or-skip screen.

**Architecture:** Extract the existing Groq/Custom provider-picker-and-key-entry UI out of `CloudApiSection.tsx` (Settings) into a shared, purely-controlled `CloudApiKeyForm` component. Add a new `mode` state (`"choice" | "device" | "api"`) to `ModelSetupScreen.tsx`: `"choice"` shows two pros/cons cards + the existing skip link; `"device"` is today's download flow unchanged (now reachable via the on-device card, with a Back link); `"api"` renders the shared form and, on Continue, writes straight through `cloudApi.ts`'s existing setters and calls `setBrainStatus("ready")` — the same terminal action "Skip for now" already uses.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react (jsdom), Tailwind utility classes, lucide-react icons.

## Global Constraints

- No change to `ModelSetupGate.tsx`'s mounting/timing logic.
- No change to `brainSetup.ts`, `modelDownload.ts`'s download/verify pipeline, `cloudApi.ts`'s storage semantics, or `cloudLlmAdapter.ts`/`localLlm.ts` routing.
- The on-device download/verify/error UX is visually and behaviorally unchanged — only reachable one tap later (behind the new choice screen).
- "Skip for now" behavior (`recordModelDownloadSkipped()` → `setBrainStatus("ready")` → `onReady()`) is unchanged; only its position moves from the device-download screen to the new choice screen.
- Both new cards are equal visual weight — neither is styled as more "recommended" than the other.
- The API path writes through the *existing* `cloudApi.ts` setters (`setCloudApiEnabled`, `setCloudApiProvider`, `setCloudApiKey`, `setCloudApiModel`, `setCloudApiUrl`) — no new storage keys.

---

### Task 1: Extract `CloudApiKeyForm` out of `CloudApiSection.tsx`

**Files:**
- Create: `src/components/settings/CloudApiKeyForm.tsx`
- Create: `src/components/settings/CloudApiSection.test.tsx`
- Modify: `src/components/settings/CloudApiSection.tsx` (full rewrite)

**Interfaces:**
- Produces: `CloudApiKeyForm` default export, props:
  ```ts
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
  ```
  Purely controlled — the component owns no persistence. Callers decide whether/when to write to `cloudApi.ts`.
- Consumes: `CloudProvider`, `GROQ_DEFAULT_URL`, `GROQ_DEFAULT_MODEL`, `GROQ_RECOMMENDED_MODELS`, `GROQ_KEY_PREFIX`, `validateGroqKey` from `../../services/cloudApi` (all already exported, unchanged).

This task is a **pure refactor** of already-working, currently-untested code. Rather than red→green TDD, it uses a *characterization test*: written and passing against the code as it exists today, then re-run unchanged after the extraction to prove no regression.

- [ ] **Step 1: Write the characterization test (documents current behavior, should already PASS)**

Create `src/components/settings/CloudApiSection.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import CloudApiSection from "./CloudApiSection";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
});
afterEach(cleanup);

describe("CloudApiSection", () => {
  it("enables cloud API and shows the Groq get-key link by default", () => {
    render(<CloudApiSection />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle cloud API" }));
    expect(screen.getByText("Get your free Groq API key")).toBeTruthy();
  });

  it("switching to Custom (OpenAI-compatible) shows the Google AI Studio get-key link", () => {
    render(<CloudApiSection />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle cloud API" }));
    fireEvent.click(screen.getByText(/Custom \(OpenAI-compatible\)/));
    expect(screen.getByText("Get your free Google AI Studio (Gemini) API key")).toBeTruthy();
  });

  it("typing a Groq key persists it via cloudApi", () => {
    render(<CloudApiSection />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle cloud API" }));
    const input = screen.getByPlaceholderText("gsk_…");
    fireEvent.change(input, { target: { value: "gsk_test123" } });
    expect(store.get("nilamind_cloud_api_key")).toBe("gsk_test123");
  });
});
```

- [ ] **Step 2: Run the test, confirm it PASSES against the current (un-refactored) `CloudApiSection.tsx`**

Run: `npx vitest run src/components/settings/CloudApiSection.test.tsx`
Expected: 3 passed (this is a characterization test, not red/green — it documents behavior that already works, as a safety net for the refactor in the next steps).

- [ ] **Step 3: Create `src/components/settings/CloudApiKeyForm.tsx`**

```tsx
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
        <label className="text-xs font-medium text-slate-300">
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
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
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
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
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
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="text-[11px] text-slate-500">{t("cloud_api_model_hint_custom")}</p>
     </div>
    </>
  );
}
```

- [ ] **Step 4: Replace `src/components/settings/CloudApiSection.tsx` with the slimmed-down version**

```tsx
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
```

- [ ] **Step 5: Run the characterization test again — must still PASS with no changes to the test file**

Run: `npx vitest run src/components/settings/CloudApiSection.test.tsx`
Expected: 3 passed. If any fail, the extraction changed observable behavior — compare the failing assertion against the pre-refactor JSX above and fix `CloudApiKeyForm.tsx` or `CloudApiSection.tsx` until it matches exactly.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/CloudApiKeyForm.tsx src/components/settings/CloudApiSection.tsx src/components/settings/CloudApiSection.test.tsx
git commit -m "refactor: extract CloudApiKeyForm from CloudApiSection for reuse in first-run setup"
```

**Note for Task 2:** a separate `CloudApiKeyForm.test.tsx` is deliberately skipped — `CloudApiSection.test.tsx` (this task) and `ModelSetupScreen.test.tsx` (Task 2) both exercise `CloudApiKeyForm` end-to-end from two different parents, which is sufficient coverage without a third, redundant unit-test file for a purely-controlled component with no logic of its own beyond the two `useMemo` derivations (already covered indirectly by the Groq-vs-Custom-link assertions).

---

### Task 2: Add the first-run choice screen to `ModelSetupScreen.tsx`

**Files:**
- Modify: `src/services/cloudApi.ts:74-78` (export `providerDefaults`)
- Modify: `src/components/ModelSetupScreen.tsx` (full rewrite)
- Create: `src/components/ModelSetupScreen.test.tsx`

**Interfaces:**
- Consumes: `CloudApiKeyForm` from Task 1 (`../components/settings/CloudApiKeyForm` relative to `ModelSetupScreen.tsx`, i.e. `./settings/CloudApiKeyForm`).
- Consumes: `getBrainStatus`, `setBrainStatus`, `recordModelDownloadSkipped` from `../services/brainSetup` (unchanged).
- Consumes (new export): `providerDefaults(p: CloudProvider): { url: string; model: string }` from `../services/cloudApi`.
- Produces: no new exports — `ModelSetupScreen` keeps its existing `{ onReady: () => void }` prop signature.

- [ ] **Step 1: Export `providerDefaults` from `cloudApi.ts`**

In `src/services/cloudApi.ts`, change:

```ts
function providerDefaults(p: CloudProvider): { url: string; model: string } {
```

to:

```ts
export function providerDefaults(p: CloudProvider): { url: string; model: string } {
```

This is the only change to `cloudApi.ts` — the function body and all other exports are untouched.

- [ ] **Step 2: Write the failing test for the new choice screen**

Create `src/components/ModelSetupScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../services/modelDownload", () => ({
  downloadModel: vi.fn(),
  registerDownloadedBackend: vi.fn(),
  setPreferredModelId: vi.fn(),
}));

import ModelSetupScreen from "./ModelSetupScreen";
import { getBrainStatus, setBrainStatus } from "../services/brainSetup";
import { isCloudApiEnabled, getCloudApiKey } from "../services/cloudApi";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  setBrainStatus("needs-setup");
});
afterEach(cleanup);

describe("ModelSetupScreen first-run choice", () => {
  it("shows the on-device and API cards plus skip, not the download screen, by default", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    expect(screen.getByText("On-device")).toBeTruthy();
    expect(screen.getByText("Cloud API key")).toBeTruthy();
    expect(screen.getByText(/Skip for now/)).toBeTruthy();
    expect(screen.queryByText("Nila's brain (fast)")).toBeNull();
  });

  it("choosing on-device shows the original download card and a Back link", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    fireEvent.click(screen.getByText("On-device"));
    expect(screen.getByText("Nila's brain (fast)")).toBeTruthy();
    expect(screen.getByText("← Back")).toBeTruthy();
  });

  it("Back from on-device returns to the choice screen", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    fireEvent.click(screen.getByText("On-device"));
    fireEvent.click(screen.getByText("← Back"));
    expect(screen.getByText("Cloud API key")).toBeTruthy();
  });

  it("choosing Cloud API key shows the provider form with Continue disabled until a key is entered", () => {
    render(<ModelSetupScreen onReady={() => {}} />);
    fireEvent.click(screen.getByText("Cloud API key"));
    const continueBtn = screen.getByText("Continue") as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("gsk_…"), { target: { value: "gsk_onboardingtest" } });
    expect(continueBtn.disabled).toBe(false);
  });

  it("Continue persists the cloud API key, marks the brain ready, and calls onReady", () => {
    const onReady = vi.fn();
    render(<ModelSetupScreen onReady={onReady} />);
    fireEvent.click(screen.getByText("Cloud API key"));
    fireEvent.change(screen.getByPlaceholderText("gsk_…"), { target: { value: "gsk_onboardingtest" } });
    fireEvent.click(screen.getByText("Continue"));

    expect(isCloudApiEnabled()).toBe(true);
    expect(getCloudApiKey()).toBe("gsk_onboardingtest");
    expect(getBrainStatus()).toBe("ready");
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("Skip for now still marks the brain ready without configuring cloud", () => {
    const onReady = vi.fn();
    render(<ModelSetupScreen onReady={onReady} />);
    fireEvent.click(screen.getByText(/Skip for now/));
    expect(getBrainStatus()).toBe("ready");
    expect(isCloudApiEnabled()).toBe(false);
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/ModelSetupScreen.test.tsx`
Expected: FAIL — `ModelSetupScreen` still renders the old download-first screen directly, so `screen.getByText("On-device")` etc. won't find anything (most/all assertions fail or throw "Unable to find element").

- [ ] **Step 4: Replace `src/components/ModelSetupScreen.tsx` with the full new version**

```tsx
import { useState, useEffect } from "react";
import { Download, ShieldCheck, Lock, WifiOff, ArrowRight, Cloud } from "lucide-react";
import NilaOrb from "./NilaOrb";
import CrisisHelpButton from "./CrisisHelpButton";
import CloudApiKeyForm from "./settings/CloudApiKeyForm";
import { MODELS, formatSize } from "../services/modelCatalog";
import {
  downloadModel,
  registerDownloadedBackend,
  setPreferredModelId,
  type DownloadProgress,
} from "../services/modelDownload";
import { setBrainStatus, recordModelDownloadSkipped } from "../services/brainSetup";
import {
  getCloudApiProvider,
  getCloudApiKey,
  getCloudApiModel,
  getCloudApiUrl,
  setCloudApiProvider,
  setCloudApiKey,
  setCloudApiModel,
  setCloudApiUrl,
  setCloudApiEnabled,
  providerDefaults,
  type CloudProvider,
} from "../services/cloudApi";

// Best-effort connectivity read. navigator.onLine is a coarse signal (it only knows the radio/link is up,
// not that traffic actually reaches the internet) but it reliably catches the common "no Wi-Fi / airplane
// mode" case before we kick off a multi-GB transfer that would otherwise just fail opaquely.
function isOffline(): boolean {
  try { return typeof navigator !== "undefined" && navigator.onLine === false; } catch { return false; }
}

// First-run screen: the on-device brain isn't installed yet, so the user chooses on-device (download,
// no adb side-load) or their own cloud API key. The download wait is used to BUILD TRUST and set
// expectations (the tips rotate), and the size is reframed as the privacy feature it is — the whole
// model lives on the phone, which is exactly why nothing ever leaves it. The file is integrity-verified
// before it's accepted (see modelDownload.ts), so a failed/corrupt download can't brick the app.
const TIPS = [
  "Why so large? The whole AI lives on your phone — that's exactly why nothing you say ever leaves it.",
  "No account, no servers, no analytics. This one-time download is the last time the network is involved.",
  "Nila is a companion, not a therapist — a steady voice for the hard days, alongside real people and care.",
  "If anything ever feels unsafe, Nila gently points you toward a real person and real help.",
  "Built by someone who's been there — for anyone who can't open up to anyone.",
];

type Mode = "choice" | "device" | "api";

const HEADER_COPY: Record<Mode, { title: string; subtitle: string }> = {
  choice: {
    title: "Set up Nila",
    subtitle: "Choose how Nila thinks — you can change this later in Settings.",
  },
  device: {
    title: "Set up Nila",
    subtitle:
      "Nila's brain runs entirely on your phone — nothing you say ever leaves the device. It downloads once, then works fully offline.",
  },
  api: {
    title: "Connect your API key",
    subtitle: "Bring your own key from a provider like Groq — no download needed.",
  },
};

export default function ModelSetupScreen({ onReady }: { onReady: () => void }) {
  const model = MODELS[0]; // the DEVICE-VERIFIED default brain (catalog order is guarded by modelCatalog.test.ts); alternates in the catalog are side-load/preference options
  const [mode, setMode] = useState<Mode>("choice");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [offline, setOffline] = useState(isOffline());

  const [apiProvider, setApiProvider] = useState<CloudProvider>(getCloudApiProvider());
  const [apiKeyInput, setApiKeyInput] = useState(getCloudApiKey());
  const [apiModelInput, setApiModelInput] = useState(getCloudApiModel());
  const [apiUrlInput, setApiUrlInput] = useState(getCloudApiUrl());
  const [apiShowKey, setApiShowKey] = useState(false);
  const [apiShowAdvanced, setApiShowAdvanced] = useState(apiProvider !== "groq");

  const totalMB = model.sizeBytes / 1e6;

  // Rotate the reassurance tips while downloading so the wait builds trust instead of testing patience.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 4500);
    return () => clearInterval(id);
  }, [busy]);

  // Keep the offline banner live so it clears the moment Wi-Fi comes back (and appears if it drops).
  useEffect(() => {
    const sync = () => setOffline(isOffline());
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const start = async () => {
    // Offline pre-check: don't kick off a multi-GB transfer that can only fail. Tell them plainly.
    if (isOffline()) {
      setOffline(true);
      setConfirming(false);
      setError("You're offline — connect to Wi-Fi to download Nila. Your tools and crisis help still work offline in the meantime.");
      return;
    }
    setError(null);
    setConfirming(false);
    setBusy(true);
    setTip(0);
    setProgress({ receivedMB: 0, totalMB, pct: 0 });
    try {
      await downloadModel(model, setProgress);
      setPreferredModelId(model.id);
      await registerDownloadedBackend(model);
      setBrainStatus("ready");
      onReady();
    } catch (e) {
      // Distinguish the likely cause so the message is actionable rather than a generic "try again".
      const msg = e instanceof Error ? e.message : "";
      if (isOffline()) {
        setError("The connection dropped mid-download — reconnect to Wi-Fi and try again. Nothing was kept.");
      } else if (/incomplete|size mismatch|valid model|not a valid/i.test(msg)) {
        // isComplete / hasValidHeader / verifySha256 rejected the file (truncated or corrupt).
        setError("The download arrived damaged and was discarded, so nothing corrupt is ever loaded. Please try again — usually it works the second time.");
      } else {
        setError("That didn't finish downloading — check your connection and try again. Nothing was kept.");
      }
      setBusy(false);
      setProgress(null);
    }
  };

  // UX-level cancel. The native Filesystem.downloadFile transfer has no AbortSignal (Capacitor limitation),
  // so this can't kill the in-flight bytes; it unblocks the UI (the user is no longer stuck watching the bar)
  // and returns to the idle screen. Any partial `.part` is cleaned up on the next download attempt (tryDelete)
  // or on failure. This is the best we can do without native plugin changes.
  const cancel = () => {
    setBusy(false);
    setProgress(null);
    setConfirming(false);
    setError(null);
  };

  // Skip into the app without a brain at all. The app is explicitly designed to run brainless — the chat
  // falls back to the calm offline companion and every tool + crisis line stays available. The skip is
  // persisted: the user won't see the gate again for 7 days (RE_PROMPT_DAYS in brainSetup.ts). After the
  // window expires, they get one fresh prompt on the next cold launch.
  const skipForNow = () => {
    recordModelDownloadSkipped();
    setBrainStatus("ready");
    onReady();
  };

  // Provider switch for the inline onboarding form: only overwrite the URL/model fields when they still
  // hold the OLD provider's default (i.e. the user hasn't customized them yet) — same "don't clobber a
  // power user's typed value" rule cloudApi.ts's own setters already apply for Settings.
  const handleApiProviderChange = (p: CloudProvider) => {
    const prevDefaults = providerDefaults(apiProvider);
    const nextDefaults = providerDefaults(p);
    setApiProvider(p);
    setApiUrlInput((cur) => (cur === prevDefaults.url ? nextDefaults.url : cur));
    setApiModelInput((cur) => (cur === prevDefaults.model ? nextDefaults.model : cur));
    setApiShowAdvanced(p !== "groq");
  };

  // Same terminal action as skipForNow (setBrainStatus("ready") + onReady()), except cloud is live
  // immediately instead of leaving the user brainless. Writes through the exact cloudApi.ts setters
  // Settings uses, so opening Settings afterward shows exactly what was entered here.
  const continueWithApi = () => {
    setCloudApiProvider(apiProvider);
    setCloudApiKey(apiKeyInput);
    setCloudApiModel(apiModelInput);
    setCloudApiUrl(apiUrlInput);
    setCloudApiEnabled(true);
    setBrainStatus("ready");
    onReady();
  };

  const header = HEADER_COPY[mode];

  return (
    <div
      className="fixed inset-0 z-[60] bg-page text-slate-200 flex flex-col items-center justify-center px-6 overflow-y-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      <NilaOrb size={80} />
      <h1 className="text-xl font-semibold mt-4">{header.title}</h1>
      <p className="text-sm text-slate-400 text-center mt-1.5 max-w-[18rem] leading-relaxed">
        {header.subtitle}
      </p>

      {mode === "choice" && (
        <div className="w-full max-w-[20rem] mt-7 space-y-3">
          <button
            type="button"
            onClick={() => setMode("device")}
            id="model-setup-choose-device"
            className="w-full text-left rounded-2xl border border-slate-700 hover:border-purple-500/60 active:scale-[0.99] bg-slate-900/40 p-4 transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="font-semibold text-slate-100">On-device</span>
              <span className="text-[11px] text-slate-500 ml-auto">{formatSize(model.sizeBytes)}</span>
           </div>
            <ul className="text-[12px] text-slate-400 mt-2 space-y-1 leading-snug">
              <li className="flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> Private — nothing you say ever leaves your phone</li>
              <li className="flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> Works fully offline once downloaded</li>
              <li className="flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> No account, no API key, no ongoing cost</li>
              <li className="flex gap-1.5"><span className="text-amber-400 shrink-0">!</span> One-time ~1.1GB download (Wi-Fi recommended)</li>
              <li className="flex gap-1.5"><span className="text-amber-400 shrink-0">!</span> Slower, less nuanced than a large cloud model</li>
           </ul>
          </button>

          <button
            type="button"
            onClick={() => setMode("api")}
            id="model-setup-choose-api"
            className="w-full text-left rounded-2xl border border-slate-700 hover:border-purple-500/60 active:scale-[0.99] bg-slate-900/40 p-4 transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-300 shrink-0" />
              <span className="font-semibold text-slate-100">Cloud API key</span>
           </div>
            <ul className="text-[12px] text-slate-400 mt-2 space-y-1 leading-snug">
              <li className="flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> No download — ready the moment you paste a key</li>
              <li className="flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> Faster, more capable replies (e.g. Groq's Llama 3.3 70B)</li>
              <li className="flex gap-1.5"><span className="text-amber-400 shrink-0">!</span> Your messages leave the device and go to the provider you choose</li>
              <li className="flex gap-1.5"><span className="text-amber-400 shrink-0">!</span> Requires your own free API key and an internet connection</li>
              <li className="flex gap-1.5"><span className="text-amber-400 shrink-0">!</span> Subject to that provider's own privacy policy, not NilaMind's</li>
           </ul>
          </button>

          <button
            type="button"
            onClick={skipForNow}
            id="model-setup-skip"
            className="w-full mt-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-slate-100 py-2 min-h-[44px] transition-colors"
          >
            Skip for now — use tools &amp; crisis help
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
       </div>
      )}

      {mode === "device" && (
        <>
          {!busy && (
            <button
              type="button"
              onClick={() => setMode("choice")}
              id="model-setup-back"
              className="w-full max-w-[18rem] mt-7 text-[13px] text-slate-400 hover:text-slate-200 text-left"
            >
              ← Back
            </button>
          )}

          {offline && !busy && (
            <div className="w-full max-w-[18rem] mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2" role="status">
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-200/90 leading-relaxed">
                You're offline — connect to Wi-Fi to download Nila. Your tools and crisis help work offline right now.
              </p>
           </div>
          )}

          {busy ? (
            <div className="w-full max-w-[18rem] mt-8" aria-live="polite">
              {/* Two visible passes: the byte transfer, then a SHA-256 integrity check that streams the whole
                  file back through JS and takes MINUTES on-device. Both must show live movement — a silent
                  verify pass at a pinned 100% bar reads as a hung app (the "downloaded but never opens" bug). */}
              <div className="text-sm text-slate-200 mb-2">
                {progress?.phase === "verifying" ? "Checking Nila's brain…" : "Getting Nila ready…"}
             </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${progress?.pct ?? 0}%` }}
                />
             </div>
              <div className="text-[11px] text-slate-500 mt-1.5">
                {progress?.phase === "verifying"
                  ? `Verifying the download is complete and safe · ${Math.round(progress?.pct ?? 0)}%`
                  : `${Math.round(progress?.receivedMB ?? 0)} / ${Math.round(progress?.totalMB ?? totalMB)} MB · keep the app open on Wi-Fi`}
             </div>
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 min-h-[5.5rem] flex items-center">
                <p key={tip} className="text-[12px] text-slate-300 leading-relaxed">
                  {TIPS[tip]}
               </p>
             </div>
              <button
                type="button"
                onClick={cancel}
                className="w-full mt-3 text-[13px] text-slate-400 hover:text-slate-200 py-2 min-h-[44px] transition-colors"
              >
                Cancel
              </button>
           </div>
          ) : confirming ? (
            <div className="w-full max-w-[18rem] mt-4">
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-4">
                <div className="flex items-center gap-2 text-slate-100 font-semibold">
                  <Lock className="w-4 h-4 text-purple-300 shrink-0" /> One-time {formatSize(model.sizeBytes)} — here's why
               </div>
                <p className="text-[12px] text-slate-400 mt-2 leading-relaxed">
                  It's large because the <b className="text-slate-200">entire AI lives on your phone</b> — that's
                  how your conversations stay private and work offline. Use Wi-Fi to avoid mobile-data charges;
                  you only download it once.
               </p>
             </div>
              <button
                type="button"
                onClick={start}
                className="w-full mt-3 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-semibold py-3 min-h-[44px] transition-all"
              >
                Download &amp; begin
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="w-full mt-2 text-[13px] text-slate-400 py-2 min-h-[44px]"
              >
                Not now
              </button>
           </div>
          ) : (
            <div className="w-full max-w-[18rem] mt-4">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full text-left rounded-2xl border border-slate-700 hover:border-purple-500/60 active:scale-[0.99] bg-slate-900/40 p-4 transition-all min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">{model.label}</span>
                  <span className="text-[11px] text-slate-500">{formatSize(model.sizeBytes)}</span>
                  <Download className="w-4 h-4 ml-auto text-slate-500" />
               </div>
                <div className="text-[12px] text-slate-400 mt-1 leading-snug">{model.detail}</div>
              </button>
              <p className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-3 leading-relaxed">
                <ShieldCheck className="w-3 h-3 shrink-0" /> Verified after download — a corrupt file is never
                loaded.
              </p>
              {error && <p className="text-[12px] text-rose-400 mt-2">{error}</p>}
           </div>
          )}
        </>
      )}

      {mode === "api" && (
        <div className="w-full max-w-[20rem] mt-7 space-y-3">
          <button
            type="button"
            onClick={() => setMode("choice")}
            id="model-setup-back"
            className="w-full text-[13px] text-slate-400 hover:text-slate-200 text-left"
          >
            ← Back
          </button>
          <CloudApiKeyForm
            provider={apiProvider}
            onProviderChange={handleApiProviderChange}
            apiKey={apiKeyInput}
            onApiKeyChange={setApiKeyInput}
            apiModel={apiModelInput}
            onApiModelChange={setApiModelInput}
            apiUrl={apiUrlInput}
            onApiUrlChange={setApiUrlInput}
            showKey={apiShowKey}
            onShowKeyChange={setApiShowKey}
            showAdvanced={apiShowAdvanced}
            onShowAdvancedChange={setApiShowAdvanced}
          />
          <button
            type="button"
            onClick={continueWithApi}
            disabled={!apiKeyInput.trim()}
            id="model-setup-api-continue"
            className="w-full mt-1 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 min-h-[44px] transition-all"
          >
            Continue
          </button>
       </div>
      )}

      {/* Crisis help is reachable throughout setup — including during the multi-GB download and while
          picking a provider. Fully offline (region registry + tel:/URL links); no model or identity needed. */}
      <CrisisHelpButton variant="floating" />
   </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/ModelSetupScreen.test.tsx`
Expected: 6 passed.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/cloudApi.ts src/components/ModelSetupScreen.tsx src/components/ModelSetupScreen.test.tsx
git commit -m "feat: let first-run setup choose on-device or a cloud API key before proceeding"
```

---

### Task 3: Full-suite verification

**Files:** none (verification only)

**Interfaces:** none — this task runs the existing test suite and a manual smoke check; it does not modify code.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all suites pass, including the two new/modified files from Tasks 1–2 (`CloudApiSection.test.tsx`, `ModelSetupScreen.test.tsx`) and every pre-existing test (in particular `cloudApi.test.ts`, `cloudLlmAdapter.test.ts`, and `modelCatalog.test.ts` guarding `MODELS[0]` — none of these should have changed behavior). If the run OOMs or times out, retry with `npx vitest run --pool=forks` to reduce parallel worker memory pressure.

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Manual smoke test in the dev browser preview**

Start the dev server (`.claude/launch.json`'s `nilamind-dev` config, or `npm run dev`) and in a browser:

1. `main.tsx` only calls `setBrainStatus("needs-setup")` inside an `if (Capacitor.isNativePlatform())` block (`src/main.tsx:143-157`), so on the web/dev preview `ModelSetupGate` never fires on its own — `brainSetup.ts`'s default status is `"ready"`. To see the new screen in the browser, temporarily add `setBrainStatus("needs-setup");` as a one-line call at the bottom of `src/main.tsx` (after existing imports resolve), reload, and revert the line before committing anything. Clear site data first so onboarding also runs from scratch.
2. Complete onboarding (age gate → carousel skip).
3. Confirm the new choice screen appears: "On-device" card with pros/cons bullets, "Cloud API key" card with pros/cons bullets, "Skip for now" link below both.
4. Click "Cloud API key" → confirm the Groq/Custom picker renders, Continue is disabled, typing a key enables Continue.
5. Click Continue → confirm the setup screen closes (app proceeds) and, if Settings is reachable from here, that Settings → Advanced → Optional Cloud API shows "Enabled" with the same key.
6. Reload and repeat, this time clicking "On-device" → confirm the original download confirm/idle screen appears unchanged, with a working "← Back" link.

Take a screenshot of the choice screen and the API-key screen as evidence.

- [ ] **Step 4: Report results**

No commit for this task (verification only) — report the test/typecheck output and screenshots to the user.
