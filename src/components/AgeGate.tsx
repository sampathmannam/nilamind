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
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6 text-accent" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-ink">NilaMind is made for adults</h1>
            <p className="text-base text-ink-muted leading-relaxed">
              This one's built for 18 and older, so we can't set you up here. But if things are hard right now,
              you deserve support — these lines are free, confidential, and there for you:
            </p>
          </div>
          <CrisisLines />
          <button onClick={() => setDeclined(false)} className="text-[11px] text-ink-faint underline cursor-pointer">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-accent" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-ink">A quick check first</h1>
          <p className="text-base text-ink-muted leading-relaxed">
            NilaMind is a wellness support tool for adults — an AI companion, not therapy, not a medical
            device, and not a crisis service. To continue, please confirm you're 18 or older.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => { confirmAdult(); setConfirmed(true); }}
            id="age-gate-adult"
            className="w-full bg-accent hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors"
          >
            I'm 18 or older
          </button>
          <button
            onClick={() => setDeclined(true)}
            className="w-full glass text-ink-2 font-medium py-3 rounded-xl text-sm cursor-pointer"
          >
            I'm under 18
          </button>
        </div>
      </div>
    </div>
  );
}
