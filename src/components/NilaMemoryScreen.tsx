import React, { useState } from "react";
import { Sparkles, Pencil, Trash2, Check, X, TrendingUp, TrendingDown } from "lucide-react";
import {
  loadInsights, editInsight, deleteInsight, INSIGHT_KINDS,
  type Insight, type InsightKind,
} from "../services/nilaInsights";
import { latestInflectionsForLog, dismissLoggedSignal, type InflectionSignal } from "../services/nilaInflection";
import { loadFacts, removeFact, loadFoci, removeFocus, type ProfileFact, type ActiveFocus } from "../services/nilaProfile";
import { feedbackSummary, clearFeedback, pendingContributions, type FeedbackSummary, type ReplyFeedback } from "../services/nilaFeedback";
import { donationCount, clearDonations, buildDonationPreview, confirmDonation, revokeDonation, isDonated, type DonationPreview } from "../services/nilaContributions";
import EmptyStateShared, { EMPTY_STATES } from "./EmptyState";

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
  // Donation flow: pending contributions (feedback with suggestions) that can be donated.
  const [pendings, setPendings] = useState<ReplyFeedback[]>(() => pendingContributions());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DonationPreview | null>(null);
  const openPreview = (entry: ReplyFeedback) => { setPreviewId(entry.id); setPreview(buildDonationPreview(entry)); };
  const closePreview = () => { setPreviewId(null); setPreview(null); };
  const handleDonate = (entry: ReplyFeedback) => {
    const ok = confirmDonation(entry);
    if (ok) { setDonations(donationCount()); setPendings(pendingContributions()); }
    closePreview();
  };
  const handleRevoke = (id: string) => {
    revokeDonation(id);
    setDonations(donationCount());
    setPendings(pendingContributions());
  };

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
        <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" /> What Nila remembers
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed">
          The things Nila has come to understand about you over time — kept private on this device. Edit
          anything that's off, or delete what you'd rather she let go. If she notices something again
          later, just delete it again.
        </p>
      </header>

      {/* User-owned profile tiers — what they told Nila to keep. Deletable here = the consent backstop. */}
      {facts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint px-1">Things you've told Nila</h2>
          <div className="glass rounded-2xl divide-y divide-line/70">
            {facts.map((f) => (
              <div key={f.id} className="px-4 py-3 flex items-start gap-2">
                <span className="flex-1 text-sm text-ink-2 leading-relaxed">{f.text}</span>
                <button onClick={() => removeF(f.id)} aria-label="Delete" className="p-1 text-ink-faint hover:text-rose-400 shrink-0 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {foci.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint px-1">What you're working on right now</h2>
          <div className="glass rounded-2xl divide-y divide-line/70">
            {foci.map((f) => (
              <div key={f.id} className="px-4 py-3 flex items-start gap-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ink-2 leading-relaxed">{f.text}</span>
                  {f.when && <span className="block text-xs text-ink-faint mt-0.5">{f.when}</span>}
                </span>
                <button onClick={() => removeFo(f.id)} aria-label="Delete" className="p-1 text-ink-faint hover:text-rose-400 shrink-0 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {groups.length === 0 && facts.length === 0 && foci.length === 0 ? (
        <EmptyStateShared
          nilaState={EMPTY_STATES.noInsights.nilaState}
          title="Nothing yet"
          body="As you check in and talk with Nila, she'll gently start to remember what matters to you."
        />
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="space-y-2">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint px-1">{g.label}</h2>
            <div className="glass rounded-2xl divide-y divide-line/70">
              {g.items.map((i) => (
                <div key={i.id} className="px-4 py-3">
                  {editingId === i.id ? (
                    <div className="space-y-2">
                      <textarea
                        aria-label="Edit what Nila remembers"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        /* .glass sets its own unlayered border, which would silently defeat a
                           focus:border-* utility (same class of dead-class bug caught in the
                           OnboardingGate/CaregiverSettings passes) - using the ring-based focus
                           pattern from Sheet.tsx's close button instead, which doesn't compete
                           with .glass's border on the same property. */
                        className="w-full text-sm glass rounded-xl p-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={cancelEdit} aria-label="Cancel" className="p-1.5 text-ink-muted hover:text-ink-2 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => saveEdit(i.id)} aria-label="Save" className="p-1.5 text-emerald-400 hover:text-emerald-300 cursor-pointer">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="flex-1 text-sm text-ink-2 leading-relaxed">{i.text}</span>
                      <button onClick={() => startEdit(i)} aria-label="Edit" className="p-1 text-ink-faint hover:text-ink-2 shrink-0 cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(i.id)} aria-label="Delete" className="p-1 text-ink-faint hover:text-rose-400 shrink-0 cursor-pointer">
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
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint px-1">Patterns Nila's noticed lately</h2>
        {noticed.length === 0 ? (
          <p className="text-[11px] text-ink-faint px-1 leading-relaxed">Nothing notable yet — Nila watches your own trends quietly.</p>
        ) : (
          <div className="glass rounded-2xl divide-y divide-line/70">
            {noticed.map((n) => (
              <div key={n.id} className="px-4 py-3 flex items-start gap-2">
                {n.direction === "deterioration"
                  ? <TrendingUp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  : <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ink-2 leading-relaxed">{n.detail}</span>
                  <span className="block text-xs text-ink-faint mt-0.5">{n.basis}</span>
                </span>
                <button onClick={() => dismissNoticed(n.id)} aria-label="Dismiss" className="p-1 text-ink-faint hover:text-rose-400 shrink-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-faint px-1 leading-relaxed">
          Computed on your device and never sent anywhere. Nila only mentions these in chat if you turn it on in Settings.
        </p>
      </section>

      {(fb.total > 0 || donations > 0) && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint px-1">Helping improve Nila</h2>
          {fb.total > 0 && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <p className="text-sm text-ink-2 leading-relaxed">
                You've rated <strong>{fb.total}</strong> {fb.total === 1 ? "reply" : "replies"} — {fb.up} 👍, {fb.down} 👎{fb.suggestions ? `, and suggested ${fb.suggestions} better ${fb.suggestions === 1 ? "reply" : "replies"}` : ""}.
              </p>
              <p className="text-xs text-ink-faint leading-relaxed">
                It all stays on this device — it's how Nila learns to do better over time, and you can wipe it any time.
              </p>
              <button onClick={clearFb} className="text-[11px] font-semibold text-ink-muted hover:text-rose-400 cursor-pointer">
                Clear feedback
              </button>
            </div>
          )}
          {pendings.length > 0 && (
            <div className="glass rounded-2xl p-4 space-y-3" id="memory-pending-donations">
              <p className="text-sm text-ink-2 leading-relaxed">
                You have <strong>{pendings.length}</strong> {pendings.length === 1 ? "reply" : "replies"} where you suggested a better wording — each can be donated to help train Nila.
              </p>
              {pendings.map((p) => (
                <div key={p.id} className="bg-slate-900/40 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-ink-2 line-clamp-2">{p.suggestion}</p>
                  <div className="flex items-center gap-2">
                    {previewId === p.id && preview ? (
                      <div className="space-y-2 w-full">
                        <div className="bg-slate-950/60 rounded-lg p-2 text-xs text-ink-2">
                          <span className="text-ink-faint">Nila said:</span> {preview.nilaReply || "(empty)"}
                        </div>
                        <div className="bg-slate-950/60 rounded-lg p-2 text-xs text-ink-2">
                          <span className="text-ink-faint">Your suggestion:</span> {preview.betterReply || "(none)"}
                        </div>
                        {preview.blockedByCrisis ? (
                          <p className="text-xs text-rose-400">This can't be shared — it contains crisis content.</p>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button onClick={closePreview} className="text-[11px] text-ink-muted hover:text-ink-2 cursor-pointer px-2 py-1">Cancel</button>
                            <button onClick={() => handleDonate(p)} className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer px-2 py-1">Confirm donate</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {isDonated(p.id) ? (
                          <button onClick={() => handleRevoke(p.id)} className="text-[11px] text-ink-muted hover:text-rose-400 cursor-pointer">Withdraw</button>
                        ) : (
                          <button onClick={() => openPreview(p)} className="text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 cursor-pointer">Preview & donate</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-ink-faint leading-relaxed">
                Each donation is only Nila's reply + your suggested wording — scrubbed of emails, phone numbers, and links. Nothing leaves your phone until a future upload step.
              </p>
            </div>
          )}
          {donations > 0 && (
            <div className="glass rounded-2xl p-4 space-y-2" id="memory-donations">
              <p className="text-sm text-ink-2 leading-relaxed">
                You've chosen to share <strong>{donations}</strong> {donations === 1 ? "example" : "examples"} to help train Nila.
              </p>
              <p className="text-xs text-ink-faint leading-relaxed">
                Nothing has left your phone. You can withdraw any time.
              </p>
              <button onClick={withdrawAll} className="text-[11px] font-semibold text-ink-muted hover:text-rose-400 cursor-pointer">
                Withdraw all
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
