import React, { useState } from "react";
import { t } from "../../services/i18n";
import { Lock, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { hasPin, setPin as setStorePin, removePin as removeStorePin } from "../../services/secureStore";
import { isPassthrough } from "../../services/secureLocal";

export default function PrivacyLockSection() {
  const [pinOn, setPinOn] = useState<boolean>(hasPin());
  const [mode, setMode] = useState<"idle" | "setting" | "removing">("idle");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passthrough = isPassthrough();

  const reset = () => { setPin(""); setConfirm(""); setError(null); setMode("idle"); };

  const doSetPin = async () => {
    if (busy) return;
    if (pin.length < 4) { setError("Use at least 4 digits."); return; }
    if (pin !== confirm) { setError("The two PINs don't match."); return; }
    setBusy(true);
    setError(null);
    try {
      await setStorePin(pin);
      setPinOn(true);
      reset();
    } catch (e) {
      setError("Couldn't set the PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doRemovePin = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await removeStorePin();
      setPinOn(false);
      reset();
    } catch (e) {
      setError("Couldn't remove the PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-privacy">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-400" /> {t("sec_privacy_lock")}
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          {/* #16 (audit): don't claim "always encrypted" in passthrough mode, where entries are stored in
              plaintext because secure storage is unavailable — the claim must match the actual at-rest state. */}
          {passthrough ? (
            <>Your entries — check-ins, diary, episodes, assessments — are saved locally on this device.
            They never leave your phone, but on this browser/session secure encryption isn't available, so they
            are stored <span className="text-amber-300">unencrypted</span> here.</>
          ) : (
            <>Your entries — check-ins, diary, episodes, assessments — are always encrypted on this
            device. Add a PIN for an extra layer: it'll be asked each time you open the app, and only
            you can unlock your data.</>
          )}
        </p>
      </div>

      {passthrough && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Secure storage isn't available in this browser/session, so a PIN can't be added and your data is
            stored <span className="text-amber-300">unencrypted</span> on this device. It still never leaves your phone.
          </p>
        </div>
      )}

      {/* Current state row */}
      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${pinOn ? "text-emerald-400" : "text-slate-600"}`} />
            <span className="text-sm font-medium text-slate-200">{pinOn ? "PIN lock is on" : "PIN lock is off"}</span>
          </div>
          {mode === "idle" && !passthrough && (
            pinOn ? (
              <button onClick={() => setMode("removing")} className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 cursor-pointer">Remove</button>
            ) : (
              <button onClick={() => setMode("setting")} id="settings-set-pin" className="text-[11px] font-semibold text-blue-300 hover:text-blue-200 cursor-pointer">Set up</button>
            )
          )}
        </div>

        {/* Set PIN flow */}
        {mode === "setting" && (
          <div className="space-y-2 pt-1">
            <input
              type="password" inputMode="numeric" autoFocus value={pin}
              onChange={(e) => setPin(e.target.value)} placeholder="New PIN (min 4 digits)"
              aria-label="New PIN" aria-describedby="pin-warning"
              id="settings-pin-input"
              className="w-full glass rounded-lg px-3 py-2.5 text-sm text-slate-100 tracking-widest placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            <input
              type="password" inputMode="numeric" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm PIN"
              onKeyDown={(e) => e.key === "Enter" && doSetPin()}
              aria-label="Confirm PIN" aria-describedby="pin-warning"
              id="settings-pin-confirm"
              className="w-full glass rounded-lg px-3 py-2.5 text-sm text-slate-100 tracking-widest placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            <p id="pin-warning" className="text-[10px] text-amber-300/80 leading-relaxed flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> If you forget this PIN, your encrypted entries cannot be recovered. There's no reset.
            </p>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 glass text-slate-400 text-xs py-2 rounded-lg cursor-pointer">Cancel</button>
              <button onClick={doSetPin} disabled={busy} id="settings-pin-save" className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Turn on PIN lock"}
              </button>
            </div>
          </div>
        )}

        {/* Remove PIN flow */}
        {mode === "removing" && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-slate-400">Turn off the PIN? Your data stays encrypted on the device — it just won't ask for a PIN to open.</p>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 glass text-slate-400 text-xs py-2 rounded-lg cursor-pointer">Keep it on</button>
              <button onClick={doRemovePin} disabled={busy} className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Remove PIN"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
