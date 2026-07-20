import React, { useState } from "react";
import { t } from "../../services/i18n";
import { Activity } from "lucide-react";
import { getInflectionEnabled, setInflectionEnabled } from "../../services/inflectionPrefs";

export default function InflectionSection() {
  const [on, setOn] = useState(getInflectionEnabled());
  const toggle = () => { const next = !on; setOn(next); setInflectionEnabled(next); };
  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-inflection">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" /> {t("sec_inflection")}
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          If you turn this on, Nila may gently mention when she notices a real, lasting shift in how you've been —
          only when you open her, never a notification, always something you can wave off. Off by default.
        </p>
      </div>
      <div className="border border-line rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="text-sm font-medium text-ink-2">Let Nila mention shifts</div>
        <button
          onClick={toggle}
          id="settings-inflection-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${on ? "bg-blue-500" : "bg-line-strong"}`}
          role="switch" aria-checked={on}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${on ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>
    </div>
  );
}
