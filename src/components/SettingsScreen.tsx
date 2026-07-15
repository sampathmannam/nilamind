import React, { useState } from "react";
import { Settings as SettingsIcon, Users, Shield, ExternalLink, Gauge, ChevronDown, ChevronUp, Bell, Volume2, Sun, MessageSquare, Cpu } from "lucide-react";
import { t, useLanguage } from "../services/i18n";
import AppearanceSection from "./settings/AppearanceSection";
import LanguageSection from "./settings/LanguageSection";
import RegionSection from "./settings/RegionSection";
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
import PilotSection from "./settings/PilotSection";
import PerformanceDashboard from "./PerformanceDashboard";

interface SettingsScreenProps {
  onOpenCaregiver?: () => void;
}

function SettingsGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-1 flex items-center gap-1.5">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function SettingsScreen({ onOpenCaregiver }: SettingsScreenProps) {
  const [showPerf, setShowPerf] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  useLanguage();
  return (
    <div className="space-y-6 max-w-md mx-auto text-slate-100" id="settings-view">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 font-sans tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-slate-400" /> {t("settings")}
        </h1>
        <p className="text-xs text-slate-400 mt-1">{t("settingsIntro")}</p>
      </div>

      <SettingsGroup icon={<Sun className="w-3 h-3 text-amber-400" />} title="Preferences">
        <AppearanceSection />
        <LanguageSection />
        <RegionSection />
      </SettingsGroup>

      <SettingsGroup icon={<Volume2 className="w-3 h-3 text-blue-400" />} title="Audio">
        <VoiceSection />
      </SettingsGroup>

      <SettingsGroup icon={<Bell className="w-3 h-3 text-purple-400" />} title="Notifications">
        <RemindersSection />
        <EmaSection />
        <NotificationCategoriesSection />
      </SettingsGroup>

      <SettingsGroup icon={<Shield className="w-3 h-3 text-emerald-400" />} title="Privacy & Security">
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
      </SettingsGroup>

      <SettingsGroup icon={<MessageSquare className="w-3 h-3 text-purple-400" />} title="Help & Feedback">
        <FeedbackSection />
        <PilotSection />
      </SettingsGroup>

      {/* Advanced / Developer settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between py-2 px-1 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
      >
        <span className="text-[10px] uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-slate-500" /> Advanced
        </span>
        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showAdvanced && (
        <div className="space-y-3 animate-fade-in">
          {showPerf && <PerformanceDashboard />}
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
          <InflectionSection />
          <HealthConnectSection />
          <OnDeviceSection />
        </div>
      )}
    </div>
  );
}
