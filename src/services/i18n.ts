// Minimal, privacy-first i18n core. Translations are bundled in the app — no network calls.
// India-first languages: English (default), Hindi, Tamil, Telugu.

import { ls } from "./storageUtils";
import { useState, useEffect } from "react";

const STORAGE_KEY = "nilamind_language";

export type SupportedLang = "en" | "hi" | "ta" | "te";

export interface LangOption {
  code: SupportedLang;
  label: string;
  native: string;
}

export const LANGUAGES: LangOption[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

export type I18nKey =
  | "appName"
  | "greeting_morning"
  | "greeting_day"
  | "greeting_evening"
  | "greeting_night"
  | "settings"
  | "dashboard"
  | "medications"
  | "crisisButton"
  | "needHelpNow"
  | "checkIn"
  | "tools"
  | "you"
  | "done"
  | "save"
  | "cancel"
  | "next"
  | "back"
  | "skip"
  | "start"
  | "language"
  | "privacyNotice"
  | "crisisDisclaimer"
  | "notTherapy"
  // Export
  | "exportTitle"
  | "exportCsv"
  | "exportPdf"
  | "exportDisclaimer"
  // Common
  | "close"
  | "loading"
  | "seeAll"
  | "enable"
  | "on"
  | "off"
  // Crisis overlay (safety surface)
  | "crisisHeading"
  | "crisisSub"
  | "crisisTryFirst"
  | "crisisGroundingLabel"
  | "crisisGroundingSub"
  | "crisisBreathingLabel"
  | "crisisBreathingSub"
  | "crisisSpeakNow"
  | "crisisHelplineNote"
  | "crisisCopingPlan"
  | "crisisWarnSigns"
  | "crisisWarnSignsBlank"
  | "crisisInternalCoping"
  | "crisisInternalCopingBlank"
  | "crisisSocial"
  | "crisisSocialBlank"
  | "crisisTrusted"
  | "crisisTrustedBlank"
  | "crisisProf"
  | "crisisSafe"
  | "crisisSafeBlank"
  | "crisisSteadier"
  // Settings
  | "settingsIntro"
  | "shareTrustedTitle"
  | "shareTrustedSub"
  | "privacyPolicy"
  | "privacyPolicySub"
  | "perfTitle"
  | "perfSub"
  // Tools hub
  | "tool_group_moment"
  | "tool_plan_label"
  | "tool_plan_sub"
  | "tool_winddown_label"
  | "tool_winddown_sub"
  | "tool_reach_out_label"
  | "tool_reach_out_sub"
  | "tool_crisis_rehearsal_label"
  | "tool_crisis_rehearsal_sub"
  | "tool_relapse_label"
  | "tool_relapse_sub"
  | "tool_episode_label"
  | "tool_episode_sub"
  | "tool_group_log"
  | "tool_ema_label"
  | "tool_ema_sub"
  | "tool_diary_label"
  | "tool_diary_sub"
  | "tool_assessment_label"
  | "tool_assessment_sub"
  | "tool_medication_label"
  | "tool_medication_sub"
  | "tool_social_rhythm_label"
  | "tool_social_rhythm_sub"
  | "tool_group_skills"
  | "tool_problem_solving_label"
  | "tool_problem_solving_sub"
  | "tool_values_work_label"
  | "tool_values_work_sub"
  | "tool_exposure_label"
  | "tool_exposure_sub"
  | "tool_group_patterns"
  | "tool_behaviour_label"
  | "tool_behaviour_sub"
  // You hub
  | "you_group_manage"
  | "you_about_nila_label"
  | "you_about_nila_sub"
  | "you_dashboard_label"
  | "you_dashboard_sub"
  | "you_your_data_label"
  | "you_your_data_sub"
  | "you_nila_memory_label"
  | "you_nila_memory_sub"
  | "you_settings_label"
  | "you_settings_sub"
  | "you_caregiver_label"
  | "you_caregiver_sub"
  | "you_group_resources"
  | "you_thought_record_label"
  | "you_thought_record_sub"
  | "you_learn_label"
  | "you_learn_sub"
  | "you_insights_label"
  | "you_insights_sub"
  // Do-Not-Disturb (quiet mode) — P6.7
  | "dnd_3_hours"
  | "dnd_tonight"
  | "dnd_24_hours"
  | "dnd_3_days"
  | "dnd_until_off"
  | "dnd_title"
  | "dnd_on_aria"
  | "dnd_off_aria"
  | "dnd_on_note"
  | "dnd_off_note"
  | "dnd_turn_off"
  | "new_conversation"
  // Dashboard
  | "dash_privacy"
  | "weekly_report"
  | "this_week"
  | "your_month"
  | "your_usage"
  | "your_activity"
  | "tracking"
  | "what_nila_noticed"
  | "signals_patterns"
  | "trends_measures"
  | "episodes_sessions"
  | "expand_all"
  | "collapse_all"
  | "tracking_summary"
  | "signals_summary"
  | "trends_summary"
  | "episodes_summary"
  | "hero_title"
  | "hero_anxious"
  | "hero_low"
  | "hero_elevated"
  | "hero_calm"
  | "hero_checkin"
  | "hero_breathe"
  | "hero_gentle"
  | "days_logged"
  | "nila_chats_7d"
  | "usage_checkins"
  | "usage_programs"
  | "usage_assessments"
  | "usage_features"
  // Dashboard band narratives (built from counts/words — localized, see buildBandNarratives)
  | "narr_tracking_month"
  | "narr_tracking_notices_one"
  | "narr_tracking_notices_many"
  | "narr_tracking_none"
  | "narr_signals_one"
  | "narr_signals_many"
  | "narr_signals_none"
  | "narr_episodes_e_one"
  | "narr_episodes_e_many"
  | "narr_episodes_none_e"
  | "narr_episodes_s_one"
  | "narr_episodes_s_many"
  // Dashboard activity (streak) + mood summaries — localized, see DashboardScreen
  | "narr_streak_first"
  | "narr_streak_welcome"
  | "narr_streak_milestone"
  | "narr_streak_active_multi"
  | "narr_streak_active_one"
  | "narr_streak_safe"
  | "narr_streak_small"
  | "narr_mood_none"
  | "narr_mood_base_only"
  | "narr_mood_same"
  | "narr_mood_down"
  | "narr_mood_up"
  | "see_all_sessions"
  | "see_less"
  | "no_signals_yet"
  | "no_sessions_yet"
  // Settings sub-section titles (Redesign §2 — Settings hub)
  | "sec_appearance"
  | "sec_voice"
  | "sec_reminders"
  | "sec_ema"
  | "sec_notif_types"
  | "sec_inflection"
  | "sec_passive_sensing"
  | "sec_passive_sensing_sub"
  | "pi_enable_label"
  | "pi_enable_sub"
  | "pi_extractions"
  | "pi_no_sources"
  | "pi_last_extraction"
  | "pi_never"
  | "pi_delete_data"
  | "pi_delete_sub"
  | "pi_delete_confirm"
  | "sec_health_connect"
  | "sec_on_device"
  | "sec_identity"
  | "sec_privacy_lock"
  | "sec_feedback"
  | "sec_legal"
  | "sec_legalSub"
  | "sec_cloud_api"
  | "sec_cloud_apiSub"
  | "sec_region"
  | "sec_pilot"
  // Cloud API — Groq fast-path (2026-07-16)
  | "cloud_api_provider_label"
  | "cloud_api_groq_recommended"
  | "cloud_api_custom_label"
  | "cloud_api_status_active"
  | "cloud_api_status_disabled"
  | "cloud_api_get_key_label"
  | "cloud_api_get_key_label_custom"
  | "cloud_api_groq_key_label"
  | "cloud_api_groq_key_placeholder"
  | "cloud_api_groq_key_hint_ok"
  | "cloud_api_groq_key_hint_empty"
  | "cloud_api_openai_key_hint"
  | "cloud_api_advanced_label"
  | "cloud_api_endpoint_label"
  | "cloud_api_endpoint_hint_groq"
  | "cloud_api_endpoint_hint_custom"
  | "cloud_api_model_label"
  | "cloud_api_model_hint_groq"
  | "cloud_api_model_hint_custom"
  | "cloud_api_model_custom_option"
  | "cloud_api_privacy_groq"
  | "cloud_api_privacy_generic"
  // Phase 17 — Longitudinal wellbeing
  | "you_wellbeing_label"
  | "you_wellbeing_sub"
  | "wellbeing_screen_intro"
  | "wellbeing_take"
  | "wellbeing_due_title"
  | "wellbeing_due_sub"
  | "wellbeing_baseline_title"
  | "wellbeing_baseline_sub"
  | "wellbeing_next_due_prefix"
  | "wellbeing_days"
  | "wellbeing_due_now"
  | "wellbeing_none"
  | "wellbeing_improving"
  | "wellbeing_deteriorating"
  | "wellbeing_steady"
  // Phase 18 — Episode-phase markers
  | "you_episode_marker_label"
  | "you_episode_marker_sub"
  | "em_intro"
  | "em_add_marker"
  | "em_phase"
  | "em_from"
  | "em_to"
  | "em_note_optional"
  | "em_save"
  | "em_current"
  | "em_none"
  | "em_past"
  | "em_phase_elevated"
  | "em_phase_depressed"
  | "em_phase_mixed"
  | "em_phase_stable"
  // Phase 19 — Family/Caregiver mode
  | "you_caregiver_settings_label"
  | "you_caregiver_settings_sub"
  | "cg_add_contact"
  | "cg_name"
  | "cg_phone_or_email"
  | "cg_relationship"
  | "cg_remove"
  | "cg_share_categories"
  | "cg_category_mood"
  | "cg_category_phase"
  | "cg_category_sleep"
  | "cg_category_medication"
  | "cg_category_wellbeing"
  | "cg_category_checkins"
  | "cg_auto_alert"
  | "cg_auto_alert_desc"
  | "cg_threshold_days"
  | "cg_min_intensity"
  | "cg_preview"
  | "cg_no_contacts"
  | "cg_consent_title"
  | "cg_consent_body"
  | "cg_save"
  | "cg_alert_nudge"
  | "cg_alert_reason"
  // Phase 20.9 — clinician report section labels
  | "cr_coverTitle"
  | "cr_execSummary"
  | "cr_checkins"
  | "cr_sleep"
  | "cr_screenings"
  | "cr_medications"
  | "cr_episodes"
  | "cr_phaseMarkers"
  | "cr_diaryCard"
  | "cr_safetyPlan"
  | "cr_relapsePlan"
  | "cr_connections"
  | "cr_supports"
  | "cr_voiceSignal"
  | "cr_whatHelped"
  | "cr_whatDidntHelp"
  | "cr_doseChanges"
  | "cr_sideEffects"
  | "cr_thoughtRecords"
  | "cr_wellbeing"
  | "cr_correlation"
  | "cr_triggerContext"
  | "cr_eventTimeline"
  | "cr_engagement"
  | "cr_disclaimer"
  | "cr_redactTitle"
  | "cr_redactMinimal"
  | "cr_redactFull"
  | "cr_visitNote"
  | "cr_visitNotePrompt1"
  | "cr_visitNotePrompt2"
  | "cr_visitNotePrompt3"
  | "cr_consentTitle"
  | "cr_consentBody"
  // Proactive Agent (Phase 23)
  | "pi_card_sleep_pattern"
  | "pi_card_activity_shift"
  | "pi_card_circadian_insight"
  | "pi_card_typing_pattern"
  | "pi_card_resilience"
  | "pi_card_phase_shift"
  | "pi_card_routine_disruption"
  | "pi_card_connection_dip"
  | "pi_card_protective"
  | "pi_card_body"
  | "pi_nudge_sleep"
  | "pi_nudge_activity"
  | "pi_nudge_circadian"
  | "pi_nudge_typing"
  | "pi_nudge_phase"
  | "pi_nudge_routine"
  | "pi_nudge_connection"
  | "pi_action_checkin"
  | "pi_action_winddown"
  | "pi_action_diary"
  | "pi_action_assessment"
  | "pi_action_protocol"
  | "pi_dismiss";

export const DICT: Record<SupportedLang, Partial<Record<I18nKey, string>>> = {
  en: {
    appName: "NilaMind",
    greeting_morning: "Good morning",
    greeting_day: "Good afternoon",
    greeting_evening: "Good evening",
    greeting_night: "Good night",
    settings: "Settings",
    dashboard: "Your Dashboard",
    medications: "Medications",
    crisisButton: "Crisis support",
    needHelpNow: "Need help now",
    checkIn: "Check in",
    tools: "Tools",
    you: "You",
    done: "Done",
    save: "Save",
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    skip: "Skip",
    start: "Start",
    language: "Language",
    privacyNotice: "Nothing you share leaves this device.",
    crisisDisclaimer: "If you're in danger, crisis help is in the Learn and Reach Out screens.",
    notTherapy: "NilaMind is not therapy or a crisis service.",
    exportTitle: "Export Report",
    exportCsv: "Download CSV",
    exportPdf: "Download PDF",
    exportDisclaimer: "Generated by NilaMind \u2014 not a clinical or diagnostic tool.",
    close: "Close",
    loading: "Loading\u2026",
    seeAll: "See all",
    enable: "Enable",
    on: "On",
    off: "Off",
    crisisHeading: "You reached for this. Let's find something that helps.",
    crisisSub: "That is a strong thing to do. Ground yourself first, or reach a trained listener.",
    crisisTryFirst: "Try these first",
    crisisGroundingLabel: "5-4-3-2-1 Grounding",
    crisisGroundingSub: "Notice what's around you to settle into the present moment",
    crisisBreathingLabel: "Box Breathing (4-4-4-4)",
    crisisBreathingSub: "Paced breathing to calm your nervous system",
    crisisSpeakNow: "Or speak with someone now",
    crisisHelplineNote: "Free, confidential helplines for your region — change in Settings.",
    crisisCopingPlan: "Your coping plan",
    crisisWarnSigns: "1. Warning signs I notice:",
    crisisWarnSignsBlank: "This part is still blank — and that's okay. You're here now, and that counts.",
    crisisInternalCoping: "2. Things I can do on my own to cope:",
    crisisInternalCopingBlank: "Nothing written here yet — that's okay.",
    crisisSocial: "3. People and places that distract me:",
    crisisSocialBlank: "Nothing here yet — that's okay.",
    crisisTrusted: "4. People I can reach out to for help:",
    crisisTrustedBlank: "No names here yet — reaching even one person right now can help.",
    crisisProf: "5. Professionals and crisis lines:",
    crisisSafe: "6. Making my space safer:",
    crisisSafeBlank: "Nothing here yet — that's okay.",
    crisisSteadier: "I feel steadier now",
    settingsIntro: "Application preferences — including a calm \"Soften visuals\" mode if bright or busy screens ever feel like too much.",
    shareTrustedTitle: "Share with a trusted person",
    shareTrustedSub: "Build a wellness snapshot for family support",
    privacyPolicy: "Privacy Policy",
    privacyPolicySub: "How your data stays private — nothing leaves your device",
    perfTitle: "Performance & Diagnostics",
    perfSub: "Web vitals, LLM cache, crash log — on this device only",
    tool_group_moment: "In the moment",
    tool_plan_label: "Grounding & breathing",
    tool_plan_sub: "Calm your body in a hard minute",
    tool_winddown_label: "Wind down for sleep",
    tool_winddown_sub: "A calm bedtime routine — park the day & settle",
    tool_reach_out_label: "Reach out to someone",
    tool_reach_out_sub: "A gentle, ready-to-send message to a person you trust",
    tool_crisis_rehearsal_label: "Crisis rehearsal",
    tool_crisis_rehearsal_sub: "Practice your plan before you need it",
    tool_relapse_label: "Relapse prevention plan",
    tool_relapse_sub: "Plan ahead for each phase — green, orange, red",
    tool_episode_label: "I'm in an episode",
    tool_episode_sub: "Guided, step-by-step support right now",
    tool_group_log: "Log & track",
    tool_ema_label: "Quick check-in",
    tool_ema_sub: "A 10-second mood check, right now",
    tool_diary_label: "Journal",
    tool_diary_sub: "Free-write and look back on your entries",
    tool_assessment_label: "Screenings",
    tool_assessment_sub: "PHQ-9, GAD-7 & more over time",
    tool_medication_label: "Medications",
    tool_medication_sub: "Track doses and adherence",
    tool_social_rhythm_label: "Social rhythm",
    tool_social_rhythm_sub: "Keep daily routines steady — timing vs. mood",
    tool_group_skills: "Skills & practice",
    tool_problem_solving_label: "Problem-solving",
    tool_problem_solving_sub: "Break a problem into steps and try a solution",
    tool_values_work_label: "Values work",
    tool_values_work_sub: "Clarify what matters and notice where you align",
    tool_exposure_label: "Exposure hierarchy",
    tool_exposure_sub: "Build a fear ladder — work from the bottom up",
    tool_group_patterns: "Patterns",
    tool_behaviour_label: "Phone patterns",
    tool_behaviour_sub: "Screen time & sleep vs. mood — on-device",
    you_group_manage: "Manage",
    you_about_nila_label: "About Nila",
    you_about_nila_sub: "How Nila works, privacy, capabilities, and boundaries",
    you_dashboard_label: "Your dashboard",
    you_dashboard_sub: "Streak, mood & score trends, recent conversations",
    you_your_data_label: "Your data",
    you_your_data_sub: "Export everything, or delete it — your call",
    you_nila_memory_label: "What Nila remembers",
    you_nila_memory_sub: "See, edit, or delete what she knows",
    you_settings_label: "Settings",
    you_settings_sub: "Voice, reminders, recovery phrase",
    you_caregiver_label: "Share with a trusted person",
    you_caregiver_sub: "Build a snapshot for family support",
    you_group_resources: "Resources",
    you_thought_record_label: "Thought record",
    you_thought_record_sub: "CBT reframing workbook",
    you_learn_label: "Learn",
    you_learn_sub: "Skills, explainers & research — one library",
    you_insights_label: "Your patterns",
    you_insights_sub: "Sleep, screen time, movement & mood",
    dnd_3_hours: "3 hours",
    dnd_tonight: "Tonight",
    dnd_24_hours: "24 hours",
    dnd_3_days: "3 days",
    dnd_until_off: "Until I turn it off",
    dnd_title: "Quiet mode",
    dnd_on_aria: "Quiet mode on — tap to change",
    dnd_off_aria: "Turn on quiet mode",
    dnd_on_note: "Quiet mode is on — non-critical nudges are paused.",
    dnd_off_note: "Pause non-critical nudges for a while.",
    dnd_turn_off: "Turn quiet mode off",
    new_conversation: "New conversation",
    dash_privacy: "Your local sections stay only on your device. A picture of how you're doing over time.",
    weekly_report: "Weekly report",
    this_week: "This week",
    your_month: "Your month",
    your_usage: "Your usage",
    your_activity: "Your activity",
    tracking: "Tracking",
    what_nila_noticed: "What Nila noticed",
    signals_patterns: "Signals & patterns",
    trends_measures: "Trends & measures",
    episodes_sessions: "Episodes & sessions",
    expand_all: "Expand all",
    collapse_all: "Collapse all",
    tracking_summary: "Wellbeing trend, patterns Nila noticed, and your programs",
    signals_summary: "Sleep, routine, typing and voice signals",
    trends_summary: "Your mood trend over time",
    episodes_summary: "Episode history, recent sessions and deep evaluation",
    hero_title: "Right now",
    hero_anxious: "Your mind feels busy. A few slow breaths can help.",
    hero_low: "A small, kind step is enough right now.",
    hero_elevated: "Let's slow things down together.",
    hero_calm: "You're doing okay. Keep the rhythm going.",
    hero_checkin: "Check in",
    hero_breathe: "3-min breathing",
    hero_gentle: "Gentle check-in",
    days_logged: "days logged",
    nila_chats_7d: "Nila chats (7d)",
    usage_checkins: "check-ins",
    usage_programs: "programs done",
    usage_assessments: "assessments",
    usage_features: "features used",
    narr_tracking_month: "This month has felt {word}. ",
    narr_tracking_notices_one: "Nila noticed 1 pattern worth a closer look inside.",
    narr_tracking_notices_many: "Nila noticed {notices} patterns worth a closer look inside.",
    narr_tracking_none: "No new patterns flagged this period — steady is good.",
    narr_signals_one: "1 background signal is quietly tracked below.",
    narr_signals_many: "{count} background signals are quietly tracked below.",
    narr_signals_none: "No background signals to report right now.",
    narr_episodes_e_one: "1 episode on record",
    narr_episodes_e_many: "{episodes} episodes on record",
    narr_episodes_none_e: "No episodes recorded",
    narr_episodes_s_one: "with 1 recent Nila session.",
    narr_episodes_s_many: "with {sessions} recent Nila sessions.",
    narr_streak_first: "Whenever you're ready — your first check-in starts here.",
    narr_streak_welcome: "Welcome back — no pressure. We pick up right where you are.",
    narr_streak_milestone: "{milestone} days of showing up for yourself. That matters.",
    narr_streak_active_multi: "{current} days in a row. Gently done.",
    narr_streak_active_one: "Checked in today. That counts.",
    narr_streak_safe: "Your streak's safe today — a check-in any time keeps it going, no rush.",
    narr_streak_small: "A small check-in whenever you can. That's enough.",
    narr_mood_none: "No check-ins yet this week — even a one-tap mood helps your trends grow.",
    narr_mood_base_only: "This week your distress averaged {avg}/10. Keep logging to compare week to week.",
    narr_mood_same: "This week your distress averaged {avg}/10 — about the same as last week.",
    narr_mood_down: "This week your distress averaged {avg}/10 — down {delta} from last week. That's a real improvement.",
    narr_mood_up: "This week your distress averaged {avg}/10 — up {delta} from last week. Be gentle with yourself; harder stretches happen.",
    see_all_sessions: "See all {n} sessions",
    see_less: "Show less",
    no_signals_yet: "Nothing to flag right now — that's a good thing. Nila keeps a quiet eye on patterns and will gently let you know if something shifts.",
    no_sessions_yet: "No recent Nila sessions yet. Whenever you talk with Nila, a quiet snapshot stays here — on your device, never shared.",
    sec_appearance: "🎨 Appearance",
    sec_voice: "🔊 Soothing Voice",
    sec_reminders: "🔔 Gentle Reminders",
    sec_ema: "⚡ Quick Check-ins",
    sec_notif_types: "🔔 Notification types",
    sec_inflection: "💬 Gentle Nudges from Nila",
    sec_passive_sensing: "📊 Passive Sensing",
    sec_passive_sensing_sub: "Opt in to let Nila notice patterns in your phone usage, sleep, and typing — and surface gentle insights. Runs locally, never leaves your device. Off by default.",
    pi_enable_label: "Enable proactive insights",
    pi_enable_sub: "When on, Nila may show cards on your Dashboard and a nudge on Today when she notices a pattern worth your attention. Always optional, always dismissible.",
    pi_extractions: "extractions",
    pi_no_sources: "no active sources",
    pi_last_extraction: "Last extraction",
    pi_never: "never",
    pi_delete_data: "Delete passive sensing data",
    pi_delete_sub: "Removes all extracted features and status. Cannot be undone.",
    pi_delete_confirm: "Delete all passive sensing data? This cannot be undone.",
    sec_health_connect: "🌙 Sleep from Health Connect",
    sec_on_device: "Nila Runs On Your Device",
    sec_identity: "🔑 Account & Recovery",
    sec_privacy_lock: "🔒 Privacy Lock",
    sec_feedback: "💬 Feedback & about",
    sec_legal: "Legal — Terms & licenses",
    sec_legalSub: "Privacy Policy, Terms of Service, and open-source licenses",
    sec_cloud_api: "Optional Cloud API",
    sec_cloud_apiSub: "Connect your own API key for a cloud model (messages leave your device)",
    sec_region: "Crisis lines & region",
    sec_pilot: "Research pilot",
    cloud_api_provider_label: "Provider",
    cloud_api_groq_recommended: "Groq (recommended)",
    cloud_api_custom_label: "Custom (OpenAI-compatible)",
    cloud_api_status_active: "Cloud model active",
    cloud_api_status_disabled: "Disabled — on-device only (recommended).",
    cloud_api_get_key_label: "Get your free Groq API key",
    cloud_api_get_key_label_custom: "Get your free Google AI Studio (Gemini) API key",
    cloud_api_groq_key_label: "Groq API Key",
    cloud_api_groq_key_placeholder: "gsk_…",
    cloud_api_groq_key_hint_empty: "Your key stays on this device. Groq keys start with gsk_.",
    cloud_api_groq_key_hint_ok: "✓ Looks like a Groq key.",
    cloud_api_openai_key_hint: "Your key stays on this device.",
    cloud_api_advanced_label: "Advanced",
    cloud_api_endpoint_label: "Endpoint",
    cloud_api_endpoint_hint_groq:
      "Defaults to Groq's OpenAI-compatible surface. Override only if you proxy through a custom endpoint.",
    cloud_api_endpoint_hint_custom:
      "Any OpenAI-compatible endpoint (OpenAI, Together, Fireworks, a self-hosted proxy). By default NilaMind recommends Groq.",
    cloud_api_model_label: "Model",
    cloud_api_model_hint_groq:
      "Any Groq model id works. Defaults to llama-3.1-8b-instant (fast & capable).",
    cloud_api_model_hint_custom: "Defaults to gpt-3.5-turbo on OpenAI.",
    cloud_api_model_custom_option: "Custom model id…",
    cloud_api_privacy_groq:
      "Your chat and voice-call messages (and Nila's replies) leave your device and go directly to Groq. Groq's privacy notice states they do not train on your data and do not retain submitted content after the response.",
    cloud_api_privacy_generic:
      "When cloud API is enabled, your chat and voice-call messages (and Nila's replies) leave your device and go directly to the endpoint you configure — NilaMind cannot see or store them. Everything else stays on your phone: background features (daily reflection, memory, coach insights) never use the cloud, and the on-device safety gates (crisis detection, output screening) always run locally. Takes effect from your next message — no restart needed.",
    you_wellbeing_label: "Wellbeing over time",
    you_wellbeing_sub: "Your long-view trend",
    wellbeing_screen_intro: "A 2-week check of how you've been. The long view matters more than any single day.",
    wellbeing_take: "Take the 2-week check",
    wellbeing_due_title: "Your 2-week wellbeing check is due",
    wellbeing_due_sub: "It takes 2 minutes and helps you see the long view, not just daily swings.",
    wellbeing_baseline_title: "Set your wellbeing baseline",
    wellbeing_baseline_sub: "A 2-minute check now gives you a starting point — so later checks can show how things are trending.",
    wellbeing_next_due_prefix: "Next check in",
    wellbeing_days: "days",
    wellbeing_due_now: "Due now",
    wellbeing_none: "No checks yet — take your first one.",
    wellbeing_improving: "Improving",
    wellbeing_deteriorating: "Drifting down",
    wellbeing_steady: "Steady",
    you_episode_marker_label: "Episode markers",
    you_episode_marker_sub: "Track mood phases over time",
    em_intro: "Mark stretches of time by how your mood ran — elevated, depressed, mixed, or steady. A pattern over time, not a diagnosis.",
    em_add_marker: "Add a marker",
    em_phase: "Phase",
    em_from: "From",
    em_to: "To",
    em_note_optional: "Note (optional)",
    em_save: "Save marker",
    em_current: "Current period",
    em_none: "No markers yet — add your first one.",
    em_past: "Past markers",
    em_phase_elevated: "Elevated",
    em_phase_depressed: "Depressed",
    em_phase_mixed: "Mixed",
    em_phase_stable: "Steady",
    // P19 caregiver
    you_caregiver_settings_label: "Caregiver settings",
    you_caregiver_settings_sub: "Manage trusted contacts & sharing",
    cg_add_contact: "Add trusted person",
    cg_name: "Name",
    cg_phone_or_email: "Phone or email",
    cg_relationship: "Relationship (optional)",
    cg_remove: "Remove",
    cg_share_categories: "What to share",
    cg_category_mood: "Mood trend",
    cg_category_phase: "Phase markers",
    cg_category_sleep: "Sleep pattern",
    cg_category_medication: "Medication adherence",
    cg_category_wellbeing: "Wellbeing trajectory",
    cg_category_checkins: "Check-in frequency",
    cg_auto_alert: "Auto-alert threshold",
    cg_auto_alert_desc: "Nudge me to share if I've been struggling",
    cg_threshold_days: "Consecutive days",
    cg_min_intensity: "Min distress level (1–10)",
    cg_preview: "Preview snapshot",
    cg_no_contacts: "No trusted contacts added yet",
    cg_consent_title: "Before you share",
    cg_consent_body: "This will share a wellness snapshot with your trusted person. They won't see your private conversations with Nila — only the categories you selected below.",
    cg_save: "Save preferences",
    cg_alert_nudge: "Share a wellness update with",
    cg_alert_reason: "You've had a tough stretch — your caregiver might want to know",
    // Phase 20.9 — clinician report section labels (English)
    cr_coverTitle: "NilaMind Clinician Summary",
    cr_execSummary: "Executive Summary",
    cr_checkins: "Check-ins",
    cr_sleep: "Sleep & Circadian Rhythm",
    cr_screenings: "Screening Trajectories",
    cr_medications: "Medication Adherence",
    cr_episodes: "Episode Log",
    cr_phaseMarkers: "Bipolar Phase Markers (self-logged)",
    cr_diaryCard: "DBT Diary Card Summary",
    cr_safetyPlan: "Safety Plan (Stanley-Brown)",
    cr_relapsePlan: "Relapse Prevention Plan",
    cr_connections: "Social Connection",
    cr_supports: "Supports Recap",
    cr_voiceSignal: "Voice Signal",
    cr_whatHelped: "What has helped (recent insights)",
    cr_whatDidntHelp: "What Did Not Help (self-reported)",
    cr_doseChanges: "Medication Dose Changes",
    cr_sideEffects: "Side-Effect Duration",
    cr_thoughtRecords: "Thought Record Summary",
    cr_wellbeing: "Wellbeing Trajectory (WHO-5)",
    cr_correlation: "Sleep–Mood Correlation",
    cr_triggerContext: "Trigger & Context Patterns",
    cr_eventTimeline: "Event Timeline",
    cr_engagement: "Engagement",
    cr_disclaimer: "Generated by NilaMind — not a clinical or diagnostic tool. For informational use only.",
    cr_redactTitle: "Choose what to include",
    cr_redactMinimal: "Minimal (screenings + safety plan only)",
    cr_redactFull: "Full (everything)",
    cr_visitNote: "Notes for your next visit",
    cr_visitNotePrompt1: "Top 3 things I want remembered",
    cr_visitNotePrompt2: "Questions I want to ask",
    cr_visitNotePrompt3: "What's changed since last visit",
    cr_consentTitle: "Confirm export",
    cr_consentBody: "I confirm this is my own self-report for my own visit. The data on this device belongs to me. NilaMind generated this file on-device and cannot see it.",
    // Proactive Agent (Phase 23)
    pi_card_sleep_pattern: "Sleep pattern shift",
    pi_card_activity_shift: "Activity pattern shift",
    pi_card_circadian_insight: "Circadian rhythm insight",
    pi_card_typing_pattern: "Typing pattern change",
    pi_card_resilience: "Protective patterns noticed",
    pi_card_phase_shift: "Possible phase shift",
    pi_card_routine_disruption: "Routine disruption",
    pi_card_connection_dip: "Social connection dip",
    pi_card_protective: "Resilience signals",
    pi_card_body: "Nila noticed a pattern in your rhythms this week.",
    pi_nudge_sleep: "Your sleep pattern has shifted — worth a gentle check-in.",
    pi_nudge_activity: "Activity levels have changed — how are you feeling?",
    pi_nudge_circadian: "Your daily rhythm has been more variable lately.",
    pi_nudge_typing: "Your typing patterns have changed — want to check in?",
    pi_nudge_phase: "Possible mood shift detected — a quick check-in might help.",
    pi_nudge_routine: "Your routine has been disrupted — want to steady it?",
    pi_nudge_connection: "You've been connecting less — no pressure, just noticing.",
    pi_action_checkin: "Check in",
    pi_action_winddown: "Wind down",
    pi_action_diary: "Log your day",
    pi_action_assessment: "Take a screen",
    pi_action_protocol: "Try a protocol",
    pi_dismiss: "Not now",
  },
  hi: {
    appName: "NilaMind",
    greeting_morning: "सुप्रभात",
    greeting_day: "नमस्कार",
    greeting_evening: "शुभ संध्या",
    greeting_night: "शुभ रात्रि",
    settings: "सेटिंग्स",
    dashboard: "आपका डैशबोर्ड",
    medications: "दवाइयाँ",
    crisisButton: "संकट सहायता",
    needHelpNow: "अभी मदद चाहिए",
    checkIn: "चेक-इन करें",
    tools: "टूल्स",
    you: "आप",
    done: "पूरा हुआ",
    save: "सहेजें",
    cancel: "रद्द करें",
    next: "अगला",
    back: "पीछे",
    skip: "छोड़ें",
    start: "शुरू करें",
    language: "भाषा",
    privacyNotice: "आप जो कुछ भी साझा करते हैं, वह इसी डिवाइस पर रहता है।",
    crisisDisclaimer: "यदि आप खतरे में हैं, तो संकट सहायता लर्न और रीच आउट स्क्रीन पर उपलब्ध है।",
    notTherapy: "NilaMind थेरेपी या संकट सेवा नहीं है।",
    exportTitle: "रिपोर्ट निर्यात करें",
    exportCsv: "CSV डाउनलोड करें",
    exportPdf: "PDF डाउनलोड करें",
    exportDisclaimer: "NilaMind द्वारा जनरेटेड \u2014 एक क्लिनिकल या डायग्नॉस्टिक टूल नहीं है।",
    close: "बंद करें",
    loading: "लोड हो रहा है\u2026",
    seeAll: "सभी देखें",
    enable: "सक्षम करें",
    on: "चालू",
    off: "बंद",
    crisisHeading: "आपने इसे चुना। आइए कुछ ऐसा खोजें जो मदद करे।",
    crisisSub: "यह करना एक साहसिक कदम है। पहले खुद को स्थिर करें, या किसी प्रशिक्षित श्रोता से बात करें।",
    crisisTryFirst: "पहले ये आज़माएं",
    crisisGroundingLabel: "5-4-3-2-1 ग्राउंडिंग",
    crisisGroundingSub: "वर्तमान क्षण में आने के लिए अपने आस-पास का ध्यान रखें",
    crisisBreathingLabel: "बॉक्स ब्रीदिंग (4-4-4-4)",
    crisisBreathingSub: "अपनी तंत्रिका प्रणाली को शांत करने के लिए लयबद्ध श्वास",
    crisisSpeakNow: "या अभी किसी से बात करें",
    crisisHelplineNote: "आपके क्षेत्र के लिए मुफ़्त, गोपनीय हेल्पलाइन — सेटिंग्स में बदलें।",
    crisisCopingPlan: "आपकी सामना योजना",
    crisisWarnSigns: "1. चेतावनी के संकेत जो मैं देखता/देखती हूँ:",
    crisisWarnSignsBlank: "यह हिस्सा अभी खाली है — और यह ठीक है। आप अभी यहाँ हैं, और वह मायने रखता है।",
    crisisInternalCoping: "2. अकेले सामना करने के लिए मैं जो कर सकता/सकती हूँ:",
    crisisInternalCopingBlank: "यहाँ अभी कुछ नहीं लिखा — वह ठीक है।",
    crisisSocial: "3. लोग और जगहें जो मुझे विचलित करते हैं:",
    crisisSocialBlank: "यहाँ अभी कुछ नहीं — वह ठीक है।",
    crisisTrusted: "4. मदद के लिए जिन लोगों से मैं संपर्क कर सकता/सकती हूँ:",
    crisisTrustedBlank: "अभी कोई नाम नहीं — अभी एक व्यक्ति से भी संपर्क करने से मदद मिल सकती है।",
    crisisProf: "5. पेशेवर और संकट हेल्पलाइन:",
    crisisSafe: "6. अपना स्थान सुरक्षित बनाना:",
    crisisSafeBlank: "यहाँ अभी कुछ नहीं — वह ठीक है।",
    crisisSteadier: "अब मैं थोड़ा स्थिर महसूस कर रहा/रही हूँ",
    settingsIntro: "ऐप प्राथमिकताएँ — जिसमें एक शांत \"दृश्य धीमे करें\" मोड भी शामिल है यदि चमकीली या व्यस्त स्क्रीन कभी बहुत अधिक लगे।",
    shareTrustedTitle: "किसी भरोसेमंद व्यक्ति के साथ साझा करें",
    shareTrustedSub: "परिवार के समर्थन के लिए एक वेलनेस स्नैपशॉट बनाएं",
    privacyPolicy: "गोपनीयता नीति",
    privacyPolicySub: "आपका डेटा निजी कैसे रहता है — कुछ भी डिवाइस से बाहर नहीं जाता",
    perfTitle: "प्रदर्शन और निदान",
    perfSub: "वेब वाइटल्स, LLM कैश, क्रैश लॉग — केवल इस डिवाइस पर",
    tool_group_moment: "इस क्षण में",
    tool_plan_label: "ग्राउंडिंग और श्वास",
    tool_plan_sub: "कठिन मिनट में अपने शरीर को शांत करें",
    tool_winddown_label: "नींद के लिए शांत हों",
    tool_winddown_sub: "एक शांत सोने की दिनचर्या — दिन समेटें और टिकें",
    tool_reach_out_label: "किसी से संपर्क करें",
    tool_reach_out_sub: "अपने भरोसेमंद व्यक्ति को भेजने के लिए एक कोमल, तैयार संदेश",
    tool_crisis_rehearsal_label: "संकट रिहर्सल",
    tool_crisis_rehearsal_sub: "ज़रूरत पड़ने से पहले अपनी योजना का अभ्यास करें",
    tool_relapse_label: "रिलैप्स रोकथाम योजना",
    tool_relapse_sub: "हर चरण के लिए पहले से योजना बनाएं — हरा, नारंगी, लाल",
    tool_episode_label: "मैं किसी एपिसोड में हूँ",
    tool_episode_sub: "अभी कदम-दर-कदम मार्गदर्शित समर्थन",
    tool_group_log: "लॉग और ट्रैक करें",
    tool_ema_label: "त्वरित चेक-इन",
    tool_ema_sub: "एक 10-सेकंड मूड चेक, अभी",
    tool_diary_label: "डायरी",
    tool_diary_sub: "स्वतंत्र रूप से लिखें और अपनी प्रविष्टियाँ फिर से देखें",
    tool_assessment_label: "स्क्रीनिंग",
    tool_assessment_sub: "PHQ-9, GAD-7 और अधिक समय के साथ",
    tool_medication_label: "दवाइयाँ",
    tool_medication_sub: "खुराक और पालन ट्रैक करें",
    tool_social_rhythm_label: "सामाजिक लय",
    tool_social_rhythm_sub: "दैनिक दिनचर्या स्थिर रखें — समय बनाम मूड",
    tool_group_skills: "कौशल और अभ्यास",
    tool_problem_solving_label: "समस्या-समाधान",
    tool_problem_solving_sub: "समस्या को चरणों में बांटें और समाधान आज़माएं",
    tool_values_work_label: "मूल्य कार्य",
    tool_values_work_sub: "स्पष्ट करें कि क्या मायने रखता है और संरेखण देखें",
    tool_exposure_label: "एक्सपोज़र पदानुक्रम",
    tool_exposure_sub: "एक डर सीढ़ी बनाएं — नीचे से ऊपर काम करें",
    tool_group_patterns: "पैटर्न",
    tool_behaviour_label: "फ़ोन पैटर्न",
    tool_behaviour_sub: "स्क्रीन टाइम और नींद बनाम मूड — डिवाइस पर",
    you_group_manage: "प्रबंधित करें",
    you_about_nila_label: "नीला के बारे में",
    you_about_nila_sub: "नीला कैसे काम करती है, गोपनीयता, क्षमताएँ और सीमाएँ",
    you_dashboard_label: "आपका डैशबोर्ड",
    you_dashboard_sub: "स्ट्रीक, मूड और स्कोर प्रवृत्तियाँ, हाल की नीला",
    you_your_data_label: "आपका डेटा",
    you_your_data_sub: "सब कुछ निर्यात करें, या हटाएं — आपकी पसंद",
    you_nila_memory_label: "नीला क्या याद रखती है",
    you_nila_memory_sub: "देखें, संपादित करें, या हटाएं जो वह जानती है",
    you_settings_label: "सेटिंग्स",
    you_settings_sub: "आवाज़, रिमाइंडर, रिकवरी वाक्यांश",
    you_caregiver_label: "किसी भरोसेमंद व्यक्ति के साथ साझा करें",
    you_caregiver_sub: "परिवार के समर्थन के लिए स्नैपशॉट बनाएं",
    you_group_resources: "संसाधन",
    you_thought_record_label: "विचार रिकॉर्ड",
    you_thought_record_sub: "CBT पुनर्ढांचन कार्यपुस्तिका",
    you_learn_label: "सीखें",
    you_learn_sub: "कौशल, व्याख्याकार और अनुसंधान — एक पुस्तकालय",
    you_insights_label: "आपके पैटर्न",
    you_insights_sub: "नींद, स्क्रीन टाइम, गतिविधि और मूड",
    dnd_3_hours: "3 घंटे",
    dnd_tonight: "आज रात",
    dnd_24_hours: "24 घंटे",
    dnd_3_days: "3 दिन",
    dnd_until_off: "जब तक मैं बंद न करूँ",
    dnd_title: "शांत मोड",
    dnd_on_aria: "शांत मोड चालू — बदलने के लिए टैप करें",
    dnd_off_aria: "शांत मोड चालू करें",
    dnd_on_note: "शांत मोड चालू है — गैर-ज़रूरी नड्ज रुके हुए हैं।",
    dnd_off_note: "कुछ देर के लिए गैर-ज़रूरी नड्ज रोकें।",
    dnd_turn_off: "शांत मोड बंद करें",
    new_conversation: "नई बातचीत",
    dash_privacy: "आपके स्थानीय भाग केवल आपके डिवाइस पर रहते हैं। समय के साथ आप कैसे कर रहे हैं, इसकी एक तस्वीर।",
    weekly_report: "साप्ताहिक रिपोर्ट",
    this_week: "इस सप्ताह",
    your_month: "आपका महीना",
    your_usage: "आपका उपयोग",
    your_activity: "आपकी गतिविधि",
    tracking: "ट्रैकिंग",
    what_nila_noticed: "जो नीला ने देखा",
    signals_patterns: "संकेत और पैटर्न",
    trends_measures: "रुझान और माप",
    episodes_sessions: "एपिसोड और सत्र",
    expand_all: "सभी विस्तार करें",
    collapse_all: "सभी संकुचित करें",
    tracking_summary: "कल्याण प्रवृत्ति, नीला द्वारा देखे गए पैटर्न और आपके कार्यक्रम",
    signals_summary: "नींद, दिनचर्या, टाइपिंग और आवाज़ संकेत",
    trends_summary: "समय के साथ आपका मूड ट्रेंड",
    episodes_summary: "एपिसोड इतिहास, हालिया सत्र और गहन मूल्यांकन",
    hero_title: "अभी",
    hero_anxious: "आपका मन व्यस्त है। कुछ धीमी सांसें मदद कर सकती हैं।",
    hero_low: "अभी एक छोटा, दयालु कदम काफी है।",
    hero_elevated: "चलो, एक साथ इसे धीमा करते हैं।",
    hero_calm: "आप ठीक कर रहे हैं। लय बनाए रखें।",
    hero_checkin: "चेक इन",
    hero_breathe: "3-मिनट श्वास",
    hero_gentle: "कोमल चेक-इन",
    days_logged: "दिन लॉग किए",
    nila_chats_7d: "नीला चैट (7 दिन)",
    usage_checkins: "चेक-इन",
    usage_programs: "पूर्ण कार्यक्रम",
    usage_assessments: "मूल्यांकन",
    usage_features: "उपयोग किए गए फ़ीचर",
    narr_tracking_month: "इस महीने ऐसा लगा है {word}. ",
    narr_tracking_notices_one: "नीला ने अंदर गौर से देखने लायक 1 पैटर्न देखा।",
    narr_tracking_notices_many: "नीला ने अंदर गौर से देखने लायक {notices} पैटर्न देखे।",
    narr_tracking_none: "इस अवधि में कोई नया पैटर्न नहीं चिह्नित — स्थिर रहना भी अच्छा है।",
    narr_signals_one: "नीचे 1 पृष्ठभूमि संकेत धीरे-धीरे ट्रैक किया जा रहा है।",
    narr_signals_many: "नीचे {count} पृष्ठभूमि संकेत धीरे-धीरे ट्रैक किए जा रहे हैं।",
    narr_signals_none: "अभी रिपोर्ट करने के लिए कोई पृष्ठभूमि संकेत नहीं।",
    narr_episodes_e_one: "रिकॉर्ड पर 1 एपिसोड",
    narr_episodes_e_many: "रिकॉर्ड पर {episodes} एपिसोड",
    narr_episodes_none_e: "कोई एपिसोड दर्ज नहीं",
    narr_episodes_s_one: "1 हालिया नीला सत्र के साथ।",
    narr_episodes_s_many: "{sessions} हालिया नीला सत्रों के साथ।",
    narr_streak_first: "जब भी आप तैयार हों — आपकी पहली चेक-इन यहीं से शुरू होती है।",
    narr_streak_welcome: "वापसी पर स्वागत है — कोई दबाव नहीं। हम वहीं से आगे बढ़ते हैं जहाँ आप हैं।",
    narr_streak_milestone: "{milestone} दिनों तक अपने लिए आगे आए — वह मायने रखता है।",
    narr_streak_active_multi: "लगातार {current} दिन। धीरे-धीरे किया।",
    narr_streak_active_one: "आज चेक-इन किया। वह गिनता है।",
    narr_streak_safe: "आज आपकी स्ट्रीक सुरक्षित है — कभी भी चेक-इन उसे बनाए रखता है, जल्दी नहीं।",
    narr_streak_small: "जब भी हो सके एक छोटी चेक-इन। वही काफी है।",
    narr_mood_none: "इस सप्ताह अभी तक कोई चेक-इन नहीं — एक टैप मूड भी आपकी प्रवृत्तियों को बढ़ाता है।",
    narr_mood_base_only: "इस सप्ताह आपका तनाव औसतन {avg}/10 रहा। सप्ताह-दर-सप्ताह तुलना के लिए लॉग जारी रखें।",
    narr_mood_same: "इस सप्ताह आपका तनाव औसतन {avg}/10 रहा — पिछले सप्ताह जैसा ही।",
    narr_mood_down: "इस सप्ताह आपका तनाव औसतन {avg}/10 रहा — पिछले सप्ताह से {delta} कम। यह एक असली सुधार है।",
    narr_mood_up: "इस सप्ताह आपका तनाव औसतन {avg}/10 रहा — पिछले सप्ताह से {delta} अधिक। अपने साथ नरम रहें; कठिन दौर भी आते हैं।",
    see_all_sessions: "सभी {n} सत्र देखें",
    see_less: "कम दिखाएँ",
    no_signals_yet: "अभी कुछ चेतावनी देने जैसा नहीं है — यह एक अच्छी बात है। नीला पैटर्न पर चुपचाप नज़र रखती है और अगर कुछ बदले तो धीरे से बताएगी।",
    no_sessions_yet: "अभी कोई हालिया नीला सत्र नहीं है। जब भी आप नीला से बात करेंगे, एक चुपचाप स्नैपशॉट यहीं रहेगा — आपके डिवाइस पर, कभी साझा नहीं किया गया।",
    sec_appearance: "दिखावट",
    sec_voice: "सुखद आवाज़",
    sec_reminders: "सौम्य रिमाइंडर",
    sec_ema: "त्वरित चेक-इन",
    sec_notif_types: "सूचना प्रकार",
    sec_inflection: "नीला से सौम्य संकेत",
    sec_passive_sensing: "निष्क्रिय संवेदन",
    sec_passive_sensing_sub: "नीला को आपके फ़ोन उपयोग, नींद और टाइपिंग में पैटर्न देखने दें और सौम्य अंतर्दृष्टि दिखाएं। स्थानीय रूप से चलता है, कभी भी डिवाइस से बाहर नहीं जाता। डिफ़ॉल्ट रूप से बंद।",
    pi_enable_label: "सक्रिय अंतर्दृष्टि सक्षम करें",
    pi_enable_sub: "चालू होने पर, नीला आपके डैशबोर्ड पर कार्ड और टुडे पर एक नज दिखा सकती है जब वह ध्यान देने योग्य पैटर्न देखती है। हमेशा वैकल्पिक, हमेशा खारिज करने योग्य।",
    pi_extractions: "निष्कर्षण",
    pi_no_sources: "कोई सक्रिय स्रोत नहीं",
    pi_last_extraction: "अंतिम निष्कर्षण",
    pi_never: "कभी नहीं",
    pi_delete_data: "निष्क्रिय संवेदन डेटा हटाएं",
    pi_delete_sub: "सभी निकाले गए फ़ीचर और स्थिति हटाता है। पूर्ववत नहीं किया जा सकता।",
    pi_delete_confirm: "सभी निष्क्रिय संवेदन डेटा हटाएं? यह पूर्ववत नहीं किया जा सकता।",
    sec_health_connect: "हेल्थ कनेक्ट से नींद",
    sec_on_device: "नीला आपके डिवाइस पर चलती है",
    sec_identity: "खाता और रिकवरी",
    sec_privacy_lock: "गोपनीयता लॉक",
    sec_feedback: "प्रतिक्रिया और बारे में",
    sec_legal: "कानूनी — शर्तें और लाइसेंस",
    sec_legalSub: "गोपनीयता नीति, सेवा की शर्तें, और ओपन-सोर्स लाइसेंस",
    sec_cloud_api: "वैकल्पिक क्लाउड API",
    sec_cloud_apiSub: "क्लाउड मॉडल के लिए अपनी API कुंजी कनेक्ट करें (संदेश आपके डिवाइस से बाहर जाते हैं)",
    sec_region: "संकट लाइनें और क्षेत्र",
    sec_pilot: "अनुसंधान पायलट",
    cloud_api_provider_label: "प्रदाता",
    cloud_api_groq_recommended: "Groq (अनुशंसित)",
    cloud_api_custom_label: "कस्टम (OpenAI-संगत)",
    cloud_api_status_active: "क्लाउड मॉडल सक्रिय",
    cloud_api_status_disabled: "अक्षम — केवल ऑन-डिवाइस (अनुशंसित)।",
    cloud_api_get_key_label: "अपनी मुफ़्त Groq API कुंजी प्राप्त करें",
    cloud_api_get_key_label_custom: "अपनी मुफ़्त Google AI Studio (Gemini) API कुंजी प्राप्त करें",
    cloud_api_groq_key_label: "Groq API कुंजी",
    cloud_api_groq_key_placeholder: "gsk_…",
    cloud_api_groq_key_hint_empty: "आपकी कुंजी इस डिवाइस पर रहती है। Groq कुंजियाँ gsk_ से शुरू होती हैं।",
    cloud_api_groq_key_hint_ok: "✓ यह एक Groq कुंजी जैसी दिखती है।",
    cloud_api_openai_key_hint: "आपकी कुंजी इस डिवाइस पर रहती है।",
    cloud_api_advanced_label: "उन्नत",
    cloud_api_endpoint_label: "एंडपॉइंट",
    cloud_api_endpoint_hint_groq: "Groq की OpenAI-संगत सतह डिफ़ॉल्ट। कस्टम एंडपॉइंट के माध्यम से प्रॉक्सी होने पर ही ओवरराइड करें।",
    cloud_api_endpoint_hint_custom: "कोई भी OpenAI-संगत एंडपॉइंट (OpenAI, Together, Fireworks, स्व-होस्टेड प्रॉक्सी)। NilaMind डिफ़ॉल्ट रूप से Groq की अनुशंसा करता है।",
    cloud_api_model_label: "मॉडल",
    cloud_api_model_hint_groq: "कोई भी Groq मॉडल आईडी काम करती है। डिफ़ॉल्ट: llama-3.1-8b-instant (तेज़ और सक्षम)।",
    cloud_api_model_hint_custom: "OpenAI पर डिफ़ॉल्ट: gpt-3.5-turbo।",
    cloud_api_model_custom_option: "कस्टम मॉडल आईडी…",
    cloud_api_privacy_groq: "क्लाउड API सक्षम होने पर, आपके चैट और वॉइस-कॉल संदेश (और Nila के उत्तर) आपके डिवाइस से बाहर सीधे Groq पर जाते हैं। Groq की गोपनीयता सूचना के अनुसार वे आपके डेटा पर प्रशिक्षण नहीं लेते और उत्तर के बाद सबमिट की गई सामग्री को नहीं रखते।",
    cloud_api_privacy_generic: "जब क्लाउड API सक्षम होता है, तो आपके चैट और वॉइस-कॉल संदेश (और Nila के उत्तर) आपके डिवाइस से बाहर सीधे आपके द्वारा कॉन्फ़िगर किए गए एंडपॉइंट पर जाते हैं। बाकी सब आपके फ़ोन पर ही रहता है।",
    you_wellbeing_label: "समय के साथ कल्याण",
    you_wellbeing_sub: "आपकी दीर्घकालिक प्रवृत्ति",
    wellbeing_screen_intro: "एक पखवाड़े में एक बार यह जाँच कि आप कैसे रहे हैं। लंबा नज़रिया किसी एक दिन से ज़्यादा मायने रखता है।",
    wellbeing_take: "2-सप्ताह की जाँच लें",
    wellbeing_due_title: "आपकी पखवाड़े वाली कल्याण जाँच देय है",
    wellbeing_due_sub: "2 मिनट की जाँच आपको लंबा नज़रिया दिखाती है, न कि बस रोज़ के उतार-चढ़ाव।",
    wellbeing_baseline_title: "अपना कल्याण आधार तय करें",
    wellbeing_baseline_sub: "अभी 2 मिनट की जाँच आपको एक शुरुआती बिंदु देती है — ताकि आगे की जाँचें रुझान दिखा सकें।",
    wellbeing_next_due_prefix: "अगली जाँच",
    wellbeing_days: "दिन में",
    wellbeing_due_now: "अभी देय",
    wellbeing_none: "अभी तक कोई जाँच नहीं — पहली लें।",
    wellbeing_improving: "सुधार",
    wellbeing_deteriorating: "गिरावट",
    wellbeing_steady: "स्थिर",
    you_episode_marker_label: "एपिसोड मार्कर",
    you_episode_marker_sub: "समय के साथ मूड चरणों को ट्रैक करें",
    em_intro: "यह चिह्नित करें कि समय के साथ आपका मूड कैसा रहा — उत्साहित, उदास, मिश्रित, या स्थिर। समय के साथ एक पैटर्न, निदान नहीं।",
    em_add_marker: "मार्कर जोड़ें",
    em_phase: "चरण",
    em_from: "से",
    em_to: "तक",
    em_note_optional: "नोट (वैकल्पिक)",
    em_save: "मार्कर सहेजें",
    em_current: "वर्तमान अवधि",
    em_none: "अभी तक कोई मार्कर नहीं — अपना पहला जोड़ें।",
    em_past: "पिछले मार्कर",
    em_phase_elevated: "उत्साहित",
    em_phase_depressed: "उदास",
    em_phase_mixed: "मिश्रित",
    em_phase_stable: "स्थिर",
    you_caregiver_settings_label: "देखभालकर्ता सेटिंग्स",
    you_caregiver_settings_sub: "विश्वसनीय संपर्क और साझाकरण प्रबंधित करें",
    cg_add_contact: "विश्वसनीय व्यक्ति जोड़ें",
    cg_name: "नाम",
    cg_phone_or_email: "फ़ोन या ईमेल",
    cg_relationship: "रिश्ता (वैकल्पिक)",
    cg_remove: "हटाएं",
    cg_share_categories: "क्या साझा करें",
    cg_category_mood: "भावना रुझान",
    cg_category_phase: "चरण मार्कर",
    cg_category_sleep: "नींद पैटर्न",
    cg_category_medication: "दवा पालन",
    cg_category_wellbeing: "कल्याण रुझान",
    cg_category_checkins: "चेक-इन आवृत्ति",
    cg_auto_alert: "ऑटो-अलर्ट सीमा",
    cg_auto_alert_desc: "संघर्ष होने पर साझा करने की याद दिलाएं",
    cg_threshold_days: "लगातार दिन",
    cg_min_intensity: "न्यूनतम तीव्रता (1–10)",
    cg_preview: "स्नैपशॉट पूर्वावलोकन",
    cg_no_contacts: "अभी तक कोई विश्वसनीय संपर्क नहीं",
    cg_consent_title: "साझा करने से पहले",
    cg_consent_body: "यह आपके विश्वसनीय व्यक्ति के साथ एक कल्याण स्नैपशॉट साझा करेगा। वे Nila के साथ आपकी निजी बातचीत नहीं देखेंगे — केवल नीचे चुनी गई श्रेणियां।",
    cg_save: "प्राथमिकताएं सहेजें",
    cg_alert_nudge: "कल्याण अपडेट साझा करें",
    cg_alert_reason: "आपका कठिन समय रहा है — आपका देखभालकर्ता जानना चाह सकता है",
    // Phase 20.9 — clinician report (Hindi)
    cr_coverTitle: "NilaMind क्लिनिशियन सारांश",
    cr_execSummary: "संक्षिप्त सारांश",
    cr_checkins: "चेक-इन",
    cr_sleep: "नींद और सर्कैडियन लय",
    cr_screenings: "स्क्रीनिंग ट्रैजेक्टरी",
    cr_medications: "दवा अनुपालन",
    cr_episodes: "एपिसोड लॉग",
    cr_phaseMarkers: "बाइपोलर चरण मार्कर (स्व-लॉग)",
    cr_diaryCard: "DBT डायरी कार्ड सारांश",
    cr_safetyPlan: "सुरक्षा योजना (Stanley-Brown)",
    cr_relapsePlan: "रिलैप्स रोकथाम योजना",
    cr_connections: "सामाजिक संपर्क",
    cr_supports: "सहायता सारांश",
    cr_voiceSignal: "आवाज़ संकेत",
    cr_whatHelped: "क्या मदद किया (हाल की अंतर्दृष्टि)",
    cr_whatDidntHelp: "क्या मदद नहीं किया (स्व-रिपोर्ट)",
    cr_doseChanges: "दवा खुराक में बदलाव",
    cr_sideEffects: "साइड इफ़ेक्ट अवधि",
    cr_thoughtRecords: "विचार रिकॉर्ड सारांश",
    cr_wellbeing: "कल्याण ट्रैजेक्टरी (WHO-5)",
    cr_correlation: "नींद-मूड सहसंबंध",
    cr_triggerContext: "ट्रिगर और संदर्भ पैटर्न",
    cr_eventTimeline: "घटना टाइमलाइन",
    cr_engagement: "सहभागिता",
    cr_disclaimer: "NilaMind द्वारा उत्पन्न — नैदानिक या निदान उपकरण नहीं। केवल सूचना उद्देश्य के लिए।",
    cr_redactTitle: "शामिल करने के लिए चुनें",
    cr_redactMinimal: "न्यूनतम (स्क्रीनिंग + सुरक्षा योजना केवल)",
    cr_redactFull: "पूर्ण (सब कुछ)",
    cr_visitNote: "अगली यात्रा के लिए नोट्स",
    cr_visitNotePrompt1: "याद रखने के लिए शीर्ष 3 चीज़ें",
    cr_visitNotePrompt2: "पूछने के लिए प्रश्न",
    cr_visitNotePrompt3: "पिछली यात्रा के बाद क्या बदला",
    cr_consentTitle: "निर्यात की पुष्टि करें",
    cr_consentBody: "मैं पुष्टि करता/करती हूं कि यह मेरी अपनी यात्रा के लिए मेरा स्व-रिपोर्ट है। इस डिवाइस पर डेटा मेरा है। NilaMind ने इस फ़ाइल को ऑन-डिवाइस बनाया और इसे देख नहीं सकता।",
    // Proactive Agent (Phase 23)
    pi_card_sleep_pattern: "नींद का पैटर्न बदला",
    pi_card_activity_shift: "गतिविधि का पैटर्न बदला",
    pi_card_circadian_insight: "सर्कैडियन रिदम अंतर्दृष्टि",
    pi_card_typing_pattern: "टाइपिंग पैटर्न में बदलाव",
    pi_card_resilience: "सुरक्षात्मक पैटर्न देखे गए",
    pi_card_phase_shift: "संभावित चरण परिवर्तन",
    pi_card_routine_disruption: "दिनचर्या में व्यवधान",
    pi_card_connection_dip: "सामाजिक जुड़ाव में कमी",
    pi_card_protective: "लचीलापन के संकेत",
    pi_card_body: "निला ने इस सप्ताह आपकी लय में एक पैटर्न देखा।",
    pi_nudge_sleep: "आपका नींद का पैटर्न बदल गया है — एक सौम्य चेक-इन सही रहेगा।",
    pi_nudge_activity: "गतिविधि का स्तर बदल गया है — आप कैसा महसूस कर रहे हैं?",
    pi_nudge_circadian: "आपकी दैनिक लय हाल ही में अधिक परिवर्तनशील रही है।",
    pi_nudge_typing: "आपके टाइपिंग पैटर्न बदल गए हैं — चेक-इन करना चाहेंगे?",
    pi_nudge_phase: "संभावित मूड परिवर्तन का पता चला — एक त्वरित चेक-इन मदद कर सकता है।",
    pi_nudge_routine: "आपकी दिनचर्या बाधित हुई है — इसे स्थिर करना चाहेंगे?",
    pi_nudge_connection: "आप हाल ही में कम जुड़ रहे हैं — कोई दबाव नहीं, बस ध्यान दे रहे हैं।",
    pi_action_checkin: "चेक-इन करें",
    pi_action_winddown: "विंड डाउन",
    pi_action_diary: "दिन लॉग करें",
    pi_action_assessment: "स्क्रीन लें",
    pi_action_protocol: "प्रोटोकॉल आज़माएं",
    pi_dismiss: "अभी नहीं",
  },
  ta: {
    appName: "NilaMind",
    greeting_morning: "காலை வணக்கம்",
    greeting_day: "மதிய வணக்கம்",
    greeting_evening: "மாலை வணக்கம்",
    greeting_night: "இனிய இரவு",
    settings: "அமைப்புகள்",
    dashboard: "உங்கள் டாஷ்போர்டு",
    medications: "மருந்துகள்",
    crisisButton: "அவசர உதவி",
    needHelpNow: "இப்போது உதவி வேண்டும்",
    checkIn: "சரிபார்க்க",
    tools: "கருவிகள்",
    you: "நீங்கள்",
    done: "முடிந்தது",
    save: "சேமி",
    cancel: "ரத்து",
    next: "அடுத்து",
    back: "பின்",
    skip: "தவிர்",
    start: "தொடங்கு",
    language: "மொழி",
    privacyNotice: "நீங்கள் பகிர்வது இந்த சாதனத்தில் மட்டுமே இருக்கும்.",
    crisisDisclaimer: "ஆபத்தில் இருந்தால், அவசர உதவி கற்றல் மற்றும் அணுகல் திரைகளில் கிடைக்கும்.",
    notTherapy: "NilaMind சிகிச்சை அல்லது அவசர சேவை அல்ல.",
    exportTitle: "அறிக்கை ஏற்றுமதி",
    exportCsv: "CSV பதிவிறக்கம்",
    exportPdf: "PDF பதிவிறக்கம்",
    exportDisclaimer: "NilaMind ஆல் உருவாக்கப்பட்டது \u2014 மருத்துவ அல்லது கண்டறியும் கருவி அல்ல.",
    close: "மூடு",
    loading: "ஏற்றுகிறது\u2026",
    seeAll: "அனைத்தையும் பார்",
    enable: "இயக்கு",
    on: "ஆன்",
    off: "ஆஃப்",
    crisisHeading: "நீங்கள் இதைத் தேடினீர்கள். உதவிக்கான ஏதாவது கண்டுபிடிப்போம்.",
    crisisSub: "அது செய்வது வலிமையான ஒன்று. முதலில் உங்களை நிலைநிறுத்துங்கள், அல்லது பயிற்சி பெற்ற கேட்பவருடன் பேசுங்கள்.",
    crisisTryFirst: "முதலில் இவற்றை முயற்சிக்கவும்",
    crisisGroundingLabel: "5-4-3-2-1 கிரவுண்டிங்",
    crisisGroundingSub: "தற்போதைய தருணத்தில் இருக்க உங்களைச் சுற்றியுள்ளதைக் கவனியுங்கள்",
    crisisBreathingLabel: "பாக்ஸ் மூச்சு (4-4-4-4)",
    crisisBreathingSub: "உங்கள் நரம்பு மண்டலத்தை அமைதிப்படுத்த நிதானமான மூச்சு",
    crisisSpeakNow: "அல்லது இப்போது யாராவது பேசுங்கள்",
    crisisHelplineNote: "உங்கள் பகுதிக்கான இலவச, ரகசிய உதவி எண்கள் — அமைப்புகளில் மாற்றவும்.",
    crisisCopingPlan: "உங்கள் சமாளிப்புத் திட்டம்",
    crisisWarnSigns: "1. நான் கவனிக்கும் எச்சரிக்கை அறிகுறிகள்:",
    crisisWarnSignsBlank: "இந்தப் பகுதி இன்னும் காலியாக உள்ளது — அது பரவாயில்லை. நீங்கள் இப்போது இங்கே இருக்கிறீர்கள், அது முக்கியம்.",
    crisisInternalCoping: "2. நான் தனியாக சமாளிக்கச் செய்யக்கூடியவை:",
    crisisInternalCopingBlank: "இங்கே இன்னும் எதுவும் எழுதப்படவில்லை — அது பரவாயில்லை.",
    crisisSocial: "3. என்னைத் திசைத்திருப்பும் நபர்களும் இடங்களும்:",
    crisisSocialBlank: "இங்கே இன்னும் எதுவும் இல்லை — அது பரவாயில்லை.",
    crisisTrusted: "4. உதவிக்காகத் தொடர்பு கொள்ளக்கூடிய நபர்கள்:",
    crisisTrustedBlank: "இன்னும் பெயர்கள் இல்லை — இப்போது ஒருவரையாவது தொடர்பு கொள்வது உதவும்.",
    crisisProf: "5. நிபுணர்கள் மற்றும் நெருக்கடி உதவி எண்கள்:",
    crisisSafe: "6. என் இடத்தைப் பாதுகாப்பாக மாற்றுதல்:",
    crisisSafeBlank: "இங்கே இன்னும் எதுவும் இல்லை — அது பரவாயில்லை.",
    crisisSteadier: "இப்போது நான் சற்று நிலையானவள்/னன் உணர்கிறேன்",
    settingsIntro: "பயன்பாட்டு விருப்பங்கள் — பிரகாசமான அல்லது பரபரப்பான திரைகள் அதிகமாக இருந்தால் அமைதியான \"பார்வையை மென்மையாக்கு\" முறை உட்பட.",
    shareTrustedTitle: "நம்பகமான நபருடன் பகிர்",
    shareTrustedSub: "குடும்ப ஆதரவுக்கான நலன் நிலை சித்திரம் உருவாக்கு",
    privacyPolicy: "தனியுரிமைக் கொள்கை",
    privacyPolicySub: "உங்கள் தரவு எப்படி தனிப்பட்டதாக இருக்கிறது — எதுவும் சாதனத்தை விட்டு வெளியேறாது",
    perfTitle: "செயல்திறன் மற்றும் கண்டறிதல்",
    perfSub: "வலை முக்கிய அளவீடுகள், LLM க cache, க்ராஷ் பதிவு — இந்தச் சாதனத்தில் மட்டும்",
    tool_group_moment: "இந்தத் தருணத்தில்",
    tool_plan_label: "கிரவுண்டிங் மற்றும் மூச்சு",
    tool_plan_sub: "கடினமான நிமிடத்தில் உங்கள் உடலை அமைதிப்படுத்துங்கள்",
    tool_winddown_label: "தூக்கத்திற்குத் தயாராகுங்கள்",
    tool_winddown_sub: "அமைதியான படுக்கை நேர ஒழுங்கு — நாளை முடித்து அமைதியாக இருங்கள்",
    tool_reach_out_label: "ஒருவரைத் தொடர்பு கொள்ளுங்கள்",
    tool_reach_out_sub: "நீங்கள் நம்பும் ஒருவருக்கு அனுப்பத் தயாரான நல்ல செய்தி",
    tool_crisis_rehearsal_label: "நெருக்கடி ஒத்திகை",
    tool_crisis_rehearsal_sub: "தேவைப்படுவதற்கு முன் உங்கள் திட்டத்தைப் பயிற்சி செய்யுங்கள்",
    tool_relapse_label: "மீண்டும் வராமல் தடுக்கும் திட்டம்",
    tool_relapse_sub: "ஒவ்வொரு கட்டத்திற்கும் முன்கூட்டியே திட்டமிடுங்கள் — பச்சை, ஆரஞ்சு, சிவப்பு",
    tool_episode_label: "நான் ஒரு அத்தியாயத்தில் இருக்கிறேன்",
    tool_episode_sub: "இப்போது படிநிலை வழிகாட்டுதலுடன் ஆதரவு",
    tool_group_log: "பதிவு செய்து கண்காணிக்கவும்",
    tool_ema_label: "விரைவான செக்-இன்",
    tool_ema_sub: "ஒரு 10-வினாடி மனநிலைச் சோதனை, இப்போது",
    tool_diary_label: "டைரி",
    tool_diary_sub: "சுதந்திரமாக எழுதி, உங்கள் பதிவுகளை மீண்டும் பாருங்கள்",
    tool_assessment_label: "திரையிடல்கள்",
    tool_assessment_sub: "PHQ-9, GAD-7 & மேலும் நேரத்துடன்",
    tool_medication_label: "மருந்துகள்",
    tool_medication_sub: "அளவு மற்றும் பின்பற்றுதலைக் கண்காணிக்கவும்",
    tool_social_rhythm_label: "சமூகத் தாளம்",
    tool_social_rhythm_sub: "தினசரி வழக்கத்தை நிலையாக வைக்கவும் — நேரம் எதிராக மனநிலை",
    tool_group_skills: "திறன்கள் மற்றும் பயிற்சி",
    tool_problem_solving_label: "பிரச்சனைத் தீர்வு",
    tool_problem_solving_sub: "பிரச்சனையைப் படிகளாகப் பிரித்து தீர்வை முயற்சிக்கவும்",
    tool_values_work_label: "மதிப்புப் பணி",
    tool_values_work_sub: "முக்கியமானதைத் தெளிவுபடுத்தி நீங்கள் ஒத்திசைவதைக் கவனியுங்கள்",
    tool_exposure_label: "வெளிப்பாடு படிநிலை",
    tool_exposure_sub: "ஒரு பயம் படிக்கட்டை உருவாக்குங்கள் — கீழிருந்து மேலே பணியுங்கள்",
    tool_group_patterns: "முறைகள்",
    tool_behaviour_label: "ஃபோன் முறைகள்",
    tool_behaviour_sub: "திரை நேரம் மற்றும் தூக்கம் எதிராக மனநிலை — சாதனத்தில்",
    you_group_manage: "நிர்வகி",
    you_about_nila_label: "நீலா பற்றி",
    you_about_nila_sub: "நீலா எப்படி வேலை செய்கிறாள், தனியுரிமை, திறன்கள் மற்றும் எல்லைகள்",
    you_dashboard_label: "உங்கள் டாஷ்போர்டு",
    you_dashboard_sub: "தொடர், மனநிலை & மதிப்பு போக்குகள், சமீபத்திய நீலா",
    you_your_data_label: "உங்கள் தரவு",
    you_your_data_sub: "அனைத்தையும் ஏற்றுமதி செய்யுங்கள், அல்லது அழிக்குங்கள் — உங்கள் தேர்வு",
    you_nila_memory_label: "நீலா எதை நினைவில் வைத்திருக்கிறாள்",
    you_nila_memory_sub: "அவள் அறிந்ததைப் பாருங்கள், திருத்துங்கள் அல்லது அழிக்கவும்",
    you_settings_label: "அமைப்புகள்",
    you_settings_sub: "குரல், நினைவூட்டல்கள், மீட்பு சொற்றொடர்",
    you_caregiver_label: "நம்பகமான நபருடன் பகிர்",
    you_caregiver_sub: "குடும்ப ஆதரவுக்கான சித்திரம் உருவாக்கு",
    you_group_resources: "வளங்கள்",
    you_thought_record_label: "சிந்தனைப் பதிவு",
    you_thought_record_sub: "CBT மறுகட்டமைப்புப் புத்தகம்",
    you_learn_label: "கற்றுக்கொள்",
    you_learn_sub: "திறன்கள், விளக்கங்கள் & ஆராய்ச்சி — ஒரு நூலகம்",
    you_insights_label: "உங்கள் முறைகள்",
    you_insights_sub: "தூக்கம், திரை நேரம், இயக்கம் & மனநிலை",
    dnd_3_hours: "3 மணி நேரம்",
    dnd_tonight: "இன்று இரவு",
    dnd_24_hours: "24 மணி நேரம்",
    dnd_3_days: "3 நாட்கள்",
    dnd_until_off: "நான் அணைக்கும் வரை",
    dnd_title: "அமைதி முறை",
    dnd_on_aria: "அமைதி முறை இயக்கத்தில் — மாற்ற தட்டவும்",
    dnd_off_aria: "அமைதி முறையை இயக்கு",
    dnd_on_note: "அமைதி முறை இயக்கத்தில் — முக்கியமற்ற நடவடிக்கைகள் இடைநிறுத்தப்பட்டுள்ளன.",
    dnd_off_note: "சிறிது நேரம் முக்கியமற்ற நடவடிக்கைகளை இடைநிறுத்து.",
    dnd_turn_off: "அமைதி முறையை அணை",
    new_conversation: "புதிய உரையாடல்",
    dash_privacy: "உங்கள் உள்ளூர் பிரிவுகள் உங்கள் சாதனத்தில் மட்டுமே இருக்கும். நீங்கள் எப்படி செல்கிறீர்கள் என்பதன் காலப்போக்கு படம்.",
    weekly_report: "வாராந்திர அறிக்கை",
    this_week: "இந்த வாரம்",
    your_month: "உங்கள் மாதம்",
    your_usage: "உங்கள் பயன்பாடு",
    your_activity: "உங்கள் செயல்பாடு",
    tracking: "கண்காணிப்பு",
    what_nila_noticed: "நீலா கவனித்தது",
    signals_patterns: "சமிக்ஞைகள் மற்றும் தரப்பாடுகள்",
    trends_measures: "போக்குகள் மற்றும் அளவீடுகள்",
    episodes_sessions: "அத்தியாயங்கள் மற்றும் அமர்வுகள்",
    expand_all: "அனைத்தையும் விரிவாக்கு",
    collapse_all: "அனைத்தையும் சுருக்கு",
    tracking_summary: "நலன் போக்கு, நீலா கவனித்த வடிவங்கள் மற்றும் உங்கள் நிகழ்ச்சிகள்",
    signals_summary: "தூக்கம், ரூட்டீன், தட்டச்சு மற்றும் குரல் சமிக்ஞைகள்",
    trends_summary: "காலப்போக்கில் உங்கள் மனநிலை போக்கு",
    episodes_summary: "எபிசோட் வரலாறு, சமீபத்திய அமர்வுகள் மற்றும் ஆழ்ந்த மதிப்பீடு",
    hero_title: "இப்போது",
    hero_anxious: "உங்கள் மனம் பரபரப்பாக உள்ளது. சில மெதுவான மூச்சுகள் உதவும்.",
    hero_low: "இப்போது ஒரு சிறிய, கருணை நிறைந்த படி போதுமானது.",
    hero_elevated: "வாருங்கள், சேர்ந்து இதை மெதுவாக்குவோம்.",
    hero_calm: "நீங்கள் சரியாகத்தான் இருக்கிறீர்கள். இந்தத் தாளத்தைத் தொடருங்கள்.",
    hero_checkin: "செக் இன்",
    hero_breathe: "3-நிமிட மூச்சு",
    hero_gentle: "மென்மையான செக்-இன்",
    days_logged: "நாட்கள் பதிவு செய்யப்பட்டன",
    nila_chats_7d: "நீலா அரட்டைகள் (7 நாட்கள்)",
    usage_checkins: "செக்-இன்கள்",
    usage_programs: "முடிக்கப்பட்ட நிரல்கள்",
    usage_assessments: "மதிப்பீடுகள்",
    usage_features: "பயன்படுத்திய அம்சங்கள்",
    narr_tracking_month: "இந்த மாதம் {word} போல் இருந்தது. ",
    narr_tracking_notices_one: "நீலா பார்க்க வேண்டிய 1 முறையை உள்ளே கண்டறிந்தார்.",
    narr_tracking_notices_many: "நீலா பார்க்க வேண்டிய {notices} முறைகளை உள்ளே கண்டறிந்தார்.",
    narr_tracking_none: "இந்த காலகட்டத்தில் புதிய முறைகள் எதுவும் குறிக்கப்படவில்லை — நிலையானதே நல்லது.",
    narr_signals_one: "1 பின்னணி சிக்னல் அமைதியாகக் கீழேக் கண்காணிக்கப்படுகிறது.",
    narr_signals_many: "{count} பின்னணி சிக்னல்கள் அமைதியாகக் கீழேக் கண்காணிக்கப்படுகின்றன.",
    narr_signals_none: "தற்போது அறிக்கை செய்ய பின்னணி சிக்னல்கள் ஏதுமில்லை.",
    narr_episodes_e_one: "பதிவில் 1 அத்தியாயம்",
    narr_episodes_e_many: "பதிவில் {episodes} அத்தியாயங்கள்",
    narr_episodes_none_e: "அத்தியாயங்கள் எதுவும் பதிவு செய்யப்படவில்லை",
    narr_episodes_s_one: "1 சமீபத்திய நீலா அமர்வுடன்.",
    narr_episodes_s_many: "{sessions} சமீபத்திய நீலா அமர்வுகளுடன்.",
    narr_streak_first: "நீங்கள் தயாரானவுடன் — உங்கள் முதல் செக்-இன் இங்கிருந்து தொடங்கும்.",
    narr_streak_welcome: "மீண்டும் வரவேற்கிறோம் — அழுத்தம் ஏதுமில்லை. நீங்கள் இருக்கும் இடத்திலிருந்தே தொடர்வோம்.",
    narr_streak_milestone: "{milestone} நாட்கள் உங்களுக்காக முன்வந்தீர்கள். அது முக்கியம்.",
    narr_streak_active_multi: "தொடர்ச்சியாக {current} நாட்கள். மெதுவாக செய்தீர்கள்.",
    narr_streak_active_one: "இன்று செக்-இன் செய்தீர்கள். அது எண்ணப்படும்.",
    narr_streak_safe: "உங்கள் ஸ்ட்ரீக் இன்று பாதுகாப்பாக உள்ளது — எப்போது வேண்டுமானாலும் செக்-இன் அதைத் தொடர உதவும், அவசரம் இல்லை.",
    narr_streak_small: "முடிந்தவுடன் ஒரு சிறிய செக்-இன் போதும்.",
    narr_mood_none: "இந்த வாரம் இன்னும் செக்-இன் ஏதுமில்லை — ஒரு டேப் மூட் கூட உங்கள் போக்குகளை வளர்க்க உதவும்.",
    narr_mood_base_only: "இந்த வாரம் உங்கள் மன அழுத்தம் சராசரியாக {avg}/10. வாரம் வாரம் ஒப்பிட லாக் பதிப்பதைத் தொடருங்கள்.",
    narr_mood_same: "இந்த வாரம் உங்கள் மன அழுத்தம் சராசரியாக {avg}/10 — கடந்த வாரத்தைப் போலவே.",
    narr_mood_down: "இந்த வாரம் உங்கள் மன அழுத்தம் சராசரியாக {avg}/10 — கடந்த வாரத்தை விட {delta} குறைவு. அது உண்மையான முன்னேற்றம்.",
    narr_mood_up: "இந்த வாரம் உங்கள் மன அழுத்தம் சராசரியாக {avg}/10 — கடந்த வாரத்தை விட {delta} அதிகம். உங்களுடன் கனிவாக இருங்கள்; கடினமான காலங்களும் வரும்.",
    see_all_sessions: "அனைத்து {n} அமர்வுகளையும் பார்",
    see_less: "குறைவாகக் காட்டு",
    no_signals_yet: "இப்போது எச்சரிக்க ஏதுமில்லை — அது நல்ல விஷயம். நிலாவின் பார்வை அமைதியாக பார்த்துக்கொண்டிருக்கும்; ஏதாவது மாறினால் மெதுவாக சொல்லும்.",
    no_sessions_yet: "இதுவரை நிலா அமர்வுகள் ஏதுமில்லை. நீங்கள் நிலாவுடன் பேசும்போது, அமைதியான ஒரு சிறு பதிவு இங்கே இருக்கும் — உங்கள் சாதனத்தில், ஒருபோதும் பகிரப்படாது.",
    sec_appearance: "தோற்றம்",
    sec_voice: "அமைதியான குரல்",
    sec_reminders: "மென்மையான நினைவூட்டல்கள்",
    sec_ema: "விரைவான செக்-இன்கள்",
    sec_notif_types: "அறிவிப்பு வகைகள்",
    sec_inflection: "நீலாவிடமிருந்து மென்மையான நடவடிக்கைகள்",
    sec_passive_sensing: "இறப்பி உணர்வு (பாசிவ் சென்சிங்)",
    sec_passive_sensing_sub: "உங்கள் சாதன இயக்கத்தை ஒரே நேரத்தில் செலுத்துவதால் உங்கள் தினசரி நெறிமுறைகளில் மாற்றங்களை நீளவோர் பறக்கும் வகையில் கண்டறியவும். தரவு உங்கள் சாதனத்தை விட்டு வெளியேறாது. இயல்பாக முடக்கப்பட்டது.",
    pi_enable_label: "நீலா மாற்றங்களை குறிப்பிட அனுமதியளிக்கவும்",
    pi_enable_sub: "செயலாகும்போது, நீலா தございますвую தினசரி நெறிமுறையில் வாட்டமான மாற்றங்களை கவனித்து உங்களை மென்மையாகச் செக்-இன் செய்வதற்கு ஊக்குவிக்கும். எந்த எச்சரிக்கையும் இல்லை.",
    pi_extractions: "செலுத்தல்கள்",
    pi_no_sources: "மூலங்கள் இல்லை",
    pi_last_extraction: "கடைசி செலுத்தல்",
    pi_never: "எப்போதும் இல்லை",
    pi_delete_data: "பாசிவ் சென்சிங் தரவு நீக்கு",
    pi_delete_sub: "உங்கள் சாதனம் முதல் அனைத்து இயக்கத் தரவையும் நீக்கவும்",
    pi_delete_confirm: "அனைத்து பாசிவ் சென்சிங் தரவையும் நீக்கவும்? இது மாற்ற முடியாது.",
    sec_health_connect: "ஹெல்த் கனெக்ட் வழியே தூக்கம்",
    sec_on_device: "நீலா உங்கள் சாதனத்தில் இயங்குகிறது",
    sec_identity: "கணக்கு மற்றும் மீட்பு",
    sec_privacy_lock: "தனியுரிமை பூட்டு",
    sec_feedback: "கருத்து & பற்றி",
    sec_legal: "சட்டப்பூர்வ — விதிமுறைகள் & உரிமங்கள்",
    sec_legalSub: "தனியுரிமைக் கொள்கை, சேவை விதிமுறைகள், மற்றும் திறந்த மூல உரிமங்கள்",
    sec_cloud_api: "விருப்பமான கிளவுட் API",
    sec_cloud_apiSub: "கிளவுட் மாடலுக்கு உங்கள் API விசையை இணைக்கவும் (செய்திகள் உங்கள் சாதனத்தை விட்டு வெளியேறும்)",
    sec_region: "நெருக்கடி வரிகள் & பகுதி",
    sec_pilot: "ஆராய்ச்சி பைலட்",
    cloud_api_provider_label: "வழங்குநர்",
    cloud_api_groq_recommended: "Groq (பரிந்துரைக்கப்படுகிறது)",
    cloud_api_custom_label: "தனிப்பயன் (OpenAI-இணக்கமான)",
    cloud_api_status_active: "கிளவுட் மாடல் செயலில்",
    cloud_api_status_disabled: "முடக்கப்பட்டது — ஆன்-டிவைஸ் மட்டும் (பரிந்துரைக்கப்படுகிறது).",
    cloud_api_get_key_label: "உங்கள் இலவச Groq API விசையைப் பெறவும்",
    cloud_api_get_key_label_custom: "உங்கள் இலவச Google AI Studio (Gemini) API விசையைப் பெறவும்",
    cloud_api_groq_key_label: "Groq API விசை",
    cloud_api_groq_key_placeholder: "gsk_…",
    cloud_api_groq_key_hint_empty: "உங்கள் விசை இந்தச் சாதனத்திலேயே இருக்கும். Groq விசைகள் gsk_ இல் தொடங்கும்.",
    cloud_api_groq_key_hint_ok: "✓ Groq விசை போல் தெரிகிறது.",
    cloud_api_openai_key_hint: "உங்கள் விசை இந்தச் சாதனத்திலேயே இருக்கும்.",
    cloud_api_advanced_label: "மேம்பட்ட",
    cloud_api_endpoint_label: "எண்ட்பாயிண்ட்",
    cloud_api_endpoint_hint_groq: "Groq இன் OpenAI-இணக்கமான மேற்பரப்பு இயல்புநிலை. தனிப்பயன் எண்ட்பாயிண்ட் வழியாக ப்ராக்ஸி செய்தால் மட்டுமே மேலெழுதவும்.",
    cloud_api_endpoint_hint_custom: "எந்த OpenAI-இணக்கமான எண்ட்பாயிண்ட் (OpenAI, Together, Fireworks, சுய-ஹோஸ்ட் செய்யப்பட்ட ப்ராக்ஸி). NilaMind Groq ஐ இயல்பாக பரிந்துரைக்கிறது.",
    cloud_api_model_label: "மாடல்",
    cloud_api_model_hint_groq: "எந்த Groq மாடல் ஐடியும் வேலை செய்யும். இயல்புநிலை: llama-3.1-8b-instant (வேகமான & திறமையான).",
    cloud_api_model_hint_custom: "OpenAI இல் இயல்புநிலை: gpt-3.5-turbo.",
    cloud_api_model_custom_option: "தனிப்பயன் மாடல் ஐடி…",
    cloud_api_privacy_groq: "கிளவுட் API இயக்கப்பட்டால், உங்கள் அரட்டை மற்றும் குரல் அழைப்பு செய்திகள் (மற்றும் Nila இன் பதில்கள்) உங்கள் சாதனத்திலிருந்து நேரடியாக Groq க்குச் செல்லும். Groq இன் தனியுரிமை அறிவிப்பின்படி, அவர்கள் உங்கள் தரவைக் கொண்டு训练的训练 செய்வதில்லை, மறுமொழிக்குப் பிறகு சமர்ப்பித்த உள்ளடக்கத்தைத் தக்கவைப்பதில்லை.",
    cloud_api_privacy_generic: "கிளவுட் API இயக்கப்படும்போது, உங்கள் அரட்டை மற்றும் குரல் அழைப்பு செய்திகள் (மற்றும் Nila இன் பதில்கள்) உங்கள் சாதனத்திலிருந்து நேரடியாக நீங்கள் கட்டமைக்கும் எண்ட்பாயிண்டுக்குச் செல்லும். மற்ற அனைத்தும் உங்கள் தொலைபேசியில் இருக்கும்.",
    you_wellbeing_label: "காலப்போக்கில் நலன்",
    you_wellbeing_sub: "உங்கள் நீண்டகால போக்கு",
    wellbeing_screen_intro: "நீங்கள் எப்படி இருந்தீர்கள் என்பதை இரு வாரங்களுக்கு ஒருமுறை சரிபார்க்கவும். ஒரு நாளைக்கும் மேலாக நீண்ட பார்வை முக்கியம்.",
    wellbeing_take: "2-வார சோதனையை எடுக்கவும்",
    wellbeing_due_title: "உங்கள் இரு-வார நலன் சோதனை நிலுவையில் உள்ளது",
    wellbeing_due_sub: "2 நிமிடச் சோதனை நீண்ட பார்வையைக் காட்டும், தினசரி ஏற்றத்தாழ்வுகளை அல்ல.",
    wellbeing_baseline_title: "உங்கள் நல அடிப்படையை அமைக்கவும்",
    wellbeing_baseline_sub: "இப்போது 2 நிமிடச் சோதனை ஒரு தொடக்கப் புள்ளியைத் தரும் — பிற்கால சோதனைகள் போக்கைக் காட்ட.",
    wellbeing_next_due_prefix: "அடுத்த சோதனை",
    wellbeing_days: "நாட்களில்",
    wellbeing_due_now: "இப்போது நிலுவை",
    wellbeing_none: "இதுவரை சோதனைகள் இல்லை — முதலை எடுங்கள்.",
    wellbeing_improving: "மேம்படுகிறது",
    wellbeing_deteriorating: "சரியாகிறது",
    wellbeing_steady: "நிலையான",
    you_episode_marker_label: "அத்தியாய அடையாளங்கள்",
    you_episode_marker_sub: "மனநிலை கட்டங்களைக் காலப்போக்கில் கண்காணிக்கவும்",
    em_intro: "உங்கள் மனநிலை எப்படி இருந்தது என்பதைக் குறிக்கவும் — உற்சாகம், சோகம், கலவை, அல்லது நிலையான. காலப்போக்கில் ஒரு பாணி, நோயறிதல் அல்ல.",
    em_add_marker: "அடையாளத்தைச் சேர்",
    em_phase: "கட்டம்",
    em_from: "இதிலிருந்து",
    em_to: "வரை",
    em_note_optional: "குறிப்பு (விருப்பம்)",
    em_save: "அடையாளத்தைச் சேமி",
    em_current: "தற்போதைய காலகட்டம்",
    em_none: "இதுவரை அடையாளங்கள் இல்லை — உங்கள் முதலைச் சேர்.",
    em_past: "முந்தைய அடையாளங்கள்",
    em_phase_elevated: "உற்சாகம்",
    em_phase_depressed: "சோகம்",
    em_phase_mixed: "கலவை",
    em_phase_stable: "நிலையான",
    you_caregiver_settings_label: "பராமரிப்பாளர் அமைப்புகள்",
    you_caregiver_settings_sub: "நம்பகமான தொடர்புகள் மற்றும் பகிர்வை நிர்வகிக்கவும்",
    cg_add_contact: "நம்பகமான நபரைச் சேர்க்கவும்",
    cg_name: "பெயர்",
    cg_phone_or_email: "தொலைபேசி அல்லது மின்னஞ்சல்",
    cg_relationship: "உறவு (விரும்பினால்)",
    cg_remove: "அகற்று",
    cg_share_categories: "எதைப் பகிர்வது",
    cg_category_mood: "மனநிலைப் போக்கு",
    cg_category_phase: "கட்ட குறிப்பான்கள்",
    cg_category_sleep: "தூக்க முறை",
    cg_category_medication: "மருந்து பின்பற்றுதல்",
    cg_category_wellbeing: "நலன் போக்கு",
    cg_category_checkins: "சரிபார்ப்பு அதிர்வெண்",
    cg_auto_alert: "தானியங்கி எச்சரிக்கை வரம்பு",
    cg_auto_alert_desc: "சிரமப்பட்டால் பகிர நினைவூட்டு",
    cg_threshold_days: "தொடர் நாட்கள்",
    cg_min_intensity: "குறைந்தபட்ச தீவிரம் (1–10)",
    cg_preview: "முன்னோட்டம்",
    cg_no_contacts: "இதுவரை நம்பகமான தொடர்புகள் இல்லை",
    cg_consent_title: "பகிர்வதற்கு முன்",
    cg_consent_body: "இது உங்கள் நம்பகமான நபருடன் ஒரு நலன் சுருக்கத்தைப் பகிரும். Nila உடனான உங்கள் தனிப்பட்ட உரையாடல்களை அவர்கள் பார்க்க மாட்டார்கள் — கீழே தேர்ந்தெடுத்த வகைகள் மட்டுமே.",
    cg_save: "விருப்பங்களைச் சேமி",
    cg_alert_nudge: "நலன் புதுப்பிப்பைப் பகிரவும்",
    cg_alert_reason: "உங்களுக்குக் கடினமான நாட்கள் — உங்கள் பராமரிப்பாளர் தெரிந்துகொள்ள விரும்பலாம்",
    // Phase 20.9 — clinician report (Tamil)
    cr_coverTitle: "NilaMind மருத்துவர் சுருக்கம்",
    cr_execSummary: "சுருக்கமான மதிப்பாய்வு",
    cr_checkins: "சரிபார்ப்புகள்",
    cr_sleep: "தூக்கம் மற்றும் சர்க்காடியன் ரிதம்",
    cr_screenings: "திரையிடல் தடம்",
    cr_medications: "மருந்து பின்பற்றல்",
    cr_episodes: "சம்பவ பதிவு",
    cr_phaseMarkers: "இருமுனை கட்ட குறிகள் (சுய-பதிவு)",
    cr_diaryCard: "DBT நாட்குறிப்பு அட்டை சுருக்கம்",
    cr_safetyPlan: "பாதுகாப்புத் திட்டம் (Stanley-Brown)",
    cr_relapsePlan: "மீளல் தடுப்புத் திட்டம்",
    cr_connections: "சமூக இணைப்பு",
    cr_supports: "ஆதரவு சுருக்கம்",
    cr_voiceSignal: "குரல் சிக்னல்",
    cr_whatHelped: "எது உதவியது (சமீபத்திய நுண்ணறிவுகள்)",
    cr_whatDidntHelp: "எது உதவவில்லை (சுய-புகார்)",
    cr_doseChanges: "மருந்து அளவு மாற்றங்கள்",
    cr_sideEffects: "பக்க விளைவு காலம்",
    cr_thoughtRecords: "சிந்தனை பதிவு சுருக்கம்",
    cr_wellbeing: "நல்வாழ்வு தடம் (WHO-5)",
    cr_correlation: "தூக்கம்-மனநிலை தொடர்பு",
    cr_triggerContext: "தூண்டுதல் மற்றும் சூழல் முறைகள்",
    cr_eventTimeline: "நிகழ்வு காலவரிசை",
    cr_engagement: "ஈடுபாடு",
    cr_disclaimer: "NilaMind மூலம் உருவாக்கப்பட்டது — மருத்துவ அல்லது நோயறிதல் கருவி அல்ல. தகவல் நோக்கத்திற்கு மட்டுமே.",
    cr_redactTitle: "சேர்க்க வேண்டியவற்றைத் தேர்ந்தெடுக்கவும்",
    cr_redactMinimal: "குறைந்தபட்சம் (திரையிடல் + பாதுகாப்புத் திட்டம் மட்டும்)",
    cr_redactFull: "முழுமை (எல்லாம்)",
    cr_visitNote: "அடுத்த வருகைக்கான குறிப்புகள்",
    cr_visitNotePrompt1: "நினைவில் வைக்க வேண்டிய முதல் 3 விஷயங்கள்",
    cr_visitNotePrompt2: "கேட்க விரும்பும் கேள்விகள்",
    cr_visitNotePrompt3: "கடந்த வருகையிலிருந்து என்ன மாறியது",
    cr_consentTitle: "ஏற்றுமதியை உறுதிப்படுத்தவும்",
    cr_consentBody: "இது எனது சொந்த வருகைக்கான எனது சுய-புகார் என நான் உறுதிப்படுத்துகிறேன். இந்தச் சாதனத்தில் உள்ள தரவு எனக்கு சொந்தமானது. NilaMind இந்தக் கோப்பை சாதனத்திலேயே உருவாக்கியது மற்றும் அதைப் பார்க்க இயலாது.",
    // Proactive Agent (Phase 23)
    pi_card_sleep_pattern: "தூக்க வழக்கு மாற்றம்",
    pi_card_activity_shift: "செயல்பாட்டு வழக்கு மாற்றம்",
    pi_card_circadian_insight: "சர்க்காடியன் ரிதம் நுண்ணறிவு",
    pi_card_typing_pattern: "தட்டச்சு வடிவம் மாற்றம்",
    pi_card_resilience: "பாதுகாப்பு வழக்குகள் கவனிக்கப்பட்டது",
    pi_card_phase_shift: "சாத்தியமான கட்ட மாற்றம்",
    pi_card_routine_disruption: "வழக்கம் தடை",
    pi_card_connection_dip: "சமூக தொடர்வு குறைவு",
    pi_card_protective: "புணர்வு குறிகள்",
    pi_card_body: "நிலா இந்த வாரம் உங்கள் ரிதங்களில் ஒரு வழக்கைக் கண்டறிந்தது.",
    pi_nudge_sleep: "உங்கள் தூக்க வழக்கு மாறியுள்ளது — ஒரு மிருது சரிபார்ப்பு மதிப்புள்ளது.",
    pi_nudge_activity: "செயல்பாட்டு நிலைகள் மாறியுள்ளன — நீங்கள் எப்படி உணர்கிறீர்கள்?",
    pi_nudge_circadian: "உங்கள் நாள் ரிதம் சமீபத்தில் அதிக மாறுபட்டுள்ளது.",
    pi_nudge_typing: "உங்கள் தட்டச்சு வடிவங்கள் மாறியுள்ளன — சரிபார்க்க விரும்புகிறீர்கள்?",
    pi_nudge_phase: "சாத்தியமான மனநிலை மாற்றம் கண்டறியப்பட்டது — ஒரு வேகமான சரிபார்ப்பு உதவும்.",
    pi_nudge_routine: "உங்கள் வழக்கம் ப semaine இடைநிலைப்படுத்தப்பட்டுள்ளது — அதை நிலைநிறுத்த விரும்புகிறீர்களா?",
    pi_nudge_connection: "நீங்கள் சமீபத்தில் குறைவாக இணைக்கிறீர்கள் — அழுத்தம் இல்லை, எப்போதும் கவனித்து கொண்டேன்.",
    pi_action_checkin: "சரிபார்க்க",
    pi_action_winddown: "விடிப்பு",
    pi_action_diary: "நாளை பதிவு செய்",
    pi_action_assessment: "திரையிடு",
    pi_action_protocol: "நெறிமுறையைப் பробை செய்",
    pi_dismiss: "இப்போது இல்லை",
  },
  te: {
    appName: "NilaMind",
    greeting_morning: "శుభోదయం",
    greeting_day: "శుభ మధ్యాహ్నం",
    greeting_evening: "శుభ సాయంత్రం",
    greeting_night: "శుభ రాత్రి",
    settings: "సెట్టింగ్‌లు",
    dashboard: "మీ డాష్‌బోర్డ్",
    medications: "మందులు",
    crisisButton: "అత్యవసర సహాయం",
    needHelpNow: "ఇప్పుడు సహాయం కావాలి",
    checkIn: "చెక్-ఇన్",
    tools: "సాధనాలు",
    you: "మీరు",
    done: "పూర్తయింది",
    save: "సేవ్ చేయి",
    cancel: "రద్దు",
    next: "తదుపరి",
    back: "వెనుక",
    skip: "దాటవేయి",
    start: "ప్రారంభించు",
    language: "భాష",
    privacyNotice: "మీరు ఏమి పంచుకున్నా ఈ పరికరంలోనే ఉంటుంది.",
    crisisDisclaimer: "ప్రమాదంలో ఉన్నట్లయితే, అత్యవసర సహాయం లెర్న్ మరియు రీచ్ అవుట్ స్క్రీన్‌లలో అందుబాటులో ఉంది.",
    notTherapy: "NilaMind థెరపీ లేదా అత్యవసర సేవ కాదు.",
    exportTitle: "నివేదిక ఎగుమతి",
    exportCsv: "CSV డౌన్‌లోడ్",
    exportPdf: "PDF డౌన్‌లోడ్",
    exportDisclaimer: "NilaMind ద్వారా రూపొందించబడింది \u2014 క్లినికల్ లేదా డయాగ్నస్టిక్ సాధనం కాదు.",
    close: "మూసివేయి",
    loading: "లోడ్ అవుతోంది\u2026",
    seeAll: "అన్నీ చూడు",
    enable: "ప్రారంభించు",
    on: "ఆన్",
    off: "ఆఫ్",
    crisisHeading: "మీరు దీనికోసం వెతికారు. సహాయపడేది ఏదైనా కనుగొందాం.",
    crisisSub: "అది చేయడం ధైర్యమైన పని. మొదట మిమ్మల్ని స్థిరపరచుకోండి, లేదా శిక్షణ పొందిన వినేవారితో మాట్లాడండి.",
    crisisTryFirst: "మొదట వీటిని ప్రయత్నించండి",
    crisisGroundingLabel: "5-4-3-2-1 గ్రౌండింగ్",
    crisisGroundingSub: "ప్రస్తుత క్షణంలో ఉండడానికి మీ చుట్టూ ఉన్నదానిపై దృష్టి పెట్టండి",
    crisisBreathingLabel: "బాక్స్ బ్రీతింగ్ (4-4-4-4)",
    crisisBreathingSub: "మీ నరాల వ్యవస్థను శాంతించేందుకు లయబద్ధమైన శ్వాస",
    crisisSpeakNow: "లేదా ఇప్పుడే ఎవరితోనైనా మాట్లాడండి",
    crisisHelplineNote: "మీ ప్రాంతానికి ఉచిత, రహస్య సహాయ నంబర్లు — సెట్టింగ్‌లలో మార్చండి.",
    crisisCopingPlan: "మీ ఎదుర్కొనే ప్రణాళిక",
    crisisWarnSigns: "1. నేను గమనించే హెచ్చరిక సంకేతాలు:",
    crisisWarnSignsBlank: "ఈ భాగం ఇంకా ఖాళీగా ఉంది — అది సరే. మీరు ఇప్పుడు ఇక్కడ ఉన్నారు, అది ముఖ్యం.",
    crisisInternalCoping: "2. నేను ఒంటరిగా ఎదుర్కోవడానికి చేయగలిగింది:",
    crisisInternalCopingBlank: "ఇక్కడ ఇంకా ఏమీ రాయలేదు — అది సరే.",
    crisisSocial: "3. నన్ను పక్కదారి పట్టించే వ్యక్తులు మరియు ప్రదేశాలు:",
    crisisSocialBlank: "ఇక్కడ ఇంకా ఏమీ లేవు — అది సరే.",
    crisisTrusted: "4. సహాయం కోసం నేను సంప్రదించగల వ్యక్తులు:",
    crisisTrustedBlank: "ఇంకా పేర్లు లేవు — ఇప్పుడు ఒక్కరినైనా సంప్రదించడం సహాయపడుతుంది.",
    crisisProf: "5. నిపుణులు మరియు సంక్షోభ నంబర్లు:",
    crisisSafe: "6. నా ప్రదేశాన్ని సురక్షితంగా మార్చడం:",
    crisisSafeBlank: "ఇక్కడ ఇంకా ఏమీ లేవు — అది సరే.",
    crisisSteadier: "ఇప్పుడు నేను కొంచెం స్థిరంగా ఉన్నాను",
    settingsIntro: "యాప్ ప్రాధాన్యతలు — ప్రకాశవంతమైన లేదా రద్దీ స్క్రీన్‌లు ఎక్కువగా అనిపిస్తే ప్రశాంతమైన \"దృశ్యాలను మృదువుగా చేయి\" మోడ్ కూడా ఉంది.",
    shareTrustedTitle: "నమ్మకమైన వ్యక్తితో షేర్ చేయి",
    shareTrustedSub: "కుటుంబ మద్దతు కోసం వెల్‌నెస్ స్నాప్‌షాట్ రూపొందించు",
    privacyPolicy: "గోప్యతా విధానం",
    privacyPolicySub: "మీ డేటా ఎలా ప్రైవేట్‌గా ఉంటుంది — ఏదీ పరికరం నుండి బయటకు పోదు",
    perfTitle: "పనితీరు మరియు డయాగ్నాస్టిక్స్",
    perfSub: "వెబ్ వైటల్స్, LLM క్యాచ్, క్రాష్ లాగ్ — ఈ పరికరంలో మాత్రమే",
    tool_group_moment: "ఈ క్షణంలో",
    tool_plan_label: "గ్రౌండింగ్ మరియు శ్వాస",
    tool_plan_sub: "కష్టమైన నిమిషంలో మీ శరీరాన్ని శాంతింపజేయండి",
    tool_winddown_label: "నిద్రకు తయారవ్వండి",
    tool_winddown_sub: "ప్రశాంతమైన నిద్రా వేళ దినచర్య — రోజును మూసి స్థిరపడండి",
    tool_reach_out_label: "ఎవరికైనా చేరుకోండి",
    tool_reach_out_sub: "మీరు నమ్మే వ్యక్తికి పంపడానికి సున్నితమైన, సిద్ధమైన సందేశం",
    tool_crisis_rehearsal_label: "సంక్షోభ రిహార్సల్",
    tool_crisis_rehearsal_sub: "అవసరం రాకముందే మీ ప్రణాళికను అభ్యాసం చేయండి",
    tool_relapse_label: "పునరావృత్తి నివారణ ప్రణాళిక",
    tool_relapse_sub: "ప్రతి దశ కోసం ముందుగానే ప్లాన్ చేయండి — ఆకుపచ్చ, నారింజ, ఎరుపు",
    tool_episode_label: "నేను ఎపిసోడ్‌లో ఉన్నాను",
    tool_episode_sub: "ఇప్పుడు దశలవారీగా మార్గనిర్దేశిత మద్దతు",
    tool_group_log: "లాగ్ చేయి & ట్రాక్ చేయి",
    tool_ema_label: "త్వరిత చెక్-ఇన్",
    tool_ema_sub: "ఒక 10-సెకన్ల మూడ్ చెక్, ఇప్పుడు",
    tool_diary_label: "డైరీ",
    tool_diary_sub: "స్వేచ్ఛగా రాసి, మీ ఎంట్రీలను తిరిగి చూడండి",
    tool_assessment_label: "స్క్రీనింగ్‌లు",
    tool_assessment_sub: "PHQ-9, GAD-7 & మరిన్ని కాలక్రమేణా",
    tool_medication_label: "మందులు",
    tool_medication_sub: "డోసులు మరియు పాటింపును ట్రాక్ చేయండి",
    tool_social_rhythm_label: "సామాజిక లయ",
    tool_social_rhythm_sub: "రోజువారీ దినచర్యలను స్థిరంగా ఉంచండి — సమయం వర్సెస్ మూడ్",
    tool_group_skills: "నైపుణ్యాలు & అభ్యాసం",
    tool_problem_solving_label: "సమస్య పరిష్కారం",
    tool_problem_solving_sub: "సమస్యను దశలుగా విభజించి పరిష్కారాన్ని ప్రయత్నించండి",
    tool_values_work_label: "విలువల పని",
    tool_values_work_sub: "ముఖ్యమైనదాన్ని స్పష్టం చేసుకుని మీరు సరిపోయేదాన్ని గమనించండి",
    tool_exposure_label: "ఎక్స్‌పోజర్ హైరార్కీ",
    tool_exposure_sub: "ఒక భయపు మెట్లు తయారు చేయండి — క్రింది నుండి పైకి పని చేయండి",
    tool_group_patterns: "ప్యాటర్న్‌లు",
    tool_behaviour_label: "ఫోన్ ప్యాటర్న్‌లు",
    tool_behaviour_sub: "స్క్రీన్ టైం మరియు నిద్ర వర్సెస్ మూడ్ — పరికరంపై",
    you_group_manage: "నిర్వహించు",
    you_about_nila_label: "నీలా గురించి",
    you_about_nila_sub: "నీలా ఎలా పని చేస్తుంది, గోప్యత, సామర్థ్యాలు మరియు హద్దులు",
    you_dashboard_label: "మీ డాష్‌బోర్డ్",
    you_dashboard_sub: "స్ట్రీక్, మూడ్ & స్కోర్ ట్రెండ్‌లు, ఇటీవలి నీలా",
    you_your_data_label: "మీ డేటా",
    you_your_data_sub: "అన్నీ ఎగుమతి చేయండి, లేదా తొలగించండి — మీ ఇష్టం",
    you_nila_memory_label: "నీలా ఏమి గుర్తుంచుకుంటుంది",
    you_nila_memory_sub: "ఆమె తెలిసినదాన్ని చూడండి, సవరించండి లేదా తొలగించండి",
    you_settings_label: "సెట్టింగ్‌లు",
    you_settings_sub: "వాయిస్, రిమైండర్లు, రికవరీ వాక్యం",
    you_caregiver_label: "నమ్మకమైన వ్యక్తితో షేర్ చేయి",
    you_caregiver_sub: "కుటుంబ మద్దతు కోసం స్నాప్‌షాట్ రూపొందించు",
    you_group_resources: "వనరులు",
    you_thought_record_label: "ఆలోచన రికార్డ్",
    you_thought_record_sub: "CBT రీఫ్రేమింగ్ వర్క్‌బుక్",
    you_learn_label: "నేర్చుకోండి",
    you_learn_sub: "నైపుణ్యాలు, వివరణలు & పరిశోధన — ఒక లైబ్రరీ",
    you_insights_label: "మీ ప్యాటర్న్‌లు",
    you_insights_sub: "నిద్ర, స్క్రీన్ టైం, కదలిక & మూడ్",
    dnd_3_hours: "3 గంటలు",
    dnd_tonight: "ఈ రాత్రి",
    dnd_24_hours: "24 గంటలు",
    dnd_3_days: "3 రోజులు",
    dnd_until_off: "నేను ఆఫ్ చేసే వరకు",
    dnd_title: "క్వైట్ మోడ్",
    dnd_on_aria: "క్వైట్ మోడ్ ఆన్ — మార్చడానికి నొక్కండి",
    dnd_off_aria: "క్వైట్ మోడ్ ఆన్ చేయి",
    dnd_on_note: "క్వైట్ మోడ్ ఆన్‌లో ఉంది — క్లిష్టమైన నడుపులు నిలిపివేయబడ్డాయి.",
    dnd_off_note: "క్లిష్టమైన నడుపులను కొంతకాలం నిలిపివేయి.",
    dnd_turn_off: "క్వైట్ మోడ్ ఆఫ్ చేయి",
    new_conversation: "కొత్త సంభాషణ",
    dash_privacy: "మీ స్థానిక విభాగాలు మీ పరికరంలోనే ఉంటాయి. కాలక్రమేణా మీరు ఎలా ఉన్నారో ఒక చిత్రం.",
    weekly_report: "వారపు నివేదిక",
    this_week: "ఈ వారం",
    your_month: "మీ నెల",
    your_usage: "మీ వినియోగం",
    your_activity: "మీ కార్యాచరణ",
    tracking: "ట్రాకింగ్",
    what_nila_noticed: "నీలా గమనించింది",
    signals_patterns: "సంకేతాలు మరియు నమూనాలు",
    trends_measures: "ట్రెం�డ్లు మరియు కొలతలు",
    episodes_sessions: "ఎపిసోడ్‌లు మరియు సెషన్లు",
    expand_all: "అన్నీ విస్తరించు",
    collapse_all: "అన్నీ కుదించు",
    tracking_summary: "క్షేమ ధోరణి, నీలా గమనించిన నమూనాలు మరియు మీ కార్యక్రమాలు",
    signals_summary: "నిద్ర, దినచర్య, టైపింగ్ మరియు వాయిస్ సంకేతాలు",
    trends_summary: "కాలక్రమేణా మీ మూడ్ ట్రెండ్",
    episodes_summary: "ఎపిసోడ్ చరిత్ర, ఇటీవలి సెషన్లు మరియు లోతైన మూల్యాంకనం",
    hero_title: "ప్రస్తుతం",
    hero_anxious: "మీ మనసు తీరికగా ఉంది. కొన్ని నెమ్మదైన శ్వాసలు సహాయపడతాయి.",
    hero_low: "ప్రస్తుతం ఒక చిన్న, దయార్ద్రమైన అడుగు చాలు.",
    hero_elevated: "రండి, కలిసి దీన్ని నెమ్మదిగా చేద్దాం.",
    hero_calm: "మీరు బాగున్నారు. ఈ లయను కొనసాగించండి.",
    hero_checkin: "చెక్ ఇన్",
    hero_breathe: "3-నిమిషాల శ్వాస",
    hero_gentle: "మృదువైన చెక్-ఇన్",
    days_logged: "రోజులు నమోదు చేయబడ్డాయి",
    nila_chats_7d: "నీలా చాట్‌లు (7రోజులు)",
    usage_checkins: "చెక్-ఇన్‌లు",
    usage_programs: "పూర్తి చేసిన ప్రోగ్రామ్‌లు",
    usage_assessments: "అసెస్‌మెంట్‌లు",
    usage_features: "ఉపయోగించిన ఫీచర్‌లు",
    narr_tracking_month: "ఈ నెల {word} లా అనిపించింది. ",
    narr_tracking_notices_one: "నీలా లోపల చూడటానికి 1 ప్యాటర్న్‌ను గమనించింది.",
    narr_tracking_notices_many: "నీలా లోపల చూడటానికి {notices} ప్యాటర్న్‌లను గమనించింది.",
    narr_tracking_none: "ఈ కాలంలో కొత్త ప్యాటర్న్‌లు ఏవీ గుర్తించబడలేదు — స్థిరంగా ఉండటం మంచిదే.",
    narr_signals_one: "1 బ్యాక్‌గ్రౌండ్ సిగ్నల్ అమ్మకంగా దిగువన ట్రాక్ చేయబడుతోంది.",
    narr_signals_many: "{count} బ్యాక్‌గ్రౌండ్ సిగ్నల్‌లు అమ్మకంగా దిగువన ట్రాక్ చేయబడుతున్నాయి.",
    narr_signals_none: "ప్రస్తుతం నివేదించడానికి బ్యాక్‌గ్రౌండ్ సిగ్నల్‌లు ఏవీ లేవు.",
    narr_episodes_e_one: "రికార్డులో 1 ఎపిసోడ్",
    narr_episodes_e_many: "రికార్డులో {episodes} ఎపిసోడ్‌లు",
    narr_episodes_none_e: "ఎపిసోడ్‌లు ఏవీ రికార్డ్ చేయబడలేదు",
    narr_episodes_s_one: "1 ఇటీవలి నీలా సెషన్‌తో.",
    narr_episodes_s_many: "{sessions} ఇటీవలి నీలా సెషన్‌లతో.",
    narr_streak_first: "మీరు సిద్ధమైనప్పుడు — మీ మొదటి చెక్-ఇన్ ఇక్కడే మొదలవుతుంది.",
    narr_streak_welcome: "తిరిగి స్వాగతం — ఒత్తిడి ఏమీ లేదు. మీరు ఉన్న చోటు నుంచే కొనసాగిస్తాం.",
    narr_streak_milestone: "{milestone} రోజులు మీ కోసం ముందుకు వచ్చారు. అది ముఖ్యమైనది.",
    narr_streak_active_multi: "వరుసగా {current} రోజులు. నిదానంగా చేశారు.",
    narr_streak_active_one: "నేడు చెక్-ఇన్ చేశారు. అది లెక్కవేస్తుంది.",
    narr_streak_safe: "మీ స్ట్రీక్ ఈరోజు సురక్షితంగా ఉంది — ఎప్పుడైనా చెక్-ఇన్ దాన్ని కొనసాగిస్తుంది, తింటే ఏమీ లేదు.",
    narr_streak_small: "అవసరమైనప్పుడు ఒక చిన్న చెక్-ఇన్ చాలు.",
    narr_mood_none: "ఈ వారం ఇంకా చెక్-ఇన్‌లు ఏవీ లేవు — ఒక ట్యాప్ మూడ్ కూడా మీ ట్రెండ్‌లను పెంచుతుంది.",
    narr_mood_base_only: "ఈ వారం మీ ఒత్తిడి సగటున {avg}/10. వారం వారం పోల్చడానికి లాగింగ్ కొనసాగించండి.",
    narr_mood_same: "ఈ వారం మీ ఒత్తిడి సగటున {avg}/10 — గత వారంలానే.",
    narr_mood_down: "ఈ వారం మీ ఒత్తిడి సగటున {avg}/10 — గత వారం కంటే {delta} తక్కువ. అది నిజమైన మెరుగుదల.",
    narr_mood_up: "ఈ వారం మీ ఒత్తిడి సగటున {avg}/10 — గత వారం కంటే {delta} ఎక్కువ. మీతో సౌమ్యంగా ఉండండి; కష్టమైన దశలు కూడా వస్తాయి.",
    see_all_sessions: "అన్ని {n} సెషన్లను చూడండి",
    see_less: "తక్కువ చూపించు",
    no_signals_yet: "ప్రస్తుతం హెచ్చరించడానికి ఏమీ లేదు — అది మంచి విషయం. నీలా నమూనాలపై మౌనంగా దృష్టి పెడుతుంది, ఏదైనా మారితే ప్రేమగా చెబుతుంది.",
    no_sessions_yet: "ఇంకా ఇటీవలి నీలా సెషన్లు ఏమీ లేవు. మీరు నీలాతో మాట్లాడినప్పుడల్లా, ఒక మౌన స్నాప్షాట్ ఇక్కడే ఉంటుంది — మీ పరికరంలో, ఎప్పుడూ పంచబడదు.",
    sec_appearance: "రూపు",
    sec_voice: "ప్రశాంతమైన స్వరం",
    sec_reminders: "మృదువైన రిమైండర్లు",
    sec_ema: "త్వరిత చెక్-ఇన్‌లు",
    sec_notif_types: "నోటిఫికేషన్ రకాలు",
    sec_inflection: "నీలా నుండి మృదువైన నడుపులు",
    sec_passive_sensing: "పాసివ్ సెన్సింగ్",
    sec_passive_sensing_sub: "మీ పరికరం చలనాన్ని عامًا పాలcardia ద్వారా మీ రోజുമర్ర నియమాల్లో మార్పులను సూక్ష్మంగా గుర్తించండి. డేటా మీ పరికరం నుండి வெளியelligenceOutside. డిఫాల్ట్‌గా Dense.",
    pi_enable_label: "నీలా మార్పులను గమనించడానికి అనుమతించండి",
    pi_enable_sub: "సక్రియమైతే, నీలా మీ దినచర్య నియమంలో సూక్ష్మ మార్పులను గమనించి మీకు వేచ్-ఇన్ చేయడానికి లేదా ప్రాటోకాల్ ప్రయత్నించడానికి మ 交通 COAX.",
    pi_extractions: "నిర్వహణలు",
    pi_no_sources: "మూలాలు లేవు",
    pi_last_extraction: "చివరి నిష్క krozేషన్",
    pi_never: "ఎప్పటికీ లేదు",
    pi_delete_data: "పాసివ్ సెన్సింగ్ డేటా తొలగించండి",
    pi_delete_sub: "మీ పరికరం నుండి సమస్త చలన డేటాను తొలగించండి",
    pi_delete_confirm: "అన్ని پاسివ్ సెన్సింగ్ డేటాను తొలగించాలా? ఇది మricane.",
    sec_health_connect: "హెల్త్ కనెక్ట్ నుండి నిద్ర",
    sec_on_device: "నీలా మీ పరికరంపై నడుస్తుంది",
    sec_identity: "ఖాతా & రికవరీ",
    sec_privacy_lock: "ప్రైవసీ లాక్",
    sec_feedback: "ఫీడ్‌బ్యాక్ & గురించి",
    sec_legal: "చట్టపరమైన — నియమాలు & లైసెన్స్‌లు",
    sec_legalSub: "గోప్యతా విధానం, సేవా షరతులు, మరియు ఓపెన్-సోర్స్ లైసెన్స్‌లు",
    sec_cloud_api: "ఐచ్ఛిక క్లౌడ్ API",
    sec_cloud_apiSub: "క్లౌడ్ మోడల్ కోసం మీ API కీని కనెక్ట్ చేయండి (సందేశాలు మీ పరికరం నుండి బయటకు వెళ్తాయి)",
    sec_region: "సంక్షోభ లైన్‌లు & ప్రాంతం",
    sec_pilot: "పరిశోధన పైలట్",
    cloud_api_provider_label: "ప్రదాత",
    cloud_api_groq_recommended: "Groq (సిఫార్సు చేయబడింది)",
    cloud_api_custom_label: "అనుకూల (OpenAI-అనుకూల)",
    cloud_api_status_active: "క్లౌడ్ మోడల్ చురుకుగా ఉంది",
    cloud_api_status_disabled: "నిలిపివేయబడింది — ఆన్-డివైస్ మాత్రమే (సిఫార్సు చేయబడింది).",
    cloud_api_get_key_label: "మీ ఉచిత Groq API కీని పొందండి",
    cloud_api_get_key_label_custom: "మీ ఉచిత Google AI Studio (Gemini) API కీని పొందండి",
    cloud_api_groq_key_label: "Groq API కీ",
    cloud_api_groq_key_placeholder: "gsk_…",
    cloud_api_groq_key_hint_empty: "మీ కీ ఈ పరికరంలోనే ఉంటుంది. Groq కీలు gsk_ తో ప్రారంభమవుతాయి.",
    cloud_api_groq_key_hint_ok: "✓ ఇది Groq కీ లాగా కనిపిస్తోంది.",
    cloud_api_openai_key_hint: "మీ కీ ఈ పరికరంలోనే ఉంటుంది.",
    cloud_api_advanced_label: "అధునాతన",
    cloud_api_endpoint_label: "ఎండ్‌పాయింట్",
    cloud_api_endpoint_hint_groq: "Groq యొక్క OpenAI-అనుకూల ఉపరితలం డిఫాల్ట్. కస్టమ్ ఎండ్‌పాయింట్ ద్వారా ప్రాక్సీ చేస్తే మాత్రమే దాన్ని భర్తీ చేయండి.",
    cloud_api_endpoint_hint_custom: "ఏదైనా OpenAI-అనుకూల ఎండ్‌పాయింట్ (OpenAI, Together, Fireworks, స్వీయ-హోస్ట్ ప్రాక్సీ). NilaMind డిఫాల్ట్‌గా Groq ను సిఫారసు చేస్తుంది.",
    cloud_api_model_label: "మోడల్",
    cloud_api_model_hint_groq: "ఏదైనా Groq మోడల్ ఐడి పనిచేస్తుంది. డిఫాల్ట్: llama-3.1-8b-instant (వేగవంతమైన & సమర్థమైన).",
    cloud_api_model_hint_custom: "OpenAI లో డిఫాల్ట్: gpt-3.5-turbo.",
    cloud_api_model_custom_option: "అనుకూల మోడల్ ఐడి…",
    cloud_api_privacy_groq: "క్లౌడ్ API ప్రారంభించబడినప్పుడు, మీ చాట్ మరియు వాయిస్-కాల్ సందేశాలు (మరియు Nila యొక్క ప్రతిస్పందనలు) మీ పరికరం నుండి నేరుగా Groq కి వెళ్తాయి. Groq యొక్క గోప్యతా నోటీస్ ప్రకారం, వారు మీ డేటాతో శిక్షణ పొందరు మరియు ప్రతిస్పందన తర్వాత సమర్పించిన కంటెంట్‌ను ఉంచరు.",
    cloud_api_privacy_generic: "క్లౌడ్ API ప్రారంభించబడినప్పుడు, మీ చాట్ మరియు వాయిస్-కాల్ సందేశాలు (మరియు Nila యొక్క ప్రతిస్పందనలు) మీ పరికరం నుండి నేరుగా మీరు కాన్ఫిగర్ చేసిన ఎండ్‌పాయింట్‌కు వెళ్తాయి. మిగతావన్నీ మీ ఫోన్‌లో ఉంటాయి.",
    you_wellbeing_label: "కాలక్రమంలో శ్రేయస్సు",
    you_wellbeing_sub: "మీ దీర్ఘకాలిక ధోరణి",
    wellbeing_screen_intro: "మీరు ఎలా ఉన్నారో ప్రతి పక్షానికి ఒకసారి చెక్ చేయండి. ఏక రోజు కంటే దీర్ఘకాలిక దృష్టి ముఖ్యం.",
    wellbeing_take: "2-వారాల చెక్ తీసుకోండి",
    wellbeing_due_title: "మీ పాక్షిక శ్రేయస్సు చెక్ డ్యూ అయ్యింది",
    wellbeing_due_sub: "2 నిమిషాల చెక్ దీర్ఘకాలిక దృష్టిని చూపుతుంది, రోజువారీ హెచ్చుతగ్గులను కాదు.",
    wellbeing_baseline_title: "మీ శ్రేయస్సు బేస్‌లైన్‌ను సెట్ చేయండి",
    wellbeing_baseline_sub: "ఇప్పుడు 2 నిమిషాల చెక్ మీకు ఒక ప్రారంభ బిందువును ఇస్తుంది — తర్వాతి చెక్‌లు ధోరణిని చూపగలవు.",
    wellbeing_next_due_prefix: "తదుపరి చెక్",
    wellbeing_days: "రోజులలో",
    wellbeing_due_now: "ఇప్పుడు డ్యూ",
    wellbeing_none: "ఇంకా చెక్‌లు లేవు — మొదటిది తీసుకోండి.",
    wellbeing_improving: "మెరుగుపడుతోంది",
    wellbeing_deteriorating: "తగ్గుతోంది",
    wellbeing_steady: "స్థిరం",
    you_episode_marker_label: "ఎపిసోడ్ మార్కర్లు",
    you_episode_marker_sub: "కాలక్రమంలో మూడ్ దశలను ట్రాక్ చేయండి",
    em_intro: "మీ మూడ్ ఎలా ఉందో సమయ వ్యవధిగా గుర్తించండి — ఉత్సాహం, నిరాశ, మిశ్రమం, లేదా స్థిరం. కాలక్రమంలో ఒక ప్యాటర్న్, నిర్ధారణ కాదు.",
    em_add_marker: "మార్కర్ జోడించండి",
    em_phase: "దశ",
    em_from: "నుండి",
    em_to: "వరకు",
    em_note_optional: "నోట్ (ఐచ్ఛికం)",
    em_save: "మార్కర్ సేవ్ చేయండి",
    em_current: "ప్రస్తుత కాలం",
    em_none: "ఇంకా మార్కర్లు లేవు — మొదటిది జోడించండి.",
    em_past: "గత మార్కర్లు",
    em_phase_elevated: "ఉత్సాహం",
    em_phase_depressed: "నిరాశ",
    em_phase_mixed: "మిశ్రమం",
    em_phase_stable: "స్థిరం",
    you_caregiver_settings_label: "సంరక్షకుని సెట్టింగ్‌లు",
    you_caregiver_settings_sub: "నమ్మకమైన పరిచయాలు మరియు షేరింగ్‌ని నిర్వహించండి",
    cg_add_contact: "నమ్మకమైన వ్యక్తిని జోడించండి",
    cg_name: "పేరు",
    cg_phone_or_email: "ఫోన్ లేదా ఇమెయిల్",
    cg_relationship: "సంబంధం (ఐచ్ఛికం)",
    cg_remove: "తొలగించు",
    cg_share_categories: "ఏమి షేర్ చేయాలి",
    cg_category_mood: "మూడ్ ధోరణి",
    cg_category_phase: "దశ మార్కర్లు",
    cg_category_sleep: "నిద్ర విధానం",
    cg_category_medication: "మందుల పాటింపు",
    cg_category_wellbeing: "శ్రేయస్సు ధోరణి",
    cg_category_checkins: "చెక్-ఇన్ ఫ్రీక్వెన్సీ",
    cg_auto_alert: "ఆటో-అలర్ట్ థ్రెషోల్డ్",
    cg_auto_alert_desc: "కష్టపడుతుంటే షేర్ చేయడానికి గుర్తు చేయి",
    cg_threshold_days: "వరుస రోజులు",
    cg_min_intensity: "కనీస తీవ్రత (1–10)",
    cg_preview: "స్నాప్‌షాట్ ముందస్తు వీక్షణ",
    cg_no_contacts: "ఇంకా నమ్మకమైన పరిచయాలు లేవు",
    cg_consent_title: "షేర్ చేయడానికి ముందు",
    cg_consent_body: "ఇది మీ నమ్మకమైన వ్యక్తితో వెల్‌నెస్ స్నాప్‌షాట్‌ని షేర్ చేస్తుంది. వారు Nilaతో మీ వ్యక్తిగత సంభాషణలను చూడలేరు — మీరు క్రింద ఎంచుకున్న వర్గాలు మాత్రమే.",
    cg_save: "ప్రాధాన్యతలను సేవ్ చేయి",
    cg_alert_nudge: "వెల్‌నెస్ అప్‌డేట్ షేర్ చేయండి",
    cg_alert_reason: "మీకు కష్టమైన రోజులు — మీ సంరక్షకుడు తెలుసుకోవాలనుకోవచ్చు",
    // Phase 20.9 — clinician report (Telugu)
    cr_coverTitle: "NilaMind క్లినిషియన్ సారాంశం",
    cr_execSummary: "సంక్షిప్త సారాంశం",
    cr_checkins: "చెక్-ఇన్‌లు",
    cr_sleep: "నిద్ర మరియు సర్కాడియన్ రిథం",
    cr_screenings: "స్క్రీనింగ్ ట్రాజెక్టరీలు",
    cr_medications: "మందుల పాటింపు",
    cr_episodes: "ఎపిసోడ్ లాగ్",
    cr_phaseMarkers: "బైపోలర్ ఫేజ్ మార్కర్లు (స్వ-లాగ్)",
    cr_diaryCard: "DBT డైరీ కార్డ్ సారాంశం",
    cr_safetyPlan: "భద్రతా ప్రణాళిక (Stanley-Brown)",
    cr_relapsePlan: "రిలాప్స్ నివారణ ప్రణాళిక",
    cr_connections: "సామాజిక సంబంధం",
    cr_supports: "మద్దతు సారాంశం",
    cr_voiceSignal: "వాయిస్ సిగ్నల్",
    cr_whatHelped: "ఏమి సహాయపడింది (ఇటీవలి అంతర్దృష్టులు)",
    cr_whatDidntHelp: "ఏమి సహాయపడలేదు (స్వ-నివేదిక)",
    cr_doseChanges: "మందుల మోతాదు మార్పులు",
    cr_sideEffects: "సైడ్ ఎఫెక్ట్ వ్యవధి",
    cr_thoughtRecords: "థాట్ రికార్డ్ సారాంశం",
    cr_wellbeing: "వెల్‌బీయింగ్ ట్రాజెక్టరీ (WHO-5)",
    cr_correlation: "నిద్ర-మూడ్ సంబంధం",
    cr_triggerContext: "ట్రిగర్ మరియు సందర్భ నమూనాలు",
    cr_eventTimeline: "సంఘటన టైమ్‌లైన్",
    cr_engagement: "నిశ్చయం",
    cr_disclaimer: "NilaMind ద్వారా రూపొందించబడింది — క్లినికల్ లేదా నిర్ధారణ సాధనం కాదు. సమాచార ఉద్దేశ్యాలకు మాత్రమే.",
    cr_redactTitle: "చేర్చడానికి ఏమి ఎంచుకోవాలో",
    cr_redactMinimal: "కనీసం (స్క్రీనింగ్ + భద్రతా ప్రణాళిక మాత్రమే)",
    cr_redactFull: "పూర్తి (అన్నీ)",
    cr_visitNote: "తదుపరి సందర్శన కోసం నోట్స్",
    cr_visitNotePrompt1: "గుర్తుంచుకోవలసిన టాప్ 3 విషయాలు",
    cr_visitNotePrompt2: "అడగాలనుకునే ప్రశ్నలు",
    cr_visitNotePrompt3: "గత సందర్శన నుండి ఏమి మారింది",
    cr_consentTitle: "ఎగుమతిని ధృవీకరించండి",
    cr_consentBody: "ఇది నా సొంత సందర్శన కోసం నా స్వ-నివేదిక అని నేను ధృవీకరిస్తున్నాను. ఈ పరికరంలో ఉన్న డేటా నాది. NilaMind ఈ ఫైల్‌ను పరికరంలోనే సృష్టించింది మరియు దాన్ని చూడలేదు.",
    // Proactive Agent (Phase 23)
    pi_card_sleep_pattern: "నిద్రా môdల మార్పు",
    pi_card_activity_shift: "ప్రారంభిక వ్యవస్థ మార్పు",
    pi_card_circadian_insight: "సర్కాడియన్ రిథమ్ అంతర్దృష్టి",
    pi_card_typing_pattern: "టైపింగ్ నమూనా మార్పు",
    pi_card_resilience: "రాక్షణా నమూనలు కనిపించాయి",
    pi_card_phase_shift: "సంభావ్యఫేజ్ మార్పు",
    pi_card_routine_disruption: "రోజింటి మూడత",
    pi_card_connection_dip: "సామాజిక సంప్రదింపు తగ్గింపు",
    pi_card_protective: "లచితતા సంకేతాలు",
    pi_card_body: "నిల ఈ వారం మీ రిథమ్స్‌లో ఒక నమూన.cancelled近年来发现了一个模式。",
    pi_nudge_sleep: "మీ నిద్రా నమూనా మారిపోయింది — ایک सौम్య చెక్-ఇన్ విలువpañía.",
    pi_nudge_activity: "ప్రారంభిక స్థరాలు మార్డాయి — మీరు ఎలా అనుభవిస్తున్నారు?",
    pi_nudge_circadian: "మీ రోజువారి రిథమ్ ఇటీవలి ਸਮయంలో ఎక్కువ ద్వయరూపంగా ఉంది.",
    pi_nudge_typing: "మీ టైపింగ్ నమూనాలు మార్డాయి — చెక్-ఇన్ చేయాలనుకుంటున్నారా?",
    pi_nudge_phase: "సంభావ్య మూడ్ మార్పు గుర్తించబడింది — ਇੱਕ వేగమైన చెక్-ఇన్ సహాయపడుతుంది.",
    pi_nudge_routine: "మీ రోజుపfernandoception着断层 — 你想稳定它吗？",
    pi_nudge_connection: "మీరు последнее में कम जुड़ रहे हैं — कोई दबाव नहीं, बस ध्यान दे रहे हैं।",
    pi_action_checkin: "చెక్-ఇన్",
    pi_action_winddown: "వינ్డ్-డౌన్",
    pi_action_diary: "రోజును లాగ్ చేయండి",
    pi_action_assessment: "స్క్రీన్ తీసుకోండి",
    pi_action_protocol: "ప్రొటోకాల్ ప్రయత్నించండి",
    pi_dismiss: "ఇప్పుడు కాదు",
  },
};

export function getLanguage(): SupportedLang {
  try {
    const raw = ls()?.getItem(STORAGE_KEY);
    if (raw && raw in DICT) return raw as SupportedLang;
  } catch { /* ignore */ }
  return "en";
}

export const LANGUAGE_CHANGED_EVENT = "nilaLanguageChanged";

export function setLanguage(lang: SupportedLang): void {
  try { ls()?.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  // audit 2.23 — notify the app so t()-driven strings re-render immediately (previously nothing re-rendered
  // on a language switch, so the change appeared to do nothing until an unrelated re-render).
  try { if (typeof window !== "undefined") window.dispatchEvent(new Event(LANGUAGE_CHANGED_EVENT)); } catch { /* ignore */ }
}

/** Translate a key. Falls back to English, then to the key itself. */
export function t(key: I18nKey, lang: SupportedLang = getLanguage()): string {
  return DICT[lang]?.[key] ?? DICT.en[key] ?? key;
}

/**
 * Translate a key and substitute `{name}` tokens from `vars`. Used only for the few dashboard
 * band narratives that must embed a count or word inside a localized sentence (the plain `t`
 * intentionally forbids interpolation). Tokens are replaced verbatim — no formatting, no HTML.
 * Falls back to English if the key is missing for the requested language.
 */
export function tn(
  key: I18nKey,
  lang: SupportedLang,
  vars: Record<string, string | number>,
): string {
  const template = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m,
  );
}

/** Convenience hook-free getter for components that read language on mount/render. */
export function currentLanguage(): SupportedLang {
  return getLanguage();
}

/**
 * React hook that re-renders the calling component whenever the app language changes,
 * so any t()-driven string updates live. Components that render localized text MUST call
 * this (directly or via a parent) so a language switch is reflected immediately.
 */
export function useLanguage(): SupportedLang {
  const [lang, setLang] = useState<SupportedLang>(getLanguage());
  useEffect(() => {
    const handler = () => setLang(getLanguage());
    if (typeof window !== "undefined") {
      window.addEventListener(LANGUAGE_CHANGED_EVENT, handler);
      return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, handler);
    }
  }, []);
  return lang;
}
