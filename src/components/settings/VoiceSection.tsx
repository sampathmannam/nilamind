import React, { useState, useEffect, useRef } from "react";
import { t } from "../../services/i18n";
import { Volume2, Play, Check } from "lucide-react";
import { getVoicePrefs, setVoicePrefs, speak, listEnglishVoices, type TtsVoice } from "../../services/voice";
import { afHeartAvailable, AF_HEART_ID } from "../../services/afHeartVoice";
import { getWakeEnabled, setWakeEnabled } from "../../services/wakePrefs";
import { wakeWord } from "../../services/wakeWord";

const VOICE_SAMPLE = "Hey, it's me. This is how I'll sound — no rush, I'm right here with you.";

export default function VoiceSection() {
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
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-voice">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-400" /> {t("sec_voice")}
        </h2>
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

      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page" id="settings-ondevice-stt">
        <div className="space-y-0.5 pr-3">
          <div className="text-sm font-medium text-slate-200">On-device voice (private)</div>
          <div className="text-[10px] text-slate-500 leading-relaxed">
            Turn your speech into text right on the phone, so your voice never leaves it. Turn off to use your device's system voice typing — often more accurate, but it may send your audio to the cloud.
          </div>
        </div>
        <button
          onClick={() => update({ onDeviceStt: prefs.onDeviceStt === false })}
          id="settings-ondevice-stt-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${prefs.onDeviceStt !== false ? "bg-blue-500" : "bg-slate-700"}`}
          role="switch"
          aria-checked={prefs.onDeviceStt !== false}
          aria-label="On-device voice"
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${prefs.onDeviceStt !== false ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
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
