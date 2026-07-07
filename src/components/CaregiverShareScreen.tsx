import React, { useMemo, useState } from "react";
import { Users, Copy, Share2, HeartHandshake } from "lucide-react";
import { caregiverSummaryText, buildCaregiverSnapshot } from "../services/caregiverShare";

export default function CaregiverShareScreen() {
  const [copied, setCopied] = useState(false);
  const snapshot = useMemo(() => buildCaregiverSnapshot(), []);
  const text = useMemo(() => caregiverSummaryText(), []);

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
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> Share with a trusted person
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Family and friends often help in the Indian context. You're in control: Nila builds a plain-language
          snapshot from your own progress and you hand it to someone you trust. Nothing is sent automatically.
        </p>
      </header>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <HeartHandshake className="w-4 h-4 text-rose-400" /> {snapshot.headline}
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
          {snapshot.lines.map((l, i) => (
            <li key={i} className="flex gap-2"><span className="text-emerald-400">•</span><span>{l}</span></li>
          ))}
        </ul>
        <div className="pt-2 border-t border-slate-700">
          <p className="text-[11px] font-semibold text-slate-400 mb-1">If they're in crisis:</p>
          <ul className="space-y-1 text-[11px] text-slate-300">
            {snapshot.crisisLines.map((l, i) => (
              <li key={i} className="flex gap-2"><span className="text-rose-400">•</span><span>{l}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copy}
          className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={share}
          className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        This is a wellness snapshot, not a clinical summary. NilaMind is not a substitute for professional care.
      </p>
    </div>
  );
}
