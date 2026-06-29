import React, { useState } from "react";
import { MessageCircle, Send, Copy, Check, LifeBuoy, Sparkles, ChevronRight } from "lucide-react";
import { REACH_OPENERS, REACH_FRAMING, buildSmsHref, checkReachText } from "../services/reachOut";
import { getCrisisReply } from "../safety";
import CrisisLines from "./CrisisLines";

// Reach-out (trusted-person bridge). The app NEVER sends and NEVER stores the recipient/draft — it prepares
// an editable opener the user sends THEMSELVES via their own app (Web Share → sms: → Copy). §9 gate runs at
// the SEND action: on a crisis hit, crisis help becomes PRIMARY and send is DEMOTED (not disabled, not
// cleared). Draft lives only in ephemeral state — never persisted, never logged. See the Reach-out spec.
export default function ReachOutScreen() {
  const [draft, setDraft] = useState("");
  const [crisisElevated, setCrisisElevated] = useState(false);
  const [copied, setCopied] = useState(false);

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function fallbackCopy(text: string) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      flashCopied();
    } catch {
      /* nothing more we can do */
    }
  }
  function copy() {
    const text = draft.trim();
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flashCopied, () => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  // MUST stay synchronous from the click (Web Share needs transient user activation — no await before share)
  function doShare(text: string) {
    if (!text) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ text }).catch((err: unknown) => {
        if (err && (err as { name?: string }).name === "AbortError") return; // user cancelled — stay put
        window.location.href = buildSmsHref(text); // genuine failure → SMS composer
      });
      return;
    }
    window.location.href = buildSmsHref(text);
  }
  function send() {
    const text = draft.trim();
    if (!text) return;
    if (checkReachText(text)) {
      setCrisisElevated(true); // §9: elevate crisis to primary, demote send — do not send yet
      return;
    }
    doShare(text);
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="reachout-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-400" /> Reach out
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Telling one person you trust can help. Here's a gentle way to start — you send it yourself, your way.
        </p>
      </header>

      {crisisElevated ? (
        <>
          {/* ── PRIMARY: crisis help (deterministic §9) ── */}
          <div className="bg-card border border-rose-500/40 p-5 rounded-2xl space-y-3" id="reachout-crisis">
            <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-1.5">
              <LifeBuoy className="w-4 h-4" /> You matter — support is here right now
            </h3>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{getCrisisReply()}</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              It's really good you're reaching out. Alongside your message, a crisis line can talk with you
              right now — they're free, confidential, and trained for exactly this.
            </p>
            <CrisisLines tone="rose" />
          </div>

          {/* draft kept (read-only here) + DEMOTED send ── */}
          {draft.trim() && (
            <div className="bg-page border border-slate-800 rounded-xl p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Your message (kept)</p>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{draft.trim()}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => doShare(draft.trim())}
              className="flex-1 py-2.5 rounded-xl font-medium text-xs bg-page text-slate-400 border border-slate-800 hover:text-slate-200 transition-all cursor-pointer"
            >
              Message them anyway
            </button>
            <button
              onClick={copy}
              className="px-4 py-2.5 rounded-xl font-medium text-xs bg-page text-slate-400 border border-slate-800 hover:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />} Copy
            </button>
          </div>
          <button
            onClick={() => setCrisisElevated(false)}
            className="w-full text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 cursor-pointer"
          >
            Back to writing
          </button>
        </>
      ) : (
        <>
          {/* always-available route to support */}
          <button
            onClick={() => setCrisisElevated(true)}
            id="reachout-support"
            className="w-full flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-3.5 cursor-pointer text-left transition-colors"
          >
            <LifeBuoy className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-rose-200">Need support right now?</span>
          </button>

          {/* gentle, cited framing */}
          <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2">
            {REACH_FRAMING.map((f) => (
              <p key={f.id} className="text-xs text-slate-300 leading-relaxed flex gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
                <span>{f.text}</span>
              </p>
            ))}
          </div>

          {/* opener chooser */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Start with…</p>
            {REACH_OPENERS.map((o) => (
              <button
                key={o.id}
                onClick={() => setDraft(o.text)}
                className="w-full text-left bg-card border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3 text-xs text-slate-300 leading-relaxed transition-all cursor-pointer"
              >
                “{o.text}”
              </button>
            ))}
            <button
              onClick={() => setDraft("")}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 cursor-pointer"
            >
              Write my own
            </button>
          </div>

          {/* editable draft */}
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (crisisElevated) setCrisisElevated(false);
            }}
            placeholder="Your message — edit it however feels right."
            id="reachout-draft"
            className="w-full h-28 bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
          />

          {/* send (primary) + copy (always co-equal) */}
          <div className="flex gap-2">
            <button
              onClick={send}
              className="flex-1 py-3 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
              disabled={!draft.trim()}
            >
              <Send className="w-4 h-4" /> Send it myself
            </button>
            <button
              onClick={copy}
              disabled={!draft.trim()}
              className="px-4 py-3 rounded-xl font-semibold text-xs bg-page text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />} Copy
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed px-1 flex gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
            A trusted person is a great start — a GP or therapist can help too, whenever you're ready. A crisis
            line or your local emergency number is there for you any time, day or night.
          </p>
        </>
      )}
    </div>
  );
}
