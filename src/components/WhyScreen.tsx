import React, { useState } from "react";
import { BookOpen, Download, Copy, Check, FlaskConical, Heart, AlertCircle } from "lucide-react";
import { WHY_INTRO, WHY_WE_BUILT_THIS, whyArticleAsText } from "../data/whyWeBuiltThis";
import { jsPDF } from "jspdf";
import { Capacitor } from "@capacitor/core";

// AUTOPILOT Phase 9 — "Why we built this": per-feature What → Why → Research, with honest citation
// markers. Reachable in-app (home card → auxView "why") and exportable as PDF.

export default function WhyScreen() {
  const [copied, setCopied] = useState(false);

  const download = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (
      text: string,
      fontSize: number,
      bold: boolean,
      color: [number, number, number],
      maxWidth: number,
    ) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = fontSize * 0.4;
      if (y + lines.length * lineHeight > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, margin, y);
      y += lines.length * lineHeight + 3;
    };

    // Title block
    addText("Why We Built NilaMind", 20, true, [30, 30, 30], contentWidth);
    addText("A calm companion for the hard days", 12, false, [100, 100, 100], contentWidth);
    y += 4;
    addText(WHY_INTRO, 10, false, [60, 60, 60], contentWidth);
    y += 6;

    // Feature sections
    for (const f of WHY_WE_BUILT_THIS) {
      addText(f.title, 13, true, [30, 30, 30], contentWidth);
      addText("What it is — " + f.what, 10, false, [60, 60, 60], contentWidth);
      addText("Why it helps — " + f.why, 10, false, [60, 60, 60], contentWidth);
      if (f.research.length) {
        addText("The Research:", 9, true, [100, 100, 100], contentWidth);
        for (const r of f.research) {
          const label = r.verified ? "" : "  [reference being verified]";
          addText("• " + r.citation + label, 8, false, [120, 120, 120], contentWidth);
        }
      }
      y += 4;
    }

    addText(
      "NilaMind is a support tool — not a substitute for professional care.",
      9,
      false,
      [130, 130, 130],
      contentWidth,
    );

    if (Capacitor.isNativePlatform()) {
      const dataUrl = doc.output("datauristring");
      window.open(dataUrl, "_system");
    } else {
      doc.save("why-we-built-nilamind.pdf");
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(whyArticleAsText()); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="why-screen">
      <header className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
          <BookOpen className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-lg font-bold text-slate-100">Why we built this</h1>
        <p className="text-xs text-slate-400 leading-relaxed">{WHY_INTRO}</p>
      </header>

      <div className="flex gap-2">
        <button onClick={download} id="why-export" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Download PDF
        </button>
        <button onClick={copy} className="bg-page border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
          {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>

      <div className="space-y-4">
        {WHY_WE_BUILT_THIS.map((f) => (
          <article key={f.id} className="bg-card border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-100">{f.title}</h2>
            <div className="space-y-2.5 text-xs leading-relaxed">
              <p className="text-slate-300"><span className="text-slate-500 font-semibold">What it is — </span>{f.what}</p>
              <p className="text-slate-300 flex gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400/80 shrink-0 mt-0.5" /><span><span className="text-slate-500 font-semibold">Why it helps — </span>{f.why}</span></p>
            </div>
            <div className="border-t border-slate-800/70 pt-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <FlaskConical className="w-3 h-3" /> The research
              </div>
              {f.research.map((r, i) => (
                <p key={i} className="text-[11px] text-slate-400 leading-relaxed pl-1">
                  {r.citation}
                  {!r.verified && (
                    <span className="inline-flex items-center gap-1 ml-1 text-amber-300/90 font-medium" title="We're double-checking this reference's exact details before citing it as settled.">
                      <AlertCircle className="w-3 h-3" /> reference being verified
                    </span>
                  )}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
        NilaMind is a support alongside — not a substitute for — professional care.
      </p>
    </div>
  );
}
