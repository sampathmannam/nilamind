import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { loadIdentity, ensureAnonymousIdentity } from "../services/identity";
import IdentityOnboarding from "./IdentityOnboarding";

// Sits inside SecureGate (so secureLocal is already hydrated). First-run behaviour splits by platform:
//
//  · NATIVE (rung 2, deliberate install): keep the recovery-phrase onboarding ceremony up front — the user
//    chose to install a private, offline app and it's the right moment to hand them their keys.
//  · WEB (rung 0, the stranger front door): "talk-first". A first-time visitor in distress is dropped
//    straight into chat with a SILENTLY-created private space, instead of being blocked by a 12-word crypto
//    ceremony before they can say a word. The phrase is still generated + stored and remains viewable/saveable
//    later in Settings → Your data, so the no-account, phrase-recoverable privacy model is unchanged — only
//    WHEN the ceremony is asked of them moves. See ensureAnonymousIdentity in services/identity.ts.
export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const [hasIdentity, setHasIdentity] = useState<boolean>(() => !!loadIdentity());
  const [webCreateFailed, setWebCreateFailed] = useState<boolean>(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (hasIdentity || isNative) return; // native uses the onboarding ceremony below
    let cancelled = false;
    void ensureAnonymousIdentity()
      .then(() => { if (!cancelled) setHasIdentity(true); })
      .catch((e) => { console.error("[IdentityGate] ensureAnonymousIdentity failed:", e); if (!cancelled) setWebCreateFailed(true); }); // fall back to the ceremony, not a blank screen
    return () => { cancelled = true; };
  }, [hasIdentity, isNative]);

  if (!hasIdentity) {
    // Native always shows the ceremony. Web silently creates and renders nothing for that brief moment; if
    // the silent create fails, fall back to the manual create/restore ceremony rather than trapping the user
    // on a permanent blank screen.
    if (isNative || webCreateFailed) return <IdentityOnboarding onDone={() => setHasIdentity(true)} />;
    return null;
  }
  return <>{children}</>;
}
