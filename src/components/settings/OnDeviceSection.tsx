import React, { useState, useEffect } from "react";
import { t } from "../../services/i18n";
import { Cpu } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { localLlmId } from "../../services/localLlm";

export default function OnDeviceSection() {
  const [modelId, setModelId] = useState<string | null>(null);
  // 2026-07-12 device-QA (F11): "On desktop (dev) this uses Ollama…" / "Desktop: run ollama serve" shipped
  // verbatim to real phone users — that copy only makes sense on the web/dev path, never on-device.
  const isNative = Capacitor.isNativePlatform();

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
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-ondevice">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-400" /> {t("sec_on_device")}
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          {isNative ? (
            "Nila's mind runs entirely on your phone — your conversations never leave the device and no internet is needed to talk. The on-device model loads automatically."
          ) : (
            <>
              Nila's mind runs entirely on your phone — your conversations never leave the device and no
              internet is needed to talk. On desktop (dev) this uses Ollama (<span className="font-mono">ollama serve</span> first);
              on Android the on-device model loads automatically.
            </>
          )}
        </p>
      </div>

      <div className="border border-line rounded-xl p-3 flex items-center justify-between bg-page" id="settings-ondevice-status">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-ink-2">On-device brain</div>
          <div className="text-xs text-ink-faint">{modelId ? `Running on ${modelId}` : "Loading model…"}</div>
        </div>
        <div
          aria-label={modelId ? "On-device model active" : "On-device model loading"}
          className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full ${modelId ? "bg-violet-500/15 text-violet-300" : "bg-line-strong/50 text-ink-muted"}`}
        >
          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${modelId ? "bg-violet-400" : "bg-ink-faint"}`} />
          {modelId ? "Active" : "Loading"}
        </div>
      </div>

      {!modelId && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl p-3">
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            {isNative ? (
              "The model downloads on first open."
            ) : (
              <>
                Desktop: run <span className="font-mono text-amber-100">ollama serve</span> then refresh this page.
                Android: the model downloads on first open.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
