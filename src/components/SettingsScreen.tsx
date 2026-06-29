import React, { useState, useEffect, useRef } from "react";
import { Settings as SettingsIcon, EyeOff, Eye, Lock, ShieldCheck, Loader2, AlertTriangle, KeyRound, Copy, Download, Check, Volume2, Play, Bell, Sun, Moon, Monitor, Activity, Cpu } from "lucide-react";
import { localLlmId } from "../services/localLlm";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "../services/theme";
import { hasPin, setPin as setStorePin, removePin as removeStorePin } from "../services/secureStore";
import { isPassthrough } from "../services/secureLocal";
import { loadIdentity, exportBackup } from "../services/identity";
import { requireAuth, isBiometricAvailable } from "../services/biometricGate";
import { getVoicePrefs, setVoicePrefs, speak, listEnglishVoices, type TtsVoice } from "../services/voice";
import { afHeartAvailable, AF_HEART_ID } from "../services/afHeartVoice";
import { getWakeEnabled, setWakeEnabled } from "../services/wakePrefs";
import { wakeWord } from "../services/wakeWord";
import { getReminderPrefs, setReminderPrefs } from "../services/reminders";
import { syncDailyReminders, clearDailyReminders } from "../services/notifications";
import { getInflectionEnabled, setInflectionEnabled } from "../services/inflectionPrefs";

interface SettingsScreenProps {
  disableAnchorPulse: boolean;
  onTogglePulse: (val: boolean) => void;
}

export default function SettingsScreen({ disableAnchorPulse, onTogglePulse }: SettingsScreenProps) {
  return (
    <div className="space-y-6 max-w-md mx-auto text-slate-100" id="settings-view">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 font-sans tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-slate-400" /> Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Application preferences and sensory regulation.</p>
      </div>

      <AppearanceSection />

      <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-emerald-400" /> Sensory Overload
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Adjust visual pacing or limit distractions if animations are overstimulating.
          </p>
        </div>

        <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-slate-200">Pause Anchor Pulse</div>
            <div className="text-[10px] text-slate-500">Stops the rhythmic pulse on the emergency button.</div>
          </div>

          <button
            onClick={() => onTogglePulse(!disableAnchorPulse)}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-page transition-colors ${
              disableAnchorPulse ? "bg-emerald-500" : "bg-slate-700"
            }`}
            role="switch"
            aria-checked={disableAnchorPulse}
          >
            <span className="sr-only">Pause anchor pulse</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                disableAnchorPulse ? "translate-x-2.5" : "-translate-x-2.5"
              }`}
            />
          </button>
        </div>
      </div>

      <VoiceSection />
      <RemindersSection />
      <InflectionSection />
      <OnDeviceSection />
      <IdentitySection />
      <PrivacyLockSection />
    </div>
  );
}

function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice());
  const opts: { id: ThemeChoice; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
    { id: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
  ];
  const pick = (c: ThemeChoice) => { setChoice(c); setThemeChoice(c); };
  return (
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg" id="settings-appearance">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" /> Appearance
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Choose what's easiest on your eyes — there's no right answer, just what feels calmest for you.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => pick(o.id)}
            id={`settings-theme-${o.id}`}
            role="radio"
            aria-checked={choice === o.id}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${choice === o.id ? "bg-blue-500/15 border-blue-500/50 text-blue-300" : "bg-page border-slate-800 text-slate-400 hover:border-slate-700"}`}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RemindersSection() {
  const [p, setP] = useState(getReminderPrefs());
  const [status, setStatus] = useState<string | null>(null);
  // Persist the change, then reconcile the actual scheduled nudge. Permission is asked here, at the
  // moment the user opts in — never up-front.
  const up = (x: Partial<ReturnType<typeof getReminderPrefs>>) => {
    setP((c) => ({ ...c, ...x }));
    setReminderPrefs(x);
    const willBeEnabled = x.enabled ?? p.enabled;
    if (!willBeEnabled) { clearDailyReminders(); setStatus(null); return; }
    setStatus("Setting up your reminder…");
    syncDailyReminders().then((r) => {
      if (r.scheduled) setStatus(`On — one gentle nudge daily, around ${r.at}.`);
      else if (r.reason === "denied") setStatus("Allow notifications in your phone settings to receive nudges.");
      else if (r.reason === "unavailable") setStatus("Reminders will run once the app is installed on your phone.");
      else setStatus(null);
    });
  };
  const TimeInput = ({ value, on }: { value: string; on: (v: string) => void }) => (
    <input type="time" value={value} onChange={(e) => on(e.target.value)} aria-label="Time" className="bg-card border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50" />
  );
  return (
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg" id="settings-reminders">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" /> Gentle Reminders
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          One gentle nudge a day — inside your window, never during quiet hours. No streak guilt, ever.
          {status && <span className="block text-blue-300 mt-1" id="settings-reminders-status">{status}</span>}
        </p>
      </div>
      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="text-sm font-medium text-slate-200">Reminders</div>
        <button
          onClick={() => up({ enabled: !p.enabled })}
          id="settings-reminders-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${p.enabled ? "bg-blue-500" : "bg-slate-700"}`}
          role="switch" aria-checked={p.enabled}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${p.enabled ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>
      {p.enabled && (
        <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Remind me between</span>
            <div className="flex items-center gap-1"><TimeInput value={p.windowStart} on={(v) => up({ windowStart: v })} /><span className="text-slate-600">–</span><TimeInput value={p.windowEnd} on={(v) => up({ windowEnd: v })} /></div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Quiet hours</span>
            <div className="flex items-center gap-1"><TimeInput value={p.quietStart} on={(v) => up({ quietStart: v })} /><span className="text-slate-600">–</span><TimeInput value={p.quietEnd} on={(v) => up({ quietEnd: v })} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

const VOICE_SAMPLE = "Hey, it's me. This is how I'll sound — no rush, I'm right here with you.";

function VoiceSection() {
  const [prefs, setPrefs] = useState(getVoicePrefs());
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [afHeart, setAfHeart] = useState(false); // is af_heart (server neural voice) available?
  const [wake, setWake] = useState(getWakeEnabled());
  const wakePending = useRef(false);
  const update = (p: Partial<ReturnType<typeof getVoicePrefs>>) => { setPrefs((cur) => ({ ...cur, ...p })); setVoicePrefs(p); };

  // Load the device's voices + probe for the server af_heart voice once the feature is on.
  useEffect(() => {
    if (!prefs.enabled) return;
    let alive = true;
    listEnglishVoices().then((vs) => { if (alive) setVoices(vs); }).catch(() => {});
    afHeartAvailable().then((ok) => { if (alive) setAfHeart(ok); }).catch(() => {});
    return () => { alive = false; };
  }, [prefs.enabled]);

  const pickVoice = (id?: string) => {
    update({ voiceId: id });
    setTimeout(() => speak(VOICE_SAMPLE), 80); // preview the just-chosen voice
  };

  return (
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg" id="settings-voice">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-400" /> Soothing Voice
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          A calm voice can read Nila and your check-ins aloud, so you don't have to read — and you can speak instead of type.
        </p>
      </div>

      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-slate-200">Read aloud</div>
          <div className="text-[10px] text-slate-500">Nila speaks replies; read-aloud buttons appear.</div>
        </div>
        <button
          onClick={() => update({ enabled: !prefs.enabled })}
          id="settings-voice-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${prefs.enabled ? "bg-blue-500" : "bg-slate-700"}`}
          role="switch"
          aria-checked={prefs.enabled}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${prefs.enabled ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-1.5" id="settings-heynila">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-200">"Hey Nila" wake word</div>
          <button
            id="settings-heynila-toggle"
            role="switch"
            aria-checked={wake}
            aria-label={'"Hey Nila" wake word'}
            onClick={async () => {
              if (wakePending.current) return;
              wakePending.current = true;
              try {
                const next = !wake;
                setWake(next);
                setWakeEnabled(next);
                // On ENABLE: do NOT call wakeWord.start() here as a probe — that caused a
                // double-start Android mic race that intermittently threw and latched
                // available=false (the "intermittent brick" bug). App.tsx's startWakeIfEnabled
                // is already wired to nilaWakePrefChanged and performs the single real start.
                if (!next) {
                  await wakeWord.dispose();
                }
                // Notify App to (re)start or stop continuous listening immediately,
                // without requiring a background→foreground cycle.
                window.dispatchEvent(new Event("nilaWakePrefChanged"));
              } finally {
                wakePending.current = false;
              }
            }}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${wake ? "bg-blue-500" : "bg-slate-700"}`}
          >
            <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${wake ? "translate-x-2.5" : "-translate-x-2.5"}`} />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Say "Nila" to start a call. Listens only while the app is open, matches the word entirely on your device, and records nothing. A dot shows whenever the mic is on. Off by default.
        </p>
      </div>

      {prefs.enabled && (
        <>
          {/* Voice picker — tap any voice to hear it and choose it */}
          {(voices.length > 0 || afHeart) && (
            <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="settings-voice-picker">
              <div className="text-xs font-medium text-slate-300">Nila's voice</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1" role="radiogroup" aria-label="Nila's voice">
                {afHeart && (
                  <VoiceRow
                    label="Nila's natural voice ✨"
                    sub="af_heart · warm neural voice, runs on your own server"
                    selected={prefs.voiceId === AF_HEART_ID}
                    onClick={() => pickVoice(AF_HEART_ID)}
                  />
                )}
                <VoiceRow label="System default" sub="Your device's default" selected={!prefs.voiceId} onClick={() => pickVoice(undefined)} />
                {voices.map((v) => (
                  <VoiceRow key={v.id} label={v.name} sub={`${v.lang} · ${v.local ? "on-device" : "network"}`} selected={prefs.voiceId === v.id} onClick={() => pickVoice(v.id)} />
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Tap one to hear it. <span className="text-slate-400">af_heart</span> is a warm neural voice synthesised on your own server (private, a touch slower). <span className="text-slate-400">On-device</span> voices never leave your phone; <span className="text-slate-400">network</span> ones are richer but fetched by your device's engine.
              </p>
            </div>
          )}

          {/* Speed + a global preview of the current voice */}
          <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Speed</span>
              <span className="font-mono text-blue-400">{prefs.rate.toFixed(2)}×</span>
            </div>
            <input
              type="range" min={0.6} max={1.2} step={0.05} value={prefs.rate}
              onChange={(e) => update({ rate: parseFloat(e.target.value) })}
              aria-label="Speed"
              className="w-full h-1.5 rounded-lg bg-card accent-blue-500 cursor-pointer"
            />
            <button
              onClick={() => speak(VOICE_SAMPLE)}
              id="settings-voice-preview"
              className="text-[11px] text-blue-300 hover:text-blue-200 cursor-pointer flex items-center gap-1 pt-1"
            >
              <Play className="w-3 h-3" /> Preview voice
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function VoiceRow({ label, sub, selected, onClick }: { label: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left cursor-pointer transition-all ${selected ? "bg-blue-500/15 border-blue-500/50" : "bg-card border-slate-800 hover:border-slate-700"}`}
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-200 truncate">{label}</span>
        <span className="block text-[10px] text-slate-500">{sub}</span>
      </span>
      {selected ? <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Play className="w-3 h-3 text-slate-500 shrink-0" />}
    </button>
  );
}

function InflectionSection() {
  const [on, setOn] = useState(getInflectionEnabled());
  const toggle = () => { const next = !on; setOn(next); setInflectionEnabled(next); };
  return (
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg" id="settings-inflection">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" /> Gentle Nudges from Nila
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          If you turn this on, Nila may gently mention when she notices a real, lasting shift in how you've been —
          only when you open her, never a notification, always something you can wave off. Off by default.
        </p>
      </div>
      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="text-sm font-medium text-slate-200">Let Nila mention shifts</div>
        <button
          onClick={toggle}
          id="settings-inflection-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${on ? "bg-blue-500" : "bg-slate-700"}`}
          role="switch" aria-checked={on}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${on ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>
    </div>
  );
}

function OnDeviceSection() {
  const [modelId, setModelId] = useState<string | null>(null);

  // On-device is no longer optional — it IS Nila's brain. Poll localLlmId() until the backend
  // registers (async probe in main.tsx) so we can show the live status (no toggle to flip).
  useEffect(() => {
    setModelId(localLlmId()); // immediate
    let tries = 0;
    const t = setInterval(() => {
      const id = localLlmId();
      if (id) { setModelId(id); clearInterval(t); }
      else if (++tries >= 40) clearInterval(t); // give up polling after ~10s
    }, 250);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg" id="settings-ondevice">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-400" /> Nila Runs On Your Device
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Nila's mind runs entirely on your phone — your conversations never leave the device and no
          internet is needed to talk. On desktop (dev) this uses Ollama (<span className="font-mono">ollama serve</span> first);
          on Android the on-device model loads automatically.
        </p>
      </div>

      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page" id="settings-ondevice-status">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-slate-200">On-device brain</div>
          <div className="text-[10px] text-slate-500">{modelId ? `Running on ${modelId}` : "Loading model…"}</div>
        </div>
        <div
          aria-label={modelId ? "On-device model active" : "On-device model loading"}
          className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full ${modelId ? "bg-violet-500/15 text-violet-300" : "bg-slate-700/50 text-slate-400"}`}
        >
          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${modelId ? "bg-violet-400" : "bg-slate-500"}`} />
          {modelId ? "Active" : "Loading"}
        </div>
      </div>

      {!modelId && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl p-3">
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Desktop: run <span className="font-mono text-amber-100">ollama serve</span> then refresh this page.
            Android: the model downloads on first open.
          </p>
        </div>
      )}
    </div>
  );
}

function IdentitySection() {
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
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg" id="settings-identity">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-400" /> Account & Recovery
        </h3>
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
          <button onClick={doExport} disabled={busy} id="settings-export-backup" className="w-full bg-card border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5" /> Create backup</>}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={download} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg cursor-pointer">Download .txt</button>
            <button onClick={() => navigator.clipboard.writeText(backup)} className="bg-card border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-lg cursor-pointer">Copy</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivacyLockSection() {
  const [pinOn, setPinOn] = useState<boolean>(hasPin());
  const [mode, setMode] = useState<"idle" | "setting" | "removing">("idle");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passthrough = isPassthrough();

  const reset = () => { setPin(""); setConfirm(""); setError(null); setMode("idle"); };

  const doSetPin = async () => {
    if (busy) return;
    if (pin.length < 4) { setError("Use at least 4 digits."); return; }
    if (pin !== confirm) { setError("The two PINs don't match."); return; }
    setBusy(true);
    setError(null);
    try {
      await setStorePin(pin);
      setPinOn(true);
      reset();
    } catch (e) {
      setError("Couldn't set the PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doRemovePin = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await removeStorePin();
      setPinOn(false);
      reset();
    } catch (e) {
      setError("Couldn't remove the PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg" id="settings-privacy">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-400" /> Privacy Lock
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Your entries — check-ins, diary, episodes, assessments — are always encrypted on this
          device. Add a PIN for an extra layer: it'll be asked each time you open the app, and only
          you can unlock your data.
        </p>
      </div>

      {passthrough && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Secure storage isn't available in this browser/session, so a PIN can't be added right now.
            Your data is still saved locally.
          </p>
        </div>
      )}

      {/* Current state row */}
      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${pinOn ? "text-emerald-400" : "text-slate-600"}`} />
            <span className="text-sm font-medium text-slate-200">{pinOn ? "PIN lock is on" : "PIN lock is off"}</span>
          </div>
          {mode === "idle" && !passthrough && (
            pinOn ? (
              <button onClick={() => setMode("removing")} className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 cursor-pointer">Remove</button>
            ) : (
              <button onClick={() => setMode("setting")} id="settings-set-pin" className="text-[11px] font-semibold text-blue-300 hover:text-blue-200 cursor-pointer">Set up</button>
            )
          )}
        </div>

        {/* Set PIN flow */}
        {mode === "setting" && (
          <div className="space-y-2 pt-1">
            <input
              type="password" inputMode="numeric" autoFocus value={pin}
              onChange={(e) => setPin(e.target.value)} placeholder="New PIN (min 4 digits)"
              aria-label="New PIN"
              id="settings-pin-input"
              className="w-full bg-card border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 tracking-widest placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            <input
              type="password" inputMode="numeric" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm PIN"
              onKeyDown={(e) => e.key === "Enter" && doSetPin()}
              aria-label="Confirm PIN"
              id="settings-pin-confirm"
              className="w-full bg-card border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 tracking-widest placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            <p className="text-[10px] text-amber-300/80 leading-relaxed flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> If you forget this PIN, your encrypted entries cannot be recovered. There's no reset.
            </p>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 bg-card border border-slate-800 text-slate-400 text-xs py-2 rounded-lg cursor-pointer">Cancel</button>
              <button onClick={doSetPin} disabled={busy} id="settings-pin-save" className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Turn on PIN lock"}
              </button>
            </div>
          </div>
        )}

        {/* Remove PIN flow */}
        {mode === "removing" && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-slate-400">Turn off the PIN? Your data stays encrypted on the device — it just won't ask for a PIN to open.</p>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 bg-card border border-slate-800 text-slate-400 text-xs py-2 rounded-lg cursor-pointer">Keep it on</button>
              <button onClick={doRemovePin} disabled={busy} className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Remove PIN"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
