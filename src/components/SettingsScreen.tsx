import React from "react";
import { Settings as SettingsIcon, EyeOff } from "lucide-react";
import AppearanceSection from "./settings/AppearanceSection";
import VoiceSection from "./settings/VoiceSection";
import RemindersSection from "./settings/RemindersSection";
import InflectionSection from "./settings/InflectionSection";
import HealthConnectSection from "./settings/HealthConnectSection";
import OnDeviceSection from "./settings/OnDeviceSection";
import IdentitySection from "./settings/IdentitySection";
import PrivacyLockSection from "./settings/PrivacyLockSection";
import FeedbackSection from "./settings/FeedbackSection";
import LanguageSection from "./settings/LanguageSection";

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
      <LanguageSection />

      {/* Sensory Overload — lives in the container because it's driven by app-level props. */}
      <div className="glass p-5 rounded-2xl space-y-4 shadow-lg">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-emerald-400" /> Sensory Overload
          </h2>
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
      <HealthConnectSection />
      <OnDeviceSection />
      <IdentitySection />
      <PrivacyLockSection />
      <FeedbackSection />
    </div>
  );
}
