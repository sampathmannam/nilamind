import React, { useState } from "react";
import { Settings as SettingsIcon, Users, Shield, ExternalLink, Gauge } from "lucide-react";
import { t, useLanguage } from "../services/i18n";
import AppearanceSection from "./settings/AppearanceSection";
import VoiceSection from "./settings/VoiceSection";
import RemindersSection from "./settings/RemindersSection";
import EmaSection from "./settings/EmaSection";
import NotificationCategoriesSection from "./settings/NotificationCategoriesSection";
import InflectionSection from "./settings/InflectionSection";
import HealthConnectSection from "./settings/HealthConnectSection";
import OnDeviceSection from "./settings/OnDeviceSection";
import IdentitySection from "./settings/IdentitySection";
import PrivacyLockSection from "./settings/PrivacyLockSection";
import FeedbackSection from "./settings/FeedbackSection";
import LanguageSection from "./settings/LanguageSection";
import RegionSection from "./settings/RegionSection";
import PilotSection from "./settings/PilotSection";
import PerformanceDashboard from "./PerformanceDashboard";

interface SettingsScreenProps {
  onOpenCaregiver?: () => void;
}

export default function SettingsScreen({ onOpenCaregiver }: SettingsScreenProps) {
  const [showPerf, setShowPerf] = useState(false);
  useLanguage();
  return (
    <div className="space-y-6 max-w-md mx-auto text-slate-100" id="settings-view">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 font-sans tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-slate-400" /> {t("settings")}
        </h1>
        <p className="text-xs text-slate-400 mt-1">{t("settingsIntro")}</p>
      </div>

      <AppearanceSection />
      <LanguageSection />
      <RegionSection />

      <VoiceSection />
<RemindersSection />
<EmaSection />
<NotificationCategoriesSection />
<InflectionSection />
<HealthConnectSection />
      <OnDeviceSection />
      <IdentitySection />
      <PrivacyLockSection />
      {onOpenCaregiver && (
        <button
          onClick={onOpenCaregiver}
          className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
          id="open-caregiver"
        >
          <span className="shrink-0 text-emerald-400"><Users className="w-5 h-5" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">{t("shareTrustedTitle")}</span>
              <span className="block text-[11px] text-slate-400">{t("shareTrustedSub")}</span>
            </span>
        </button>
      )}

      {/* Privacy Policy */}
      <a
        href="https://github.com/sampathmannam/nilamind/blob/main/PRIVACY_POLICY.md"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left no-underline"
        id="privacy-policy-link"
      >
        <span className="shrink-0 text-blue-400"><Shield className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100">{t("privacyPolicy")}</span>
            <span className="block text-[11px] text-slate-400">{t("privacyPolicySub")}</span>
          </span>
        <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
      </a>

      <FeedbackSection />
      <PilotSection />

      {/* Performance dashboard (developer/diagnostics) */}
      <button
        onClick={() => setShowPerf((v) => !v)}
        className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
        id="toggle-perf-dashboard"
      >
        <span className="shrink-0 text-blue-400"><Gauge className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100">{t("perfTitle")}</span>
            <span className="block text-[11px] text-slate-400">{t("perfSub")}</span>
          </span>
      </button>
      {showPerf && <PerformanceDashboard />}
    </div>
  );
}
