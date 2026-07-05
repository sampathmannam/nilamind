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
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (hasIdentity || isNative) return; // native uses the onboarding ceremony below
    let cancelled = false;
    void ensureAnonymousIdentity()
      .then(() => { if (!cancelled) setHasIdentity(true); })
      .catch(() => { /* fall through to onboarding if silent create somehow fails */ });
    return () => { cancelled = true; };
  }, [hasIdentity, isNative]);

  if (!hasIdentity) {
    // Native: show the ceremony. Web: render nothing for the brief moment the local identity is created.
    return isNative ? <IdentityOnboarding onDone={() => setHasIdentity(true)} /> : null;
  }
  return <>{children}</>;
}
