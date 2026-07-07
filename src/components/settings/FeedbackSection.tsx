import React from "react";
import { MessageSquare, ExternalLink } from "lucide-react";

export default function FeedbackSection() {
  const REPO = "https://github.com/sampathmannam/nilamind";
  return (
    <div className="glass p-5 rounded-2xl space-y-3 shadow-lg" id="settings-feedback">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" /> Feedback &amp; about
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          NilaMind is an open-source research preview, and your feedback shapes it. Nothing is sent
          automatically — these open in your browser, and you choose what to share.
        </p>
      </div>
      <a
        href={`${REPO}/issues/new`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between border border-slate-800 rounded-xl p-3 bg-page hover:border-purple-500/50 transition-colors min-h-[44px]"
      >
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-slate-200">Report a problem or suggest an idea</div>
          <div className="text-[10px] text-slate-500">Opens GitHub. For bugs &amp; ideas — please don't include anything private.</div>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
      </a>
      <a
        href={REPO}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between border border-slate-800 rounded-xl p-3 bg-page hover:border-purple-500/50 transition-colors min-h-[44px]"
      >
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-slate-200">Source code &amp; docs</div>
          <div className="text-[10px] text-slate-500">Open source under Apache-2.0 — read it or build it yourself.</div>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
      </a>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        Your in-app reactions and "suggest a better reply" stay on your device. NilaMind has no backend
        and collects nothing — the deeper signal comes from people choosing to share it, never from harvesting.
      </p>
    </div>
  );
}
