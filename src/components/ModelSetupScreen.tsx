import { useState, useEffect } from "react";
import { Download, ShieldCheck, Lock, WifiOff, ArrowRight } from "lucide-react";
import NilaOrb from "./NilaOrb";
import CrisisHelpButton from "./CrisisHelpButton";
import { MODELS, formatSize } from "../services/modelCatalog";
import {
  downloadModel,
  registerDownloadedBackend,
  setPreferredModelId,
  type DownloadProgress,
} from "../services/modelDownload";
import { setBrainStatus, recordModelDownloadSkipped } from "../services/brainSetup";

// Best-effort connectivity read. navigator.onLine is a coarse signal (it only knows the radio/link is up,
// not that traffic actually reaches the internet) but it reliably catches the common "no Wi-Fi / airplane
// mode" case before we kick off a multi-GB transfer that would otherwise just fail opaquely.
function isOffline(): boolean {
  try { return typeof navigator !== "undefined" && navigator.onLine === false; } catch { return false; }
}

// First-run screen: the on-device brain isn't installed yet, so download it (no adb side-load).
// The download is large and one-time; rather than just spin, the wait is used to BUILD TRUST and set
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

export default function ModelSetupScreen({ onReady }: { onReady: () => void }) {
  const model = MODELS[0]; // the DEVICE-VERIFIED default brain (catalog order is guarded by modelCatalog.test.ts); alternates in the catalog are side-load/preference options
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [offline, setOffline] = useState(isOffline());

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

  // Skip into the app without the model. The app is explicitly designed to run model-less — the chat falls
  // back to the calm offline companion and every tool + crisis line stays available. The skip is persisted:
  // the user won't see the gate again for 7 days (RE_PROMPT_DAYS in brainSetup.ts). After the window
  // expires, they get one fresh prompt on the next cold launch.
  const skipForNow = () => {
    recordModelDownloadSkipped();
    setBrainStatus("ready");
    onReady();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-page text-slate-200 flex flex-col items-center justify-center px-6 overflow-y-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      <NilaOrb size={80} />
      <h1 className="text-xl font-semibold mt-4">Set up Nila</h1>
      <p className="text-sm text-slate-400 text-center mt-1.5 max-w-[18rem] leading-relaxed">
        Nila's brain runs entirely on your phone — nothing you say ever leaves the device. It downloads
        once, then works fully offline.
      </p>

      {/* Offline pre-check banner — surfaces before the user taps download so the cause is obvious. */}
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
        <div className="w-full max-w-[18rem] mt-8">
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
        <div className="w-full max-w-[18rem] mt-7">
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

          {/* Skip into the app now — the tools and crisis help work without the model; you can download later. */}
          <button
            type="button"
            onClick={skipForNow}
            id="model-setup-skip"
            className="w-full mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-slate-100 py-2 min-h-[44px] transition-colors"
          >
            Skip for now — use tools &amp; crisis help
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      )}

      {/* Crisis help is reachable throughout setup — including during the multi-GB download. Fully offline
          (region registry + tel:/URL links); no model or identity needed. Pinned so it never scrolls away. */}
      <CrisisHelpButton variant="floating" />
    </div>
  );
}
