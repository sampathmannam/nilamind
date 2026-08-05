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
      className="fixed inset-0 z-[60] bg-page text-ink-2 flex flex-col items-center justify-center px-6 overflow-y-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      <NilaOrb size={80} />
      <h1 className="text-xl font-semibold mt-4">{header.title}</h1>
      <p className="text-sm text-ink-muted text-center mt-1.5 max-w-[18rem] leading-relaxed">
        {header.subtitle}
      </p>

      {mode === "choice" && (
        <div className="w-full max-w-[20rem] mt-7 space-y-3">
          <button
            type="button"
            onClick={() => setMode("device")}
            id="model-setup-choose-device"
            className="w-full text-left rounded-2xl border border-line-strong hover:border-accent/60 active:scale-[0.99] bg-card/40 p-4 transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent-hi shrink-0" />
              <span className="font-semibold text-ink">On-device</span>
              <span className="text-[11px] text-ink-faint ml-auto">{formatSize(model.sizeBytes)}</span>
           </div>
            <ul className="text-[12px] text-ink-muted mt-2 space-y-1 leading-snug">
              <li className="flex gap-1.5"><span className="text-success shrink-0">✓</span> Private — nothing you say ever leaves your phone</li>
              <li className="flex gap-1.5"><span className="text-success shrink-0">✓</span> Works fully offline once downloaded</li>
              <li className="flex gap-1.5"><span className="text-success shrink-0">✓</span> No account, no API key, no ongoing cost</li>
              <li className="flex gap-1.5"><span className="text-warn shrink-0">!</span> One-time ~1.1GB download (Wi-Fi recommended)</li>
              <li className="flex gap-1.5"><span className="text-warn shrink-0">!</span> Slower, less nuanced than a large cloud model</li>
           </ul>
          </button>

          <button
            type="button"
            onClick={() => setMode("api")}
            id="model-setup-choose-api"
            className="w-full text-left rounded-2xl border border-line-strong hover:border-accent/60 active:scale-[0.99] bg-card/40 p-4 transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-accent-hi shrink-0" />
              <span className="font-semibold text-ink">Cloud API key</span>
           </div>
            <ul className="text-[12px] text-ink-muted mt-2 space-y-1 leading-snug">
              <li className="flex gap-1.5"><span className="text-success shrink-0">✓</span> No download — ready the moment you paste a key</li>
              <li className="flex gap-1.5"><span className="text-success shrink-0">✓</span> Faster, more capable replies (e.g. Groq's Llama 3.3 70B)</li>
              <li className="flex gap-1.5"><span className="text-warn shrink-0">!</span> Your messages leave the device and go to the provider you choose</li>
              <li className="flex gap-1.5"><span className="text-warn shrink-0">!</span> Requires your own free API key and an internet connection</li>
              <li className="flex gap-1.5"><span className="text-warn shrink-0">!</span> Subject to that provider's own privacy policy, not NilaMind's</li>
           </ul>
          </button>

          <button
            type="button"
            onClick={skipForNow}
            id="model-setup-skip"
            className="w-full mt-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink py-2 min-h-[44px] transition-colors"
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
              className="w-full max-w-[18rem] mt-7 text-[13px] text-ink-muted hover:text-ink-2 text-left"
            >
              ← Back
            </button>
          )}

          {offline && !busy && (
            <div className="w-full max-w-[18rem] mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 flex gap-2" role="status">
              <WifiOff className="w-4 h-4 text-warn-hi shrink-0 mt-0.5" />
              <p className="text-[12px] text-warn-hi/90 leading-relaxed">
                You're offline — connect to Wi-Fi to download Nila. Your tools and crisis help work offline right now.
              </p>
           </div>
          )}

          {busy ? (
            <div className="w-full max-w-[18rem] mt-8" aria-live="polite">
              {/* Two visible passes: the byte transfer, then a SHA-256 integrity check that streams the whole
                  file back through JS and takes MINUTES on-device. Both must show live movement — a silent
                  verify pass at a pinned 100% bar reads as a hung app (the "downloaded but never opens" bug). */}
              <div className="text-sm text-ink-2 mb-2">
                {progress?.phase === "verifying" ? "Checking Nila's brain…" : "Getting Nila ready…"}
             </div>
              <div className="h-2.5 rounded-full bg-fill overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${progress?.pct ?? 0}%` }}
                />
             </div>
              <div className="text-[11px] text-ink-faint mt-1.5">
                {progress?.phase === "verifying"
                  ? `Verifying the download is complete and safe · ${Math.round(progress?.pct ?? 0)}%`
                  : `${Math.round(progress?.receivedMB ?? 0)} / ${Math.round(progress?.totalMB ?? totalMB)} MB · keep the app open on Wi-Fi`}
             </div>
              <div className="mt-5 rounded-2xl border border-line bg-card/40 p-4 min-h-[5.5rem] flex items-center">
                <p key={tip} className="text-[12px] text-ink-2 leading-relaxed">
                  {TIPS[tip]}
               </p>
             </div>
              <button
                type="button"
                onClick={cancel}
                className="w-full mt-3 text-[13px] text-ink-muted hover:text-ink-2 py-2 min-h-[44px] transition-colors"
              >
                Cancel
              </button>
           </div>
          ) : confirming ? (
            <div className="w-full max-w-[18rem] mt-4">
              <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-4">
                <div className="flex items-center gap-2 text-ink font-semibold">
                  <Lock className="w-4 h-4 text-accent-hi shrink-0" /> One-time {formatSize(model.sizeBytes)} — here's why
               </div>
                <p className="text-[12px] text-ink-muted mt-2 leading-relaxed">
                  It's large because the <b className="text-ink-2">entire AI lives on your phone</b> — that's
                  how your conversations stay private and work offline. Use Wi-Fi to avoid mobile-data charges;
                  you only download it once.
               </p>
             </div>
              <button
                type="button"
                onClick={start}
                className="w-full mt-3 rounded-2xl bg-accent hover:opacity-90 active:scale-[0.99] text-white font-semibold py-3 min-h-[44px] transition-all"
              >
                Download &amp; begin
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="w-full mt-2 text-[13px] text-ink-muted py-2 min-h-[44px]"
              >
                Not now
              </button>
           </div>
          ) : (
            <div className="w-full max-w-[18rem] mt-4">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full text-left rounded-2xl border border-line-strong hover:border-accent/60 active:scale-[0.99] bg-card/40 p-4 transition-all min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{model.label}</span>
                  <span className="text-[11px] text-ink-faint">{formatSize(model.sizeBytes)}</span>
                  <Download className="w-4 h-4 ml-auto text-ink-faint" />
               </div>
                <div className="text-[12px] text-ink-muted mt-1 leading-snug">{model.detail}</div>
              </button>
              <p className="text-base text-slate-600 flex items-center gap-1.5 pt-3 leading-relaxed">
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
            className="w-full text-[13px] text-ink-muted hover:text-ink-2 text-left"
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
            className="w-full mt-1 rounded-2xl bg-accent hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 min-h-[44px] transition-all"
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
