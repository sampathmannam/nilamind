import { useState } from "react";
import { t } from "../../services/i18n";
import { BellRing } from "lucide-react";
import { NOTIFICATION_CATEGORIES, getCategoryPrefs, setCategoryEnabled } from "../../services/notificationCategories";
import { syncEmaCheckins } from "../../services/notifications";
import { syncDailyReminders } from "../../services/notifications";

export default function NotificationCategoriesSection() {
  const [prefs, setPrefs] = useState(getCategoryPrefs());
  // Toggling a category re-syncs the OS notifications so a disabled category is cleared immediately and an
  // enabled one is re-armed. (syncX is idempotent cancel-first, so calling both is always safe.)
  const toggle = (id: keyof typeof prefs) => {
    const next = !prefs[id];
    const updated = { ...prefs, [id]: next };
    setPrefs(updated);
    setCategoryEnabled(id, next);
    void syncEmaCheckins({ request: true });
    void syncDailyReminders();
  };
  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-notif-categories">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <BellRing className="w-4 h-4 text-purple-400" /> {t("sec_notif_types")}
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          Choose which kinds of nudges Nila may send. Turn any off and she'll stay quiet in that category.
          Crisis resources are always reachable — this only tunes wellness nudges.
        </p>
      </div>
      <div className="space-y-2">
        {NOTIFICATION_CATEGORIES.map((c) => {
          const on = prefs[c.id];
          return (
            <div key={c.id} className="border border-line rounded-xl p-3 flex items-center justify-between gap-3 bg-page">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-2">{c.label}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">{c.description}</div>
              </div>
              <button
                onClick={() => toggle(c.id)}
                id={`notif-cat-${c.id}`}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${on ? "bg-purple-500" : "bg-line-strong"}`}
                role="switch"
                aria-checked={on}
                aria-label={c.label}
              >
                <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${on ? "translate-x-2.5" : "-translate-x-2.5"}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
