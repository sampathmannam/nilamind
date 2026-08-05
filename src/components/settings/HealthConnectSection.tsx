import { useEffect, useState } from "react";
import { t } from "../../services/i18n";
import { Activity } from "lucide-react";
import {
  getHealthConnectStatus,
  requestHealthConnectAccess,
  isHealthConnectEnabled,
  setHealthConnectEnabled,
} from "../../services/healthConnect";

export default function HealthConnectSection() {
  const [status, setStatus] = useState({ available: false, enabled: false, granted: false });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealthConnectStatus().then((s) => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, []);

  const toggleEnabled = () => {
    const next = !isHealthConnectEnabled();
    setHealthConnectEnabled(next);
    setStatus((prev) => ({ ...prev, enabled: next }));
  };

  const connect = async () => {
    setBusy(true);
    setResult(null);
    const res = await requestHealthConnectAccess();
    setBusy(false);
    if (res.ok) {
      setStatus((prev) => ({ ...prev, enabled: true, granted: true }));
      setResult("Connected — Nila can read sleep data from Health Connect.");
    } else if (res.reason === "not-native") {
      setResult("Health Connect is only available on Android.");
    } else if (res.reason === "unavailable") {
      setResult("Health Connect isn't installed or isn't reachable on this device.");
    } else if (res.reason === "denied") {
      setResult("Permission was denied — you can enable it in system settings later.");
    } else {
      setResult("Couldn't connect right now. You can try again later.");
    }
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-health-connect">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" /> {t("sec_health_connect")}
        </h2>
        <p className="text-base text-ink-muted mt-1 leading-relaxed">
          Optional: let Nila read sleep hours from Health Connect (e.g. COROS, Fitbit, Garmin) instead of relying only on self-report.
          Nothing is uploaded — it stays on your phone.
        </p>
      </div>

      <div className="border border-line rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-ink-2">Use Health Connect</div>
          <div className="text-xs text-ink-faint">
            {status.available ? "Available on this device" : "Not available on this device"}
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          id="settings-healthconnect-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${status.enabled ? "bg-accent" : "bg-line-strong"}`}
          role="switch" aria-checked={status.enabled}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${status.enabled ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>

      {status.enabled && !status.granted && status.available && (
        <button
          onClick={connect}
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent disabled:bg-line-strong text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          {busy ? "Requesting…" : "Connect Health Connect"}
        </button>
      )}

      {result && (
        <p className="text-base text-ink-2 leading-relaxed">{result}</p>
      )}
    </div>
  );
}
