import React, { useState } from "react";
import { Shield, Heart } from "lucide-react";
import { isAgeConfirmed, confirmAdult } from "../services/ageGate";
import CrisisLines from "./CrisisLines";

// One-time 18+ self-attestation gate (compliance — every major AI-mental-health lawsuit centers on a minor).
// Wraps the app; renders children once confirmed. Declining never shames — it explains NilaMind is an 18+
// wellness tool and keeps crisis help reachable (we never leave a distressed young person with nothing).
export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [confirmed, setConfirmed] = useState<boolean>(isAgeConfirmed());
  const [declined, setDeclined] = useState<boolean>(false);

  if (confirmed) return <>{children}</>;

  if (declined) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-100">NilaMind is made for adults</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This one's built for 18 and older, so we can't set you up here. But if things are hard right now,
              you deserve support — these lines are free, confidential, and there for you:
            </p>
          </div>
          <CrisisLines />
          <button onClick={() => setDeclined(false)} className="text-[11px] text-slate-500 underline cursor-pointer">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-100">A quick check first</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            NilaMind is a wellness support tool for adults — not therapy, and not a crisis service. To continue,
            please confirm you're 18 or older.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => { confirmAdult(); setConfirmed(true); }}
            id="age-gate-adult"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors"
          >
            I'm 18 or older
          </button>
          <button
            onClick={() => setDeclined(true)}
            className="w-full glass text-slate-300 font-medium py-3 rounded-xl text-sm cursor-pointer"
          >
            I'm under 18
          </button>
        </div>
      </div>
    </div>
  );
}
