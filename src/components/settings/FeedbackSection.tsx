import React, { useEffect, useState } from "react";
import { t } from "../../services/i18n";
import { MessageSquare, ExternalLink, Copy, Check } from "lucide-react";
import { pendingContributions, type ReplyFeedback } from "../../services/nilaFeedback";

export default function FeedbackSection() {
  const REPO = "https://github.com/sampathmannam/nilamind";
  const [pending, setPending] = useState<ReplyFeedback[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPending(pendingContributions());
  }, []);

  const handleCopySuggestions = () => {
    const text = pending.map((p, i) =>
      `Suggestion ${i + 1}: ${p.suggestion}\n(in reply to: ${p.reply.slice(0, 200)})`
    ).join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-3 shadow-lg" id="settings-feedback">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" /> {t("sec_feedback")}
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          NilaMind is an open-source research preview, and your feedback shapes it. Nothing is sent
          automatically — these open in your browser, and you choose what to share.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="border border-purple-500/30 bg-purple-500/10 rounded-xl p-3 space-y-2">
          <div className="text-[12px] text-purple-200/90 font-medium">
            {pending.length} improvement suggestion{pending.length !== 1 ? "s" : ""} ready
          </div>
          <p className="text-xs text-purple-300/70 leading-relaxed">
            You typed {pending.length} suggestion{pending.length !== 1 ? "s" : ""} for how Nila could have replied better.
            These stay on your device — tap Copy to save them, then paste into a GitHub issue.
          </p>
          <button
            onClick={handleCopySuggestions}
            className="flex items-center gap-1.5 text-[11px] font-medium rounded-lg py-1.5 px-3 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy your suggestions"}
          </button>
        </div>
      )}

      <a
        href={`${REPO}/issues/new`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between border border-line rounded-xl p-3 bg-page hover:border-purple-500/50 transition-colors min-h-[44px]"
      >
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-ink-2">Report a problem or suggest an idea</div>
          <div className="text-xs text-ink-faint">Opens GitHub. For bugs &amp; ideas — please don't include anything private.</div>
        </div>
        <ExternalLink className="w-4 h-4 text-ink-faint shrink-0" />
      </a>
      <a
        href={REPO}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between border border-line rounded-xl p-3 bg-page hover:border-purple-500/50 transition-colors min-h-[44px]"
      >
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-ink-2">Source code &amp; docs</div>
          <div className="text-xs text-ink-faint">Open source under Apache-2.0 — read it or build it yourself.</div>
        </div>
        <ExternalLink className="w-4 h-4 text-ink-faint shrink-0" />
      </a>
      <p className="text-xs text-ink-faint leading-relaxed">
        Your in-app reactions and "suggest a better reply" stay on your device. NilaMind has no backend
        and collects nothing — the deeper signal comes from people choosing to share it, never from harvesting.
      </p>
    </div>
  );
}
