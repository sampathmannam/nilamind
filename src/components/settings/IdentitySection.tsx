import React, { useState, useEffect } from "react";
import { EyeOff, Eye, KeyRound, Copy, Download, Check, Loader2 } from "lucide-react";
import { loadIdentity, exportBackup } from "../../services/identity";
import { requireAuth, isBiometricAvailable } from "../../services/biometricGate";

export default function IdentitySection() {
  const id = loadIdentity();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backup, setBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bioAvail, setBioAvail] = useState<boolean | null>(null);
  useEffect(() => { isBiometricAvailable().then(setBioAvail).catch(() => setBioAvail(false)); }, []);
  if (!id) return null;

  const copyPhrase = async () => { try { await navigator.clipboard.writeText(id.mnemonic); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ } };
  const doExport = async () => {
    if (!(await requireAuth("Confirm it's you to export your data off this device."))) return;
    setBusy(true); try { setBackup(await exportBackup(id.mnemonic)); } catch { /* */ } finally { setBusy(false); }
  };
  const download = () => {
    if (!backup) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([backup], { type: "text/plain" }));
    a.download = `nilamind-backup-${id.userId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-identity">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-400" /> Account & Recovery
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          No email or password — your space is recovered with a 12-word phrase only you hold.
          <span className="block mt-1">ID: <span className="font-mono text-slate-300">{id.userId}</span></span>
        </p>
      </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Recovery phrase</span>
          <button
            onClick={async () => {
              if (!revealed && !(await requireAuth("Confirm it's you to show your recovery phrase."))) return;
              setRevealed((v) => !v);
            }}
            className="text-[11px] text-blue-300 hover:text-blue-200 cursor-pointer flex items-center gap-1"
          >
            {revealed ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Reveal</>}
          </button>
        </div>
        {revealed ? (
          <>
            <p className="text-xs text-slate-200 font-mono leading-relaxed break-words">{id.mnemonic}</p>
            <button onClick={copyPhrase} className="text-[11px] text-slate-300 hover:text-slate-100 cursor-pointer flex items-center gap-1">
              {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
            <p className="text-[10px] text-amber-300/80">Keep it private — anyone with it can restore your data.</p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">Hidden. Tap Reveal only when no one's looking.</p>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed">{bioAvail === false ? "🔒 No device lock set on this phone — wiping data, showing this phrase, and exporting each ask you to confirm in-app first." : "🔒 Wiping data, showing this phrase, and exporting a backup each ask for your fingerprint or device lock first."}</p>
      </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2">
        <span className="text-xs font-semibold text-slate-200">Encrypted backup</span>
        <p className="text-[11px] text-slate-500 leading-relaxed">A file you control, encrypted with your phrase — restore it on a new device by entering the same phrase. No cloud.</p>
        {!backup ? (
          <button onClick={doExport} disabled={busy} id="settings-export-backup" className="w-full glass hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5" /> Create backup</>}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={download} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg cursor-pointer">Download .txt</button>
            <button onClick={() => navigator.clipboard.writeText(backup)} className="glass text-slate-300 text-xs px-3 py-2.5 rounded-lg cursor-pointer">Copy</button>
          </div>
        )}
      </div>
    </div>
  );
}
