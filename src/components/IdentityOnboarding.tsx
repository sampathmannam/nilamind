import React, { useState } from "react";
import { Anchor, Copy, Check, ShieldCheck, AlertTriangle, KeyRound, ArrowLeft, Loader2, Download } from "lucide-react";
import { newMnemonic, isValidMnemonic, createIdentity, importBackup } from "../services/identity";

// First-run identity: create a new private space (generates a recovery phrase) or restore from an
// existing phrase (re-derives the same ID). No email, no password, no server.
type Mode = "choose" | "show" | "restore";

export default function IdentityOnboarding({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [mnemonic, setMnemonic] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [backupInput, setBackupInput] = useState("");
  const [showBackupBox, setShowBackupBox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startCreate = () => { setMnemonic(newMnemonic()); setConfirmed(false); setMode("show"); };

  const copyPhrase = async () => {
    try { await navigator.clipboard.writeText(mnemonic); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const finishCreate = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    try { await createIdentity(mnemonic); onDone(); }
    catch { setError("Something went wrong creating your space. Please try again."); setBusy(false); }
  };

  const finishRestore = async () => {
    if (busy) return;
    const m = restoreInput.trim();
    if (!isValidMnemonic(m)) { setError("That doesn't look like a valid 12-word phrase. Check the words and spacing."); return; }
    setBusy(true);
    setError(null);
    try {
      await createIdentity(m);
      if (showBackupBox && backupInput.trim()) {
        try { await importBackup(backupInput, m); } catch { /* identity still restored; backup optional */ }
      }
      onDone();
    } catch { setError("Couldn't restore from that phrase. Please try again."); setBusy(false); }
  };

  // ── CHOOSE ──
  if (mode === "choose") {
    return (
      <Shell>
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Anchor className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Welcome to NilaMind</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            No email, no password, no account on any server. Your space is private to this device and
            recovered with a phrase only you hold.
          </p>
        </div>
        <div className="space-y-2.5">
          <button onClick={startCreate} id="identity-create" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer">
            Create a new private space
          </button>
          <button onClick={() => { setMode("restore"); setError(null); }} id="identity-restore-open" className="w-full bg-card border border-slate-800 hover:bg-raised text-slate-200 font-semibold py-3.5 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4" /> I have a recovery phrase
          </button>
        </div>
      </Shell>
    );
  }

  // ── SHOW NEW PHRASE ──
  if (mode === "show") {
    const words = mnemonic.split(" ");
    return (
      <Shell>
        <button onClick={() => setMode("choose")} className="text-xs font-semibold text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-400" /> Save your recovery phrase</h1>
          <p className="text-xs text-slate-400 leading-relaxed">These 12 words are the <span className="text-slate-200 font-semibold">only</span> way to recover your data. Write them down and keep them somewhere safe and private. We can't reset them for you.</p>
        </div>
        <div className="grid grid-cols-3 gap-2" id="identity-phrase-grid">
          {words.map((w, i) => (
            <div key={i} className="bg-page border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 flex items-center gap-1.5">
              <span className="text-slate-600 font-mono text-[10px] w-4">{i + 1}</span>
              <span className="font-semibold">{w}</span>
            </div>
          ))}
        </div>
        <button onClick={copyPhrase} className="w-full bg-card border border-slate-800 hover:bg-raised text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2">
          {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy phrase</>}
        </button>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">Anyone with these words can restore your data. Don't screenshot them to the cloud or share them.</p>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} id="identity-confirm-saved" className="mt-0.5 accent-blue-500 w-4 h-4" />
          <span className="text-xs text-slate-300">I've written my phrase down somewhere safe.</span>
        </label>
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
        <button onClick={finishCreate} disabled={!confirmed || busy} id="identity-finish-create" className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter NilaMind"}
        </button>
      </Shell>
    );
  }

  // ── RESTORE ──
  return (
    <Shell>
      <button onClick={() => { setMode("choose"); setError(null); }} className="text-xs font-semibold text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2"><KeyRound className="w-5 h-5 text-blue-400" /> Restore with your phrase</h1>
        <p className="text-xs text-slate-400 leading-relaxed">Enter your 12-word recovery phrase, separated by spaces.</p>
      </div>
      <textarea
        value={restoreInput}
        onChange={(e) => setRestoreInput(e.target.value)}
        placeholder="word1 word2 word3 …"
        aria-label="Recovery phrase"
        id="identity-restore-input"
        className="w-full h-24 bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
      />
      <button onClick={() => setShowBackupBox((v) => !v)} className="text-[11px] font-semibold text-blue-300 hover:text-blue-200 flex items-center gap-1 cursor-pointer">
        <Download className="w-3.5 h-3.5" /> {showBackupBox ? "Hide" : "Also restore data from a backup (optional)"}
      </button>
      {showBackupBox && (
        <textarea
          value={backupInput}
          onChange={(e) => setBackupInput(e.target.value)}
          placeholder="Paste your encrypted backup text here…"
          aria-label="Encrypted backup"
          id="identity-backup-input"
          className="w-full h-20 bg-page border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
        />
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <button onClick={finishRestore} disabled={busy} id="identity-finish-restore" className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Restore my space"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-5" id="identity-onboarding">{children}</div>
    </div>
  );
}
