import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { loadIdentity, ensureAnonymousIdentity } from "../services/identity";
import IdentityOnboarding from "./IdentityOnboarding";
import { hasCompletedOnboarding } from "../services/onboarding";

// Sits inside SecureGate (so secureLocal is already hydrated). First-run behaviour splits by platform:
//
//  · NATIVE (rung 2, deliberate install): Onboarding FIRST ("Hi, I'm Nila"), THEN the recovery-phrase
//    ceremony. Meeting Nila before being handed a crypto key is the right emotional sequence — asking
//    someone to write down a 12-word mnemonic before they've had one warm interaction was emotionally
//    mistimed. So on native, if onboarding hasn't completed, we silently create the identity (so the app
//    can render and show OnboardingGate), and defer the recovery-phrase ceremony until after onboarding
//    completes. After onboarding, the user sees IdentityOnboarding to save their recovery phrase.
//  · WEB (rung 0): "talk-first". silently create identity → straight to chat. See ensureAnonymousIdentity.
export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const [hasIdentity, setHasIdentity] = useState<boolean>(() => !!loadIdentity());
  const [webCreateFailed, setWebCreateFailed] = useState<boolean>(false);
  const [identityDeferred, setIdentityDeferred] = useState<boolean>(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (hasIdentity) return;
    if (isNative) {
      // Native: if onboarding hasn't completed, silently create identity so the app (and OnboardingGate)
      // can render. The recovery-phrase ceremony is deferred until after onboarding completes.
      if (!hasCompletedOnboarding()) {
        let cancelled = false;
        void ensureAnonymousIdentity()
          .then(() => {
            if (!cancelled) {
              setHasIdentity(true);
              setIdentityDeferred(true); // mark that we still need to show the ceremony
            }
          })
          .catch((e) => { console.error("[IdentityGate] native silent create failed:", e); if (!cancelled) setWebCreateFailed(true); });
        return () => { cancelled = true; };
      }
      // Onboarding already completed → show the recovery-phrase ceremony now
      return;
    }
    // Web: silently create
    let cancelled = false;
    void ensureAnonymousIdentity()
      .then(() => { if (!cancelled) setHasIdentity(true); })
      .catch((e) => { console.error("[IdentityGate] ensureAnonymousIdentity failed:", e); if (!cancelled) setWebCreateFailed(true); });
    return () => { cancelled = true; };
  }, [hasIdentity, isNative]);

  // On native, after onboarding completes, if we deferred the identity ceremony, show it now.
  // The ceremony renders as a z-70 overlay on top of the app — the user has met Nila, now they save their key.
  if (!hasIdentity) {
    if ((isNative && hasCompletedOnboarding()) || webCreateFailed) return <IdentityOnboarding onDone={() => setHasIdentity(true)} />;
    return null;
  }

  return <>
    {children}
    {identityDeferred && hasCompletedOnboarding() && (
      <div className="fixed inset-0 z-[70] bg-page flex items-center justify-center">
        <IdentityOnboarding onDone={() => setIdentityDeferred(false)} />
      </div>
    )}
  </>;
}
