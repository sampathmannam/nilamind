import React, { useState, useMemo, useCallback } from "react";
import { ChevronLeft, Plus, Trash2, Eye, Bell, Users, type LucideIcon } from "lucide-react";
import { t, useLanguage } from "../services/i18n";
import EmptyState from "./EmptyState";
import { hapticSuccess } from "../hooks/useHaptics";
import {
  addCaregiverContact,
  removeCaregiverContact,
  listCaregiverContacts,
  type CaregiverContact,
} from "../services/caregiverContacts";
import {
  getCaregiverPreferences,
  setCaregiverPreferences,
  DEFAULT_PREFERENCES,
  type CaregiverPreferences,
} from "../services/caregiverPreferences";

interface Props {
  onClose: () => void;
  onOpenCaregiverShare?: (contactId: string) => void;
}

const CATEGORY_LABELS: { key: keyof CaregiverPreferences["shareCategories"]; label: string; icon: LucideIcon }[] = [
  { key: "mood", label: "cg_category_mood", icon: Bell },
  { key: "phase", label: "cg_category_phase", icon: Bell },
  { key: "sleep", label: "cg_category_sleep", icon: Bell },
  { key: "medication", label: "cg_category_medication", icon: Bell },
  { key: "wellbeing", label: "cg_category_wellbeing", icon: Bell },
  { key: "checkins", label: "cg_category_checkins", icon: Bell },
];

export default function CaregiverSettingsScreen({ onClose, onOpenCaregiverShare }: Props) {
  useLanguage();
  const [added, setAdded] = useState(0);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", phoneOrEmail: "", relationship: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(() => setAdded((n) => n + 1), []);
  const contacts = useMemo(() => listCaregiverContacts(), [added, adding, editId, selectedId]);

  const openAdd = () => {
    setForm({ name: "", phoneOrEmail: "", relationship: "" });
    setFormError(null);
    setAdding(true);
    setEditId(null);
  };

  const saveContact = () => {
    if (!form.name.trim()) { setFormError(t("cg_name") + " required"); return; }
    if (!form.phoneOrEmail.trim()) { setFormError(t("cg_phone_or_email") + " required"); return; }
    addCaregiverContact({ name: form.name, phoneOrEmail: form.phoneOrEmail, relationship: form.relationship, addedAt: new Date().toISOString() } as any);
    hapticSuccess(); // UX-5: tactile confirmation on contact add
    setAdding(false);
    setFormError(null);
    refresh();
  };

  const remove = (id: string) => {
    removeCaregiverContact(id);
    if (selectedId === id) setSelectedId(null);
    if (editId === id) setEditId(null);
    refresh();
  };

  const selectedPrefs = selectedId ? getCaregiverPreferences(selectedId) : null;

  const toggleCategory = (key: keyof CaregiverPreferences["shareCategories"]) => {
    if (!selectedId || !selectedPrefs) return;
    const next = {
      ...selectedPrefs,
      shareCategories: { ...selectedPrefs.shareCategories, [key]: !selectedPrefs.shareCategories[key] },
    };
    setCaregiverPreferences(selectedId, next);
    refresh();
  };

  const updateAutoAlert = (enabled: boolean) => {
    if (!selectedId || !selectedPrefs) return;
    setCaregiverPreferences(selectedId, {
      ...selectedPrefs,
      autoAlert: { ...selectedPrefs.autoAlert, enabled },
    });
    refresh();
  };

  const updateThreshold = (days: number) => {
    if (!selectedId || !selectedPrefs) return;
    setCaregiverPreferences(selectedId, {
      ...selectedPrefs,
      autoAlert: { ...selectedPrefs.autoAlert, thresholdDays: Math.max(1, days) },
    });
    refresh();
  };

  const updateMinIntensity = (val: number) => {
    if (!selectedId || !selectedPrefs) return;
    setCaregiverPreferences(selectedId, {
      ...selectedPrefs,
      autoAlert: { ...selectedPrefs.autoAlert, minIntensity: Math.min(10, Math.max(1, val)) },
    });
    refresh();
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="caregiver-settings-screen">
      <button onClick={onClose} className="text-xs font-semibold text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> {t("you_caregiver_settings_label") || "Caregiver settings"}
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">{t("you_caregiver_settings_sub")}</p>
      </header>

      {/* Contact list */}
      <div className="space-y-2">
        {contacts.length === 0 ? (
          <EmptyState
            illustration="🤝"
            title={t("cg_no_contacts") || "No trusted contacts yet"}
            body="Adding a trusted person means you can share a wellness snapshot when you need support."
          />
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setEditId(null); setAdding(false); }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedId === c.id ? "bg-emerald-600/10 border-emerald-500/40" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">{c.name}</span>
                  {c.relationship ? <span className="text-[10px] text-slate-400 ml-2">({c.relationship})</span> : null}
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="text-slate-500 hover:text-rose-400 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{c.phoneOrEmail}</p>
            </button>
          ))
        )}
        <button
          onClick={openAdd}
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-600 text-[11px] text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> {t("cg_add_contact")}
        </button>
      </div>

      {/* Add contact form */}
      {(adding || editId) ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
          <div className="grid gap-2">
            <input
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(null); }}
              placeholder={t("cg_name")}
              className="bg-page border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={form.phoneOrEmail}
              onChange={(e) => { setForm({ ...form, phoneOrEmail: e.target.value }); setFormError(null); }}
              placeholder={t("cg_phone_or_email")}
              className="bg-page border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={form.relationship}
              onChange={(e) => { setForm({ ...form, relationship: e.target.value }); setFormError(null); }}
              placeholder={t("cg_relationship")}
              className="bg-page border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>
          {formError && <p className="text-[11px] text-rose-300">{formError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setEditId(null); }} className="flex-1 py-2 rounded-xl bg-slate-700 text-xs text-slate-300 cursor-pointer">
              Cancel
            </button>
            <button onClick={saveContact} className="flex-1 py-2 rounded-xl bg-emerald-600 text-xs text-white font-bold cursor-pointer">
              {t("cg_save")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Per-contact preferences */}
      {selectedId && selectedPrefs ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-4" id="caregiver-prefs-panel">
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">{t("cg_share_categories")}</p>

          {CATEGORY_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-slate-300">{t(label as any)}</span>
              <button
                onClick={() => toggleCategory(key)}
                className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${
                  selectedPrefs.shareCategories[key] ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  selectedPrefs.shareCategories[key] ? "left-4" : "left-0.5"
                }`} />
              </button>
            </label>
          ))}

          <div className="pt-3 border-t border-slate-700">
            <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-2">{t("cg_auto_alert")}</p>
            <p className="text-[10px] text-slate-500 mb-2">{t("cg_auto_alert_desc")}</p>
            <label className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-300">Enable</span>
              <button
                onClick={() => updateAutoAlert(!selectedPrefs.autoAlert.enabled)}
                className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${
                  selectedPrefs.autoAlert.enabled ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  selectedPrefs.autoAlert.enabled ? "left-4" : "left-0.5"
                }`} />
              </button>
            </label>
            {selectedPrefs.autoAlert.enabled ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-0.5">
                  <span className="text-[10px] text-slate-400">{t("cg_threshold_days")}</span>
                  <input
                    type="number" min={1} max={14}
                    value={selectedPrefs.autoAlert.thresholdDays}
                    onChange={(e) => updateThreshold(Number(e.target.value))}
                    className="w-full bg-page border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[10px] text-slate-400">{t("cg_min_intensity")}</span>
                  <input
                    type="number" min={1} max={10}
                    value={selectedPrefs.autoAlert.minIntensity}
                    onChange={(e) => updateMinIntensity(Number(e.target.value))}
                    className="w-full bg-page border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </label>
              </div>
            ) : null}
          </div>

          {onOpenCaregiverShare ? (
            <button
              onClick={() => onOpenCaregiverShare(selectedId)}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-[11px] text-slate-200 font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> {t("cg_preview")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
