import { useState } from "react";
import { t } from "../../services/i18n";
import { Bell } from "lucide-react";
import { getReminderPrefs, setReminderPrefs } from "../../services/reminders";
import { syncDailyReminders, clearDailyReminders } from "../../services/notifications";

export default function RemindersSection() {
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
    <input type="time" value={value} onChange={(e) => on(e.target.value)} aria-label="Time" className="glass rounded-lg px-2 py-1.5 text-xs text-ink-2 focus:outline-none focus:border-accent/50" />
  );
  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-reminders">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" /> {t("sec_reminders")}
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          One gentle nudge a day — inside your window, never during quiet hours. No streak guilt, ever.
          {status && <span className="block text-accent-hi mt-1" id="settings-reminders-status">{status}</span>}
        </p>
      </div>
      <div className="border border-line rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="text-sm font-medium text-ink-2">Reminders</div>
        <button
          onClick={() => up({ enabled: !p.enabled })}
          id="settings-reminders-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${p.enabled ? "bg-accent" : "bg-line-strong"}`}
          role="switch" aria-checked={p.enabled}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${p.enabled ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>
      {p.enabled && (
        <div className="border border-line rounded-xl p-3 bg-page space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">Remind me between</span>
            <div className="flex items-center gap-1"><TimeInput value={p.windowStart} on={(v) => up({ windowStart: v })} /><span className="text-slate-600">–</span><TimeInput value={p.windowEnd} on={(v) => up({ windowEnd: v })} /></div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">Quiet hours</span>
            <div className="flex items-center gap-1"><TimeInput value={p.quietStart} on={(v) => up({ quietStart: v })} /><span className="text-slate-600">–</span><TimeInput value={p.quietEnd} on={(v) => up({ quietEnd: v })} /></div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-ink-muted">Weekly review (Sundays)</span>
            <button
              onClick={() => up({ weeklyDigest: !p.weeklyDigest })}
              id="settings-weekly-digest-toggle"
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${p.weeklyDigest ? "bg-accent" : "bg-line-strong"}`}
              role="switch" aria-checked={p.weeklyDigest}
            >
              <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${p.weeklyDigest ? "translate-x-2.5" : "-translate-x-2.5"}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
