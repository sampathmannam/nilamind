import { useMemo, useState } from "react";
import { Users, Copy, Share2, HeartHandshake } from "lucide-react";
import { caregiverSummaryText, buildCaregiverSnapshot } from "../services/caregiverShare";
import { getCaregiverPreferences } from "../services/caregiverPreferences";
import { listCaregiverContacts } from "../services/caregiverContacts";
import { t, useLanguage } from "../services/i18n";

interface Props {
  selectedContactId?: string;
}

export default function CaregiverShareScreen({ selectedContactId }: Props) {
  useLanguage();
  const [copied, setCopied] = useState(false);
  const prefs = selectedContactId ? getCaregiverPreferences(selectedContactId) : undefined;
  const contact = selectedContactId ? listCaregiverContacts().find((c) => c.id === selectedContactId) : undefined;

  const snapshot = useMemo(() => buildCaregiverSnapshot(prefs), [selectedContactId]);
  const text = useMemo(() => caregiverSummaryText(prefs), [selectedContactId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const share = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "NilaMind", text });
      } else {
        await copy();
      }
    } catch { /* user cancelled or unsupported */ }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="caregiver-share-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
          <Users className="w-5 h-5 text-success" /> {t("shareTrustedTitle")}
          {contact ? <span className="text-sm font-normal text-ink-muted">— {contact.name}</span> : null}
        </h1>
        <p className="text-base text-ink-muted leading-relaxed">
          {t("cg_consent_body")}
        </p>
      </header>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <HeartHandshake className="w-4 h-4 text-rose-400" /> {snapshot.headline}
        </div>
        <ul className="space-y-1.5 text-base text-ink-2 leading-relaxed">
          {snapshot.lines.map((l, i) => (
            <li key={i} className="flex gap-2"><span className="text-success">•</span><span>{l}</span></li>
          ))}
        </ul>
        <div className="pt-2 border-t border-line-strong">
          <p className="text-[11px] font-semibold text-ink-muted mb-1">If they're in crisis:</p>
          <ul className="space-y-1 text-[11px] text-ink-2">
            {snapshot.crisisLines.map((l, i) => (
              <li key={i} className="flex gap-2"><span className="text-rose-400">•</span><span>{l}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copy}
          className="flex-1 py-3 rounded-xl bg-line-strong hover:bg-slate-600 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={share}
          className="flex-1 py-3 rounded-xl bg-success hover:opacity-90 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      <p className="text-base text-ink-faint text-center">
        This is a wellness snapshot, not a clinical summary. NilaMind is not a substitute for professional care.
      </p>
    </div>
  );
}
