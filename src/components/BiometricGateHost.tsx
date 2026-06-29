import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { __registerConfirm } from "../services/biometricGate";

// Calm fallback confirmation, shown only when no biometric/device-lock is available (or in web preview).
// Promise-based: biometricGate.requireAuth awaits the user's choice. No window.confirm/alert (jarring).
export default function BiometricGateHost() {
  const [req, setReq] = useState<{ reason: string; resolve: (v: boolean) => void } | null>(null);

  useEffect(() => {
    __registerConfirm((reason: string) => new Promise<boolean>((resolve) => setReq({ reason, resolve })));
    return () => __registerConfirm(null);
  }, []);

  useEffect(() => {
    if (!req) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [req]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!req) return null;
  const close = (v: boolean) => { req.resolve(v); setReq(null); };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true" aria-label="Confirm it's you" aria-describedby="gate-desc">
      <div className="bg-card border border-slate-700 rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-slate-100">
          <Fingerprint className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-semibold">Confirm it's you</span>
        </div>
        <p id="gate-desc" className="text-xs text-slate-300 leading-relaxed">{req.reason}</p>
        <p className="text-[10px] text-slate-500 leading-relaxed">This device has no fingerprint or screen lock set, so we're asking you to confirm instead.</p>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => close(false)} className="flex-1 bg-page border border-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Cancel</button>
          <button type="button" onClick={() => close(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer">Confirm</button>
        </div>
      </div>
    </div>
  );
}
