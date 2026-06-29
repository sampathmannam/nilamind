import React, { useState } from "react";
import { Sparkles, Pencil, Trash2, Check, X, TrendingUp, TrendingDown } from "lucide-react";
import {
  loadInsights, editInsight, deleteInsight, INSIGHT_KINDS,
  type Insight, type InsightKind,
} from "../services/nilaInsights";
import { latestInflectionsForLog, dismissLoggedSignal, type InflectionSignal } from "../services/nilaInflection";
import { loadFacts, removeFact, loadFoci, removeFocus, type ProfileFact, type ActiveFocus } from "../services/nilaProfile";
import { feedbackSummary, clearFeedback, type FeedbackSummary } from "../services/nilaFeedback";
import { donationCount, clearDonations } from "../services/nilaContributions";

export const KIND_LABELS: Record<InsightKind, string> = {
  working_through: "What you're working through",
  what_helps: "What helps you",
  pattern: "Patterns I've noticed",
  context: "Your life right now",
  value: "What matters to you",
};

export interface KindGroup { kind: InsightKind; label: string; items: Insight[]; }

/** PURE: bucket insights by kind in INSIGHT_KINDS order, omitting empty groups. */
export function groupByKind(all: Insight[]): KindGroup[] {
  return INSIGHT_KINDS
    .map((kind) => ({ kind, label: KIND_LABELS[kind], items: all.filter((i) => i.kind === kind) }))
    .filter((g) => g.items.length > 0);
}

export default function NilaMemoryScreen() {
  const [all, setAll] = useState<Insight[]>(() => loadInsights());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const refresh = () => setAll(loadInsights());

  const startEdit = (i: Insight) => { setEditingId(i.id); setDraft(i.text); };
  const cancelEdit = () => { setEditingId(null); setDraft(""); };
  const saveEdit = (id: string) => { editInsight(id, draft); cancelEdit(); refresh(); };
  const remove = (id: string) => { deleteInsight(id); refresh(); };

  const groups = groupByKind(all);

  // User-owned profile tiers — captured only with the person's say-so (services/nilaProfile.ts).
  const [facts, setFacts] = useState<ProfileFact[]>(() => loadFacts());
  const [foci, setFoci] = useState<ActiveFocus[]>(() => loadFoci());
  const removeF = (id: string) => { removeFact(id); setFacts(loadFacts()); };
  const removeFo = (id: string) => { removeFocus(id); setFoci(loadFoci()); };

  // On-device reply feedback — the improvement signal; shown as totals + a wipe (services/nilaFeedback).
  const [fb, setFb] = useState<FeedbackSummary>(() => feedbackSummary());
  const clearFb = () => { clearFeedback(); setFb(feedbackSummary()); };
  // Consented donations — examples the person chose to share to help train Nila (still on-device; no upload exists yet).
  const [donations, setDonations] = useState<number>(() => donationCount());
  const withdrawAll = () => { clearDonations(); setDonations(donationCount()); };

  const [noticed, setNoticed] = useState<(InflectionSignal & { surfaced: boolean })[]>(() => latestInflectionsForLog());
  const dismissNoticed = (id: string) => { dismissLoggedSignal(id); setNoticed(latestInflectionsForLog()); };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="nila-memory-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" /> What Nila remembers
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The things Nila has come to understand about you over time — kept private on this device. Edit
          anything that's off, or delete what you'd rather she let go. If she notices something again
          later, just delete it again.
        </p>
      </header>

      {/* User-owned profile tiers — what they told Nila to keep. Deletable here = the consent backstop. */}
      {facts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">Things you've told Nila</h2>
          <div className="bg-card border border-slate-800 rounded-2xl divide-y divide-slate-800/70">
            {facts.map((f) => (
              <div key={f.id} className="px-4 py-3 flex items-start gap-2">
                <span className="flex-1 text-sm text-slate-200 leading-relaxed">{f.text}</span>
                <button onClick={() => removeF(f.id)} aria-label="Delete" className="p-1 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {foci.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">What you're working on right now</h2>
          <div className="bg-card border border-slate-800 rounded-2xl divide-y divide-slate-800/70">
            {foci.map((f) => (
              <div key={f.id} className="px-4 py-3 flex items-start gap-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-slate-200 leading-relaxed">{f.text}</span>
                  {f.when && <span className="block text-[10px] text-slate-500 mt-0.5">{f.when}</span>}
                </span>
                <button onClick={() => removeFo(f.id)} aria-label="Delete" className="p-1 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {groups.length === 0 && facts.length === 0 && foci.length === 0 ? (
        <div className="bg-card border border-slate-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-slate-300">Nothing yet.</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            As you check in and talk with Nila, she'll gently start to remember what matters to you.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="space-y-2">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">{g.label}</h2>
            <div className="bg-card border border-slate-800 rounded-2xl divide-y divide-slate-800/70">
              {g.items.map((i) => (
                <div key={i.id} className="px-4 py-3">
                  {editingId === i.id ? (
                    <div className="space-y-2">
                      <textarea
                        aria-label="Edit what Nila remembers"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        className="w-full text-sm bg-slate-900/60 border border-slate-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-fuchsia-500"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={cancelEdit} aria-label="Cancel" className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => saveEdit(i.id)} aria-label="Save" className="p-1.5 text-emerald-400 hover:text-emerald-300 cursor-pointer">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="flex-1 text-sm text-slate-200 leading-relaxed">{i.text}</span>
                      <button onClick={() => startEdit(i)} aria-label="Edit" className="p-1 text-slate-500 hover:text-slate-300 shrink-0 cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(i.id)} aria-label="Delete" className="p-1 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">Patterns Nila's noticed lately</h2>
        {noticed.length === 0 ? (
          <p className="text-[11px] text-slate-500 px-1 leading-relaxed">Nothing notable yet — Nila watches your own trends quietly.</p>
        ) : (
          <div className="bg-card border border-slate-800 rounded-2xl divide-y divide-slate-800/70">
            {noticed.map((n) => (
              <div key={n.id} className="px-4 py-3 flex items-start gap-2">
                {n.direction === "deterioration"
                  ? <TrendingUp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  : <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-slate-200 leading-relaxed">{n.detail}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{n.basis}</span>
                </span>
                <button onClick={() => dismissNoticed(n.id)} aria-label="Dismiss" className="p-1 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-500 px-1 leading-relaxed">
          Computed on your device and never sent anywhere. Nila only mentions these in chat if you turn it on in Settings.
        </p>
      </section>

      {(fb.total > 0 || donations > 0) && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">Helping improve Nila</h2>
          {fb.total > 0 && (
            <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2">
              <p className="text-sm text-slate-200 leading-relaxed">
                You've rated <strong>{fb.total}</strong> {fb.total === 1 ? "reply" : "replies"} — {fb.up} 👍, {fb.down} 👎{fb.suggestions ? `, and suggested ${fb.suggestions} better ${fb.suggestions === 1 ? "reply" : "replies"}` : ""}.
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                It all stays on this device — it's how Nila learns to do better over time, and you can wipe it any time.
              </p>
              <button onClick={clearFb} className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 cursor-pointer">
                Clear feedback
              </button>
            </div>
          )}
          {donations > 0 && (
            <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2" id="memory-donations">
              <p className="text-sm text-slate-200 leading-relaxed">
                You've chosen to share <strong>{donations}</strong> {donations === 1 ? "example" : "examples"} to help train Nila.
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Each is only Nila's reply + your suggested wording — never your conversation. Nothing has left your phone, and you can withdraw any time.
              </p>
              <button onClick={withdrawAll} className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 cursor-pointer">
                Withdraw all
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
