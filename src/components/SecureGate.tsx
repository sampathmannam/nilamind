import React, { useState, useEffect } from "react";
import { Anchor, Lock, Loader2 } from "lucide-react";
import { bootSecure, hydrate } from "../services/secureLocal";
import { unlockWithPin } from "../services/secureStore";
import CrisisHelpButton from "./CrisisHelpButton";

// Wraps the app: boots encryption-at-rest before any data screen mounts, and shows a PIN unlock
// screen when the user has opted into PIN (zero-knowledge) mode. Device mode unlocks silently.
export default function SecureGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "locked" | "blocked" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await bootSecure();
      if (cancelled) return;
      // Encrypted data exists but couldn't be opened this boot — show an honest retry screen, never a silent
      // empty app (audit #5). Recovery isn't guaranteed, but the data isn't deleted and a retry often clears
      // a transient IndexedDB/crypto init error.
      if (res.error === "encrypted_unavailable") setPhase("blocked");
      else setPhase(res.mode === "pin" && !res.unlocked ? "locked" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "ready") return <>{children}</>;

  if (phase === "blocked") {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-ink">We couldn't open your data this time</h1>
              <p className="text-xs text-ink-muted leading-relaxed">
                Your encrypted entries are still saved on this device — something just stopped us opening them
                right now. Nothing has been deleted. This is often temporary, so please try again.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors"
          >
            Try again
          </button>
          {/* Crisis help stays reachable even when data can't be opened — it needs no decryption. */}
          <CrisisHelpButton />
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center gap-3 text-ink-faint">
        <Anchor className="w-8 h-8 text-blue-500 animate-pulse" />
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Securing your space…
        </div>
      </div>
    );
  }

  return <UnlockScreen onUnlocked={() => setPhase("ready")} />;
}

function UnlockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pin || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlockWithPin(pin);
      await hydrate();
      onUnlocked();
    } catch (e) {
      console.error("[SecureGate] PIN unlock failed:", e);
      setError("That PIN didn't work. Take your time — try again.");
      setPin("");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-accent/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-ink">Welcome back</h1>
            <p className="text-xs text-ink-muted leading-relaxed">
              Your entries are encrypted on this device. Enter your PIN to unlock them.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="PIN"
            aria-label="Enter your PIN"
            className="w-full glass rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
            id="unlock-pin-input"
          />
          {error && <p className="text-[11px] text-rose-400">{error}</p>}
          <button
            onClick={submit}
            disabled={!pin || busy}
            id="unlock-submit"
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-fill disabled:text-ink-faint text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Your PIN never leaves this device and isn't stored anywhere — it only unlocks your data.
          If you've forgotten it, your encrypted entries can't be recovered.
        </p>

        {/* Crisis help stays reachable even locked out — it needs no decryption or unlock. */}
        <CrisisHelpButton />
      </div>
    </div>
  );
}
