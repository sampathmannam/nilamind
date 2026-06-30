import { useState, useEffect } from "react";
import { Download, ShieldCheck, Lock } from "lucide-react";
import NilaOrb from "./NilaOrb";
import { MODELS, formatSize } from "../services/modelCatalog";
import {
  downloadModel,
  registerDownloadedBackend,
  setPreferredModelId,
  type DownloadProgress,
} from "../services/modelDownload";
import { setBrainStatus } from "../services/brainSetup";

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
  const model = MODELS[0]; // we ship a single model — the fine-tuned 4B specialist
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState(0);

  const totalMB = model.sizeBytes / 1e6;

  // Rotate the reassurance tips while downloading so the wait builds trust instead of testing patience.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 4500);
    return () => clearInterval(id);
  }, [busy]);

  const start = async () => {
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
    } catch {
      setError("That didn't finish downloading — check your connection and try again. Nothing was kept.");
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-page text-slate-200 flex flex-col items-center justify-center px-6 overflow-y-auto">
      <NilaOrb size={80} />
      <h1 className="text-xl font-semibold mt-4">Set up Nila</h1>
      <p className="text-sm text-slate-400 text-center mt-1.5 max-w-[18rem] leading-relaxed">
        Nila's brain runs entirely on your phone — nothing you say ever leaves the device. It downloads
        once, then works fully offline.
      </p>

      {busy ? (
        <div className="w-full max-w-[18rem] mt-8" aria-live="polite">
          <div className="text-sm text-slate-200 mb-2">Getting Nila ready…</div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress?.pct ?? 0}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {Math.round(progress?.receivedMB ?? 0)} / {Math.round(progress?.totalMB ?? totalMB)} MB · keep the app open on Wi-Fi
          </div>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 min-h-[5.5rem] flex items-center">
            <p key={tip} className="text-[12px] text-slate-300 leading-relaxed">
              {TIPS[tip]}
            </p>
          </div>
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
        </div>
      )}
    </div>
  );
}
