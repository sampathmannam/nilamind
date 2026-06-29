import React, { useState } from "react";
import { loadIdentity } from "../services/identity";
import IdentityOnboarding from "./IdentityOnboarding";

// Sits inside SecureGate (so secureLocal is already hydrated): if no identity exists yet, show the
// first-run onboarding (create or restore a recovery phrase) before the app renders.
export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const [hasIdentity, setHasIdentity] = useState<boolean>(() => !!loadIdentity());
  if (!hasIdentity) return <IdentityOnboarding onDone={() => setHasIdentity(true)} />;
  return <>{children}</>;
}
