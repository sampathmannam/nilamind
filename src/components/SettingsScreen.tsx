import React, { useState } from "react";
import { Settings as SettingsIcon, Users, Shield, Gauge, ChevronDown, ChevronUp, Bell, Volume2, Sun, MessageSquare, Cpu } from "lucide-react";
import { t, useLanguage } from "../services/i18n";
import { isAutoUpdateEnabled, setAutoUpdateEnabled } from "../services/autoUpdate";
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
import CloudApiSection from "./settings/CloudApiSection";
import PerformanceDashboard from "./PerformanceDashboard";

interface SettingsScreenProps {
  onOpenCaregiver?: () => void;
  onOpenLegal?: () => void;
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

export default function SettingsScreen({ onOpenCaregiver, onOpenLegal }: SettingsScreenProps) {
  const [showPerf, setShowPerf] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoUpdateOn, setAutoUpdateOn] = useState(isAutoUpdateEnabled());
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
        <button
          onClick={onOpenLegal}
          className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
          id="privacy-policy-link"
        >
          <span className="shrink-0 text-blue-400"><Shield className="w-5 h-5" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">{t("privacyPolicy")}</span>
              <span className="block text-[11px] text-slate-400">{t("privacyPolicySub")}</span>
            </span>
        </button>
        <button
          onClick={onOpenLegal}
          className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
          id="terms-of-service-link"
        >
          <span className="shrink-0 text-blue-400"><Shield className="w-5 h-5" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">{t("sec_legal")}</span>
              <span className="block text-[11px] text-slate-400">{t("sec_legalSub")}</span>
            </span>
        </button>
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
          <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-auto-update">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" /> Auto-update
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                When enabled, the app periodically checks the GitHub releases page for a newer APK and offers to install it.
                This is an opt-in network request — off by default for privacy.
              </p>
            </div>
            <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-200">Check for updates</div>
                <div className="text-[10px] text-slate-500">{autoUpdateOn ? "GitHub release check enabled" : "Disabled — no network requests"}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoUpdateOn}
                aria-label="Toggle auto-update"
                onClick={() => {
                  const next = !autoUpdateOn;
                  setAutoUpdateOn(next);
                  setAutoUpdateEnabled(next);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  autoUpdateOn ? "bg-purple-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoUpdateOn ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          <CloudApiSection />
          <InflectionSection />
          <HealthConnectSection />
          <OnDeviceSection />
        </div>
      )}
    </div>
  );
}
