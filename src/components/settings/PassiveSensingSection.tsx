import { useState } from "react";
import { t } from "../../services/i18n";
import { Activity, Database, Eye, Trash2 } from "lucide-react";
import { getPassiveSensingEnabled, setPassiveSensingEnabled } from "../../services/passiveSensingPrefs";
import { getSensingStatus } from "../../services/passiveSensingManager";
import { clearPassiveSensingData } from "../../services/signalStore";

export default function PassiveSensingSection() {
  const [on, setOn] = useState(getPassiveSensingEnabled());
  const [status, setStatus] = useState<ReturnType<typeof getSensingStatus>>({
    lastExtraction: null,
    activeSources: [],
    featureCount: 0,
    oldestFeature: null,
  });

  const refreshStatus = () => {
    setStatus(getSensingStatus());
  };

  const toggle = () => {
    const next = !on;
    setOn(next);
    setPassiveSensingEnabled(next);
  };

  const handleDelete = () => {
    if (confirm(t("pi_delete_confirm") ?? "Delete all passive sensing data? This cannot be undone.")) {
      // Actually delete — the previous CustomEvent("open-your-data") had no listener anywhere, so the
      // "This cannot be undone" confirm deleted nothing. Clear the store and reflect it immediately.
      clearPassiveSensingData();
      refreshStatus();
    }
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-passive-sensing">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" /> {t("sec_passive_sensing")}
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          {t("sec_passive_sensing_sub")}
        </p>
      </div>
      <div className="border border-line rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-ink-2">{t("pi_enable_label")}</div>
          <div className="text-xs text-ink-faint">{t("pi_enable_sub")}</div>
        </div>
        <button
          onClick={toggle}
          id="settings-passive-sensing-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${on ? "bg-blue-500" : "bg-line-strong"}`}
          role="switch" aria-checked={on}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${on ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>
      {on && (
        <div className="space-y-3 pt-2 border-t border-line">
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" /> {status.featureCount} {t("pi_extractions")}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {status.activeSources.join(", ") || t("pi_no_sources")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" /> {t("pi_last_extraction")}: {status.lastExtraction ? new Date(status.lastExtraction).toLocaleDateString() : t("pi_never")}
            </span>
          </div>
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-3 glass hover:brightness-125 p-3 rounded-xl transition-all active:scale-[0.99] cursor-pointer text-left text-rose-300"
            id="settings-passive-sensing-delete"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">{t("pi_delete_data")}</span>
            <span className="text-[11px] text-ink-faint ml-auto">{t("pi_delete_sub")}</span>
          </button>
        </div>
      )}
    </div>
  );
}