// ReachOutInlineCard — compact reach-out-to-someone card rendered inline.
// Template → edit → send via SMS/share. Zero navigation needed.

import React, { useState } from "react";
import { Send, Copy, Check, MessageCircle } from "lucide-react";
import { REACH_OPENERS, buildSmsHref } from "../../services/reachOut";

interface ReachOutInlineCardProps {
  onComplete?: () => void;
}

export default function ReachOutInlineCard({ onComplete }: ReachOutInlineCardProps) {
  const [draft, setDraft] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTemplateSelect = (idx: number) => {
    setSelectedTemplate(idx);
    setDraft(REACH_OPENERS[idx].text);
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ text: draft }).catch(() => {
        window.location.href = buildSmsHref(draft);
      });
    } else {
      window.location.href = buildSmsHref(draft);
    }
    setSent(true);
    onComplete?.();
  };

  const handleCopy = () => {
    if (!draft.trim()) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(draft).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  if (sent) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-center" id="reach-out-inline-done">
        <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-200">Message sent</p>
        <p className="text-xs text-emerald-300/70 mt-1">Reaching out takes courage. You did it.</p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-sky-500/25 rounded-2xl p-4" id="reach-out-inline-card">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-sky-400 shrink-0" />
        <p className="text-sm font-semibold text-slate-100">Reach out to someone</p>
      </div>

      {!draft && (
        <div className="space-y-2 mb-3">
          <p className="text-xs text-slate-400">Pick an opener:</p>
          {REACH_OPENERS.slice(0, 3).map((opener, i) => (
            <button
              key={i}
              onClick={() => handleTemplateSelect(i)}
              className="w-full text-left p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-sky-500/40 text-xs text-slate-300 transition-colors cursor-pointer leading-relaxed"
            >
              {opener.text.length > 80 ? opener.text.slice(0, 80) + "..." : opener.text}
            </button>
          ))}
        </div>
      )}

      {draft && (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full text-sm glass rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleSend}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 border border-sky-500/30 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
