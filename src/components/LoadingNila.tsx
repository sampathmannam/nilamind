import React from "react";
import NilaCharacter from "../illustrations/NilaCharacter";
import { useLanguage, t as translate } from "../services/i18n";

interface LoadingNilaProps {
  label?: string;
  t?: (key: Parameters<typeof translate>[0], lang?: Parameters<typeof translate>[1]) => string;
}

/** LoadingNila — a warm loading state: the Nila character breathing, with a localized label.
 *  Replaces bare "Loading..." text with the companion presence used across empty states. */
export default function LoadingNila({ label, t = translate }: LoadingNilaProps) {
  useLanguage();
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10 space-y-4" role="status" aria-live="polite">
      <div className="nila-orb">
        <NilaCharacter state="calm" size={64} />
      </div>
      <p className="text-xs text-ink-muted">{label ?? t("loading")}</p>
    </div>
  );
}
