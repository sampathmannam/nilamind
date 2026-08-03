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
import PassiveSensingSection from "./settings/PassiveSensingSection";

interface SettingsScreenProps {
  onOpenCaregiver?: () => void;
  onOpenLegal?: () => void;
}

function SettingsGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-mono uppercase tracking-widest text-ink-faint px-1 flex items-center gap-1.5">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function SearchFilter({ query, text, children }: { query: string; text: string; children: React.ReactNode }) {
  if (!query.trim()) return <>{children}</>;
  return query.toLowerCase().includes(text.toLowerCase()) ? <>{children}</> : null;
}

export default function SettingsScreen({ onOpenCaregiver, onOpenLegal }: SettingsScreenProps) {
  const [showPerf, setShowPerf] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoUpdateOn, setAutoUpdateOn] = useState(isAutoUpdateEnabled());
  const [searchQuery, setSearchQuery] = useState("");
  useLanguage();

  return (
    <div className="space-y-6 max-w-md mx-auto text-ink" id="settings-view">
      <div>
        <h1 className="text-xl font-semibold text-ink font-sans tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-ink-muted" /> {t("settings")}
        </h1>
        <p className="text-xs text-ink-muted mt-1">{t("settingsIntro")}</p>
      </div>

      {/* Settings search */}
      <div className="relative">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          aria-label="Search settings"
          className="w-full bg-card rounded-xl px-4 py-2.5 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent/50 border border-line transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-2 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <SearchFilter query={searchQuery} text="preferences appearance language region theme font calm mode">
        <SettingsGroup icon={<Sun className="w-3 h-3 text-amber-400" />} title="Preferences">
          <AppearanceSection />
          <LanguageSection />
          <RegionSection />
        </SettingsGroup>
      </SearchFilter>

      <SearchFilter query={searchQuery} text="audio voice speech stt text to speech tts">
        <SettingsGroup icon={<Volume2 className="w-3 h-3 text-blue-400" />} title="Audio">
          <VoiceSection />
        </SettingsGroup>
      </SearchFilter>

      <SearchFilter query={searchQuery} text="notifications reminders ema check-in schedule">
        <SettingsGroup icon={<Bell className="w-3 h-3 text-purple-400" />} title="Notifications">
          <RemindersSection />
          <EmaSection />
          <NotificationCategoriesSection />
        </SettingsGroup>
      </SearchFilter>

      <SearchFilter query={searchQuery} text="privacy security identity recovery phrase pin lock passcode caregiver share trusted legal policy terms">
        <SettingsGroup icon={<Shield className="w-3 h-3 text-emerald-400" />} title="Privacy & Security">
          <IdentitySection />
          <PrivacyLockSection />
          <PassiveSensingSection />
          {onOpenCaregiver && (
            <button
              onClick={onOpenCaregiver}
              className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
              id="open-caregiver"
            >
              <span className="shrink-0 text-emerald-400"><Users className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-ink">{t("shareTrustedTitle")}</span>
                  <span className="block text-[11px] text-ink-muted">{t("shareTrustedSub")}</span>
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
                <span className="block text-sm font-bold text-ink">{t("privacyPolicy")}</span>
                <span className="block text-[11px] text-ink-muted">{t("privacyPolicySub")}</span>
              </span>
          </button>
          <button
            onClick={onOpenLegal}
            className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
            id="terms-of-service-link"
          >
            <span className="shrink-0 text-blue-400"><Shield className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-ink">{t("sec_legal")}</span>
                <span className="block text-[11px] text-ink-muted">{t("sec_legalSub")}</span>
              </span>
          </button>
        </SettingsGroup>
      </SearchFilter>

      <SearchFilter query={searchQuery} text="help feedback pilot research study">
        <SettingsGroup icon={<MessageSquare className="w-3 h-3 text-purple-400" />} title="Help & Feedback">
          <FeedbackSection />
          <PilotSection />
        </SettingsGroup>
      </SearchFilter>

      <SearchFilter query={searchQuery} text="advanced developer performance dashboard auto update cloud api key model inflection health connect on device">
        {/* Advanced / Developer settings toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between py-2 px-1 text-ink-faint hover:text-ink-2 cursor-pointer transition-colors"
        >
          <span className="text-xs uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-ink-faint" /> Advanced
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
                  <span className="block text-sm font-bold text-ink">{t("perfTitle")}</span>
                  <span className="block text-[11px] text-ink-muted">{t("perfSub")}</span>
                </span>
            </button>
            <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-auto-update">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" /> Auto-update
              </h2>
              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                When enabled, the app periodically checks the GitHub releases page for a newer APK and offers to install it.
                This is an opt-in network request — off by default for privacy.
              </p>
            </div>
            <div className="border border-line rounded-xl p-3 flex items-center justify-between bg-page">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-ink-2">Check for updates</div>
                <div className="text-xs text-ink-faint">{autoUpdateOn ? "GitHub release check enabled" : "Disabled — no network requests"}</div>
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
                  autoUpdateOn ? "bg-accent" : "bg-line-strong"
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
      </SearchFilter>
    </div>
  );
}
