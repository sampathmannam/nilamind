import { useState } from "react";
import { ShieldCheck, Heart, Trash2, Check } from "lucide-react";
import { loadPact, savePact, ratifyPact, clearPact, isPactStale, type Pact } from "../services/pact";

// "A letter to your unwell self" — the witness-gated, no-teeth pact. Authored when well; Nila only ever
// SHOWS it back to you (and offers a tap-to-reach handoff to your named person) when a real shift is
// noticed. No autonomous action, always overridable, edit/delete anytime. (Red-panel safe-core feature.)
export default function PactScreen() {
  const [pact, setPact] = useState<Pact | null>(() => loadPact());
  const [letter, setLetter] = useState(pact?.letter ?? "");
  const [name, setName] = useState(pact?.person.name ?? "");
  const [contact, setContact] = useState(pact?.person.contact ?? "");
  const [saved, setSaved] = useState(false);

  const canSave = letter.trim().length > 0 && name.trim().length > 0;
  const stale = isPactStale(pact);

  const onSave = () => {
    if (!canSave) return;
    setPact(savePact(letter, { name, contact }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const onRatify = () => { const p = ratifyPact(); if (p) setPact(p); };
  const onDelete = () => { clearPact(); setPact(null); setLetter(""); setName(""); setContact(""); };
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ""; } };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="pact-screen">
      <header className="space-y-1">
        <h1 className="text-2xl font-display font-semibold text-slate-100 flex items-center gap-2">
          <Heart className="w-5 h-5 text-purple-400" /> A letter to your unwell self
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Write this when you're steady. If Nila ever notices a real shift — like your sleep shrinking — she'll
          quietly show you these words and offer to reach the person you trust. She only ever <span className="text-slate-300">shows</span> it
          to you; she never acts on her own, and you can edit or delete it anytime.
        </p>
      </header>

      {pact && (
        <div className="bg-card border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-500 flex items-center justify-between gap-2">
          <span>Written {fmt(pact.writtenAt)} · last confirmed {fmt(pact.ratifiedAt)}</span>
          {stale && (
            <button onClick={onRatify} className="text-amber-300 font-semibold flex items-center gap-1 cursor-pointer shrink-0">
              <Check className="w-3.5 h-3.5" /> Still holds
            </button>
          )}
        </div>
      )}
      {stale && (
        <p className="text-[11px] text-amber-400/90 -mt-3">
          It's been a while — when you have a steady moment, re-read it and tap "Still holds" (or update it) so it stays true to you.
        </p>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Your words</label>
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          rows={7}
          placeholder="What would help you hear, when you can't trust your own head? What do you want future-you to do — or not do?"
          className="w-full bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 leading-relaxed placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Someone you trust</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name"
          className="w-full bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or how to reach them (optional)"
          className="w-full bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
        />
        <p className="text-[11px] text-slate-600 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Stays on your phone. Nila will only ever offer — you tap to reach them.
        </p>
      </div>

      <button
        onClick={onSave}
        disabled={!canSave}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl cursor-pointer transition-colors"
      >
        {saved ? "Saved ✓" : pact ? "Update my letter" : "Save my letter"}
      </button>

      {pact && (
        <button onClick={onDelete} className="w-full text-rose-400/80 hover:text-rose-300 text-xs font-semibold py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Delete this letter
        </button>
      )}
    </div>
  );
}
