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
  | "tool_group_calm"
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
  | "you_progress_label"
  | "you_progress_sub"
  | "achievements_title"
  | "achievements_empty"
  | "milestones_title"
  | "milestones_body"
  | "streak_milestone_reached"
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
  | "mood_avg_7d"
  | "from_last_week"
  | "avg_sleep"
  | "days_active"
  | "streak"
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
  | "hero_crisis"
  | "hero_crisis_label"
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
  | "monthly_word_calm"
  | "monthly_word_steady"
  | "monthly_word_choppy"
  | "monthly_word_rough"
  | "narr_tracking_body"
  | "emotion_calm"
  | "emotion_anxious"
  | "emotion_sad"
  | "emotion_angry"
  | "emotion_hopeful"
  | "pacing_strong"
  | "pacing_good"
  | "pacing_keep"
  | "quiet_step_away"
  | "dismiss"
  | "no_signals_title"
  | "no_sessions_title"
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
  | "pi_dismiss"
  // Error display
  | "error_default_title"
  | "warning_default_title"
  | "info_default_title"
  | "dismiss_error"
  // EMA
  | "ema_how_are_you"
  | "ema_energy"
  | "ema_valence_very_bad"
  | "ema_valence_bad"
  | "ema_valence_neutral"
  | "ema_valence_good"
  | "ema_valence_very_good"
  | "ema_energy_very_low"
  | "ema_energy_low"
  | "ema_energy_moderate"
  | "ema_energy_high"
  | "ema_note_placeholder"
  // Secure gate
  | "gate_error_title"
  | "gate_error_body"
  | "gate_try_again"
  | "gate_securing"
  | "gate_pin_error"
  | "gate_welcome_back"
  | "gate_unlock_body"
  | "gate_pin_placeholder"
  | "gate_unlock"
  | "gate_privacy_note"
  // Message feedback
  | "msg_feedback_toggle"
  | "msg_thanks_feedback"
  | "msg_feedback_prompt"
  | "msg_feedback_placeholder"
  | "msg_not_now"
  | "msg_share"
  // Learn
  | "learn_badge_skill"
  | "learn_badge_explainer"
  | "learn_badge_research"
  | "learn_title"
  | "learn_subtitle"
  | "learn_crisis_heading"
  | "learn_crisis_dismiss"
  | "learn_support_cta"
  | "learn_hard_moment"
  | "learn_hard_moment_sub"
  | "learn_for_feeling"
  | "learn_search_placeholder"
  | "learn_filter_all"
  | "learn_filter_all_skills"
  | "learn_results_count"
  | "learn_loading"
  | "learn_no_results"
  | "learn_footer_disclaimer"
  | "learn_what_it_is"
  | "learn_why_it_helps"
  | "learn_the_research"
  | "learn_reference_verifying"
  | "learn_reference_verifying_hint"
  // Reach out
  | "reach_title"
  | "reach_subtitle"
  | "reach_crisis_heading"
  | "reach_crisis_body"
  | "reach_your_kept_message"
  | "reach_send_anyway"
  | "reach_copy"
  | "reach_back_to_writing"
  | "reach_need_support"
  | "reach_start_with"
  | "reach_write_own"
  | "reach_message_placeholder"
  | "reach_send"
  | "reach_footer_advice"
  // Identity onboarding
  | "id_welcome_title"
  | "id_welcome_body"
  | "id_create_new"
  | "id_restore_phrase"
  | "id_save_phrase_title"
  | "id_save_phrase_body"
  | "id_copy_phrase"
  | "id_copied"
  | "id_phrase_warning"
  | "id_phrase_confirmed"
  | "id_enter_nila"
  | "id_restore_title"
  | "id_restore_body"
  | "id_restore_placeholder"
  | "id_restore_backup_label"
  | "id_restore_backup_placeholder"
  | "id_restore_button"
  | "id_error_create"
  | "id_error_invalid_phrase"
  | "id_error_backup_read"
  | "id_error_restore"
  // You screen
  | "you_elevated_hint"
  | "you_elevated_label"
  | "you_anxious_hint"
  | "you_anxious_label"
  | "you_low_hint"
  | "you_low_label"
  | "you_night_hint"
  | "you_night_label"
  | "you_evening_hint"
  | "you_evening_label"
  | "you_welcome_checkin_step"
  | "you_welcome_checkin_desc"
  | "you_welcome_intention_step"
  | "you_welcome_intention_desc"
  | "you_welcome_dashboard_step"
  | "you_welcome_dashboard_desc"
  | "you_welcome_title"
  | "you_welcome_body"
  | "you_badge_on_device"
  | "you_badge_crisis"
  | "you_streak_this_week"
  | "you_mostly"
  | "you_fallback_emotion"
  | "you_heavy_encouragement"
  | "you_data_error"
  | "you_intention_title"
  | "you_intention_done"
  | "you_intention_clear"
  | "you_intention_set_label"
  | "you_intention_set_desc"
  | "you_intention_picker_title"
  | "you_intention_picker_helper"
  | "you_intention_placeholder"
  | "you_nudge_title"
  | "you_nudge_checkin"
  | "you_nudge_diary"
  | "you_fewer_resources"
  | "you_more_resources"
  | "you_footer_disclaimer"
  // Thought record
  | "tr_subtitle"
  | "tr_step_of"
  | "tr_step1_title"
  | "tr_step1_question"
  | "tr_step1_placeholder"
  | "tr_step2_title"
  | "tr_step2_question"
  | "tr_step2_placeholder"
  | "tr_step2_intensity"
  | "tr_step3_title"
  | "tr_step3_question"
  | "tr_step3_placeholder"
  | "tr_step3_belief"
  | "tr_spot_looking"
  | "tr_spot_traps"
  | "tr_step4_title"
  | "tr_step4_instruction"
  | "tr_step4_active"
  | "tr_step5_title"
  | "tr_step5_question"
  | "tr_step5_placeholder"
  | "tr_step5_reenable"
  | "tr_step5_asking"
  | "tr_step5_ask_nila"
  | "tr_step5_crisis_heading"
  | "tr_step5_rerate"
  | "tr_success_message"
  | "tr_btn_back"
  | "tr_btn_continue"
  | "tr_btn_saved"
  | "tr_btn_complete"
  | "tr_no_traps"
  | "tr_empty_error"
  | "tr_nil_fail"
  | "tr_trap_all_or_nothing"
  | "tr_trap_all_or_nothing_desc"
  | "tr_trap_catastrophising"
  | "tr_trap_catastrophising_desc"
  | "tr_trap_mind_reading"
  | "tr_trap_mind_reading_desc"
  | "tr_trap_fortune_telling"
  | "tr_trap_fortune_telling_desc"
  | "tr_trap_emotional_reasoning"
  | "tr_trap_emotional_reasoning_desc"
  | "tr_trap_should_statements"
  | "tr_trap_should_statements_desc"
  | "tr_trap_labelling"
  | "tr_trap_labelling_desc"
  | "tr_trap_personalisation"
  | "tr_trap_personalisation_desc"
  | "tr_trap_mental_filter"
  | "tr_trap_mental_filter_desc"
  | "tr_trap_magnification"
  | "tr_trap_magnification_desc"
  // Episode Support
  | "ep_here"
  | "ep_opening_body"
  | "ep_opening_question"
  | "ep_placeholder"
  | "ep_start"
  | "ep_offline_note"
  | "ep_end_session"
  | "ep_live_badge"
  | "ep_not_therapist"
  | "ep_crisis_tap"
  | "ep_shielding"
  | "ep_return_home"
  | "ep_intensity_prompt"
  | "ep_chat_placeholder"
  | "ep_send"
  | "ep_escalation_title"
  | "ep_escalation_body"
  | "ep_escalation_keep"
  | "ep_guided_title"
  | "ep_guided_badge"
  | "ep_guided_init_body"
  | "ep_guided_intensity"
  | "ep_tipp_title"
  | "ep_tipp_body"
  | "ep_tipp_done"
  | "ep_medium_question"
  | "ep_medium_racing"
  | "ep_medium_harm"
  | "ep_medium_shame"
  | "ep_panic_title"
  | "ep_panic_body"
  | "ep_panic_done"
  | "ep_harm_title"
  | "ep_harm_body"
  | "ep_harm_done"
  | "ep_shame_title"
  | "ep_shame_body"
  | "ep_shame_proceed"
  | "ep_low_body"
  | "ep_low_done"
  | "ep_debrief1_title"
  | "ep_debrief1_sub"
  | "ep_debrief1_trigger"
  | "ep_debrief1_placeholder"
  | "ep_debrief1_skip"
  | "ep_debrief1_save"
  | "ep_debrief2_title"
  | "ep_debrief2_sub"
  | "ep_debrief2_prompt"
  | "ep_debrief2_continue"
  | "ep_debrief3_title"
  | "ep_debrief3_sub"
  | "ep_debrief3_when_started"
  | "ep_debrief3_highest"
  | "ep_debrief3_final"
  | "ep_saved_title"
  | "ep_saved_body"
  | "ep_saved_done"
  | "ep_synthetic_logged"
  | "ep_synthetic_user"
  | "ep_synthetic_initial"
  | "ep_synthetic_reprompt"
  // Exposure Hierarchy
  | "ex_crisis_title"
  | "ex_crisis_body"
  | "ex_crisis_back"
  | "ex_close"
  | "ex_subtitle"
  | "ex_completed"
  | "ex_avg_suds"
  | "ex_celebrate"
  | "ex_complete_step"
  | "ex_suds_after"
  | "ex_reflect_prompt"
  | "ex_learned_placeholder"
  | "ex_save"
  | "ex_cancel"
  | "ex_reflection_note"
  | "ex_suds_label"
  | "ex_complete_btn"
  | "ex_no_steps"
  | "ex_step_placeholder"
  | "ex_suds_slider"
  | "ex_add_step"
  | "ex_title"
  | "ex_body"
  | "ex_hierarchy_name"
  | "ex_confirm_remove"
  | "ex_confirm_message"
  | "ex_remove"
  | "ex_keep"
  ;

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
    error_default_title: "Something went wrong",
    warning_default_title: "Heads up",
    info_default_title: "Information",
    dismiss_error: "Dismiss",
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
    perfSub: "Web vitals, model cache, crash log — on this device only",
    tool_group_moment: "In the moment",
    tool_group_calm: "Calm",
    tool_plan_label: "Breathing & Grounding",
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
    you_progress_label: "Your progress",
    you_progress_sub: "Streaks, milestones, and what you've earned",
    achievements_title: "Achievements",
    achievements_empty: "Small steps count. Your first check-in earns your first badge.",
    milestones_title: "Streak milestones",
    milestones_body: "Every 3, 7, 14, 30, 60, and 100 days of showing up is worth celebrating.",
    streak_milestone_reached: "Milestone reached — be gentle and proud of showing up.",
    you_nila_memory_label: "What Nila remembers",
    you_nila_memory_sub: "See, edit, or delete what she knows",
    you_settings_label: "Settings",
    you_settings_sub: "Voice, reminders, recovery phrase",
    you_caregiver_label: "Share with a trusted person",
    you_caregiver_sub: "Build a snapshot for family support",
    you_group_resources: "External resources",
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
    mood_avg_7d: "Mood average (7 days)",
    from_last_week: "from last week",
    avg_sleep: "Avg sleep",
    days_active: "Days active",
    streak: "Streak",
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
    hero_crisis: "You're not alone in this. Let's get you to support right now.",
    hero_crisis_label: "Get support",
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
    monthly_word_calm: "calm",
    monthly_word_steady: "steady",
    monthly_word_choppy: "choppy",
    monthly_word_rough: "rough",
    narr_tracking_body: "This month has felt {word}, with mood averaging {avg}/10 ({min}-{max}). You've felt most often {emotion}. You've checked in {days}/{total} days — {pacing}.",
    emotion_calm: "peaceful moments",
    emotion_anxious: "worried thoughts",
    emotion_sad: "low feelings",
    emotion_angry: "frustrated moments",
    emotion_hopeful: "optimistic sparks",
    pacing_strong: "strong consistency this month!",
    pacing_good: "good momentum building.",
    pacing_keep: "every check-in adds clarity — keep going.",
    quiet_step_away: "You've been here {mins} minutes. If your mind is busy, a short break or a slow breath can help more than more screen. No rush — Nila will be here.",
    dismiss: "Dismiss",
    no_signals_title: "All quiet on the signals front",
    no_sessions_title: "Your conversations with Nila",
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
    // EMA
    ema_how_are_you: "How are you right now?",
    ema_energy: "Energy level",
    ema_valence_very_bad: "Very bad",
    ema_valence_bad: "Bad",
    ema_valence_neutral: "Neutral",
    ema_valence_good: "Good",
    ema_valence_very_good: "Very good",
    ema_energy_very_low: "Very low",
    ema_energy_low: "Low",
    ema_energy_moderate: "Moderate",
    ema_energy_high: "High",
    ema_note_placeholder: "Add a note — what's on your mind?",
    // Secure gate
    gate_error_title: "Authentication error",
    gate_error_body: "Your data stayed on device, but we couldn't read it securely. Try again.",
    gate_try_again: "Try again",
    gate_securing: "Securing your data…",
    gate_pin_error: "Wrong PIN — try again.",
    gate_welcome_back: "Welcome back",
    gate_unlock_body: "Enter your PIN to unlock NilaMind.",
    gate_pin_placeholder: "Enter PIN",
    gate_unlock: "Unlock",
    gate_privacy_note: "Your PIN never leaves this device.",
    // Message feedback
    msg_feedback_toggle: "Was this helpful?",
    msg_thanks_feedback: "Thanks for the feedback!",
    msg_feedback_prompt: "Help Nila learn what works for you",
    msg_feedback_placeholder: "Tell Nila what helped or didn't…",
    msg_not_now: "Not now",
    msg_share: "Share",
    // Learn
    learn_badge_skill: "Skill",
    learn_badge_explainer: "Explainer",
    learn_badge_research: "Research",
    learn_title: "Learn",
    learn_subtitle: "Evidence-based skills and plain-language explainers",
    learn_crisis_heading: "Crisis right now?",
    learn_crisis_dismiss: "Not in crisis",
    learn_support_cta: "Reach out for support",
    learn_hard_moment: "In a hard moment right now?",
    learn_hard_moment_sub: "You're not alone. Help is available.",
    learn_for_feeling: "You might be looking for",
    learn_search_placeholder: "Search skills…",
    learn_filter_all: "All",
    learn_filter_all_skills: "All skills",
    learn_results_count: "{n} skills",
    learn_loading: "Loading…",
    learn_no_results: "No skills match that search.",
    learn_footer_disclaimer: "NilaMind is educational support — not therapy, diagnosis, or a crisis service.",
    learn_what_it_is: "What it is",
    learn_why_it_helps: "Why it helps",
    learn_the_research: "The research",
    learn_reference_verifying: "Verifying references",
    learn_reference_verifying_hint: "Checking that cited studies are accurate…",
    // Reach out
    reach_title: "Reach out",
    reach_subtitle: "A message you can send to someone you trust",
    reach_crisis_heading: "Right now — crisis support",
    reach_crisis_body: "If you're in immediate danger, please call your local emergency number or a crisis helpline.",
    reach_your_kept_message: "Your saved message",
    reach_send_anyway: "Send anyway",
    reach_copy: "Copy message",
    reach_back_to_writing: "Back to writing",
    reach_need_support: "Need support right now?",
    reach_start_with: "Start with",
    reach_write_own: "Write my own",
    reach_message_placeholder: "Write a message to someone you trust…",
    reach_send: "Send",
    reach_footer_advice: "Sending is always your choice. NilaMind never sends anything on your behalf.",
    // Identity onboarding
    id_welcome_title: "Welcome to NilaMind",
    id_welcome_body: "Your private wellness companion. Everything stays on your device.",
    id_create_new: "Create a new space",
    id_restore_phrase: "Restore from recovery phrase",
    id_save_phrase_title: "Save your recovery phrase",
    id_save_phrase_body: "Write these 12 words down and keep them somewhere safe. This is the only way to restore your data if you reinstall.",
    id_copy_phrase: "Copy phrase",
    id_copied: "Copied",
    id_phrase_warning: "Write it down before continuing. If you lose this phrase, your data cannot be recovered.",
    id_phrase_confirmed: "I've written it down",
    id_enter_nila: "Enter NilaMind",
    id_restore_title: "Restore your space",
    id_restore_body: "Enter your 12-word recovery phrase to restore your data.",
    id_restore_placeholder: "word word word …",
    id_restore_backup_label: "Optional: paste your backup code",
    id_restore_backup_placeholder: "Backup code",
    id_restore_button: "Restore",
    id_error_create: "Something went wrong creating your space. Please try again.",
    id_error_invalid_phrase: "That doesn't look like a valid 12-word phrase.",
    id_error_backup_read: "Your phrase worked, but that backup couldn't be read.",
    id_error_restore: "Couldn't restore from that phrase. Please try again.",
    // You screen
    you_elevated_hint: "High energy \u2014 check your patterns or review your dashboard.",
    you_elevated_label: "Dashboard",
    you_anxious_hint: "Feeling anxious? Your insights or a thought record might help.",
    you_anxious_label: "Insights",
    you_low_hint: "Even a small step counts. Check your progress or dashboard.",
    you_low_label: "Progress",
    you_night_hint: "Quiet time \u2014 review how your week went.",
    you_night_label: "Dashboard",
    you_evening_hint: "Evening reflection \u2014 check your week's patterns.",
    you_evening_label: "Dashboard",
    you_welcome_checkin_step: "First check-in",
    you_welcome_checkin_desc: "Tell Nila how you're feeling right now",
    you_welcome_intention_step: "Set an intention",
    you_welcome_intention_desc: "One small thing you'd like to try this week",
    you_welcome_dashboard_step: "Explore your dashboard",
    you_welcome_dashboard_desc: "See your progress take shape",
    you_welcome_title: "Welcome to NilaMind",
    you_welcome_body: "Your private wellness companion. Everything stays on your device \u2014 nothing leaves your phone.",
    you_badge_on_device: "On-device",
    you_badge_crisis: "Crisis support always here",
    you_streak_this_week: " day(s) this week",
    you_mostly: "mostly ",
    you_fallback_emotion: "checking in",
    you_heavy_encouragement: "Today might feel heavy \u2014 that's okay. Just being here is enough.",
    you_data_error: "Some data couldn't load. Pull down to refresh.",
    you_intention_title: "This week's intention",
    you_intention_done: "Mark done",
    you_intention_clear: "Clear",
    you_intention_set_label: "Set a gentle intention",
    you_intention_set_desc: "One small thing you'd like to try this week",
    you_intention_picker_title: "Set an intention",
    you_intention_picker_helper: "Pick one, or write your own. No pressure \u2014 just a gentle nudge.",
    you_intention_placeholder: "Or write your own\u2026",
    you_nudge_title: "Building a habit? Try another:",
    you_nudge_checkin: "Check-in",
    you_nudge_diary: "Diary",
    you_fewer_resources: "Show fewer resources",
    you_more_resources: " more resources",
    you_footer_disclaimer: "NilaMind is a support alongside \u2014 not a substitute for \u2014 professional care.",
    tr_subtitle: "Catch a heavy thought, look at it fairly, and try a kinder, truer take.",
    tr_step_of: " of 5",
    tr_step1_title: "Step 1: The Situation",
    tr_step1_question: "What happened?",
    tr_step1_placeholder: "Explain the triggering event objective: e.g., 'An argument with a friend at noon about dinner plans...'",
    tr_step2_title: "Step 2: Core Feeling",
    tr_step2_question: "What did you feel?",
    tr_step2_placeholder: "e.g. Shame, intense anger, abandonment, panic",
    tr_step2_intensity: "Feeling Intensity?",
    tr_step3_title: "Step 3: Unwanted Thought",
    tr_step3_question: "What automatic thoughts went through your mind?",
    tr_step3_placeholder: "e.g. 'They are leaving me because I am totally toxic and unlovable...'",
    tr_step3_belief: "How strongly do you believe this thought?",
    tr_spot_looking: "Looking...",
    tr_spot_traps: "Spot traps",
    tr_step4_title: "Step 4: Identify Trap Cards",
    tr_step4_instruction: "Which cognitive distortions apply in this moment? Tap all that align:",
    tr_step4_active: "Active",
    tr_step5_title: "Step 5: Reframed Mindset",
    tr_step5_question: "What is a more balanced thought?",
    tr_step5_placeholder: "Draft an objective re-evaluation or let the assistant generate one for you...",
    tr_step5_reenable: "Re-rate original emotion intensity now:",
    tr_step5_asking: "Asking Nila...",
    tr_step5_ask_nila: "Ask Nila",
    tr_step5_crisis_heading: "What you wrote matters more than this exercise right now",
    tr_success_message: "% (from % to %)! Reframing thoughts helps calm physical pathways.",
    tr_btn_back: "Back",
    tr_btn_continue: "Continue",
    tr_btn_saved: "Log Saved!",
    tr_btn_complete: "Complete Record",
    tr_no_traps: "No obvious thinking traps spotted \u2014 that's okay, this isn't a verdict.",
    tr_empty_error: "Please explain what happened and what automatic thoughts arose first.",
    tr_nil_fail: "I couldn't reach Nila right now. Please draft your own balanced thought or retry.",
    tr_trap_all_or_nothing: "All-or-Nothing",
    tr_trap_all_or_nothing_desc: "If it's not perfect, it's a complete failure",
    tr_trap_catastrophising: "Catastrophising",
    tr_trap_catastrophising_desc: "This is going to be an absolute disaster",
    tr_trap_mind_reading: "Mind-Reading",
    tr_trap_mind_reading_desc: "I already know they think I'm incompetent",
    tr_trap_fortune_telling: "Fortune-Telling",
    tr_trap_fortune_telling_desc: "I know for a fact it will go wrong",
    tr_trap_emotional_reasoning: "Emotional Reasoning",
    tr_trap_emotional_reasoning_desc: "I feel worthless, so I must genuinely be so",
    tr_trap_should_statements: "Should Statements",
    tr_trap_should_statements_desc: "I should be doing better than this",
    tr_trap_labelling: "Labelling",
    tr_trap_labelling_desc: "I'm a failure / bad person",
    tr_trap_personalisation: "Personalisation",
    tr_trap_personalisation_desc: "It is all entirely my fault",
    tr_trap_mental_filter: "Mental Filter",
    tr_trap_mental_filter_desc: "Only focus on the negative, screen out positive context",
    tr_trap_magnification: "Magnification",
    tr_trap_magnification_desc: "Blowing everything out of proportion",
    // Episode Support
    ep_here: "I'm here.",
    ep_opening_body: "This is your episode support tool \u2014 an AI, not a person. I cannot replace a human but I can help you secure grounded thoughts to navigate the next few minutes.",
    ep_opening_question: "What is happening right now?",
    ep_placeholder: "Explain how you feel, what triggered you, or what unwanted urge you have... (text is 100% secure/private)",
    ep_start: "Start Episode Support",
    ep_offline_note: "Nila runs entirely on your device \u2014 no connection needed. If the model is still loading, the secure Guided Mode runs automatically.",
    ep_end_session: "End Session",
    ep_live_badge: "Nila \u00b7 on-device",
    ep_not_therapist: "Not a therapist. Not a diagnosis tool.",
    ep_crisis_tap: "In crisis? Tap to call now:",
    ep_shielding: "Safety shielding active",
    ep_return_home: "Return to Home",
    ep_intensity_prompt: "Select your current intensity (1 is calm, 10 is crisis limit):",
    ep_chat_placeholder: "Express how you feel...",
    ep_send: "Send",
    ep_escalation_title: "You've been in this for 20 minutes and you're still at high intensity.",
    ep_escalation_body: "This is the moment for a human. Not because I can't help \u2014 because humans can do something I genuinely cannot: exist with you physically and hear your voice.",
    ep_escalation_keep: "Keep talking with Nila",
    ep_guided_title: "Guided Offline Mode",
    ep_guided_badge: "No Connection Needed",
    ep_guided_init_body: "The AI companion isn't reachable right now, but I can still walk you through this. Let's go step by step.",
    ep_guided_intensity: "How intense is what you're feeling right now?",
    ep_tipp_title: "Biological shock reset",
    ep_tipp_body: "Your intensity is extreme. This means your thinking brain is offline. This is biology, not weakness. Try whichever of these fits right now.",
    ep_tipp_done: "I'm ready to close out",
    ep_medium_question: "What is the strongest unwanted filter right now?",
    ep_medium_racing: "Racing, chaotic thoughts spinning",
    ep_medium_harm: "An intense urge to hurt myself or act impulsively",
    ep_medium_shame: "Intense shame or hating myself",
    ep_panic_title: "Box Breathing",
    ep_panic_body: "Slow, even breathing steadies your body and helps calm a racing mind. Let's do 4-4-4-4 cycles: breathe in 4s, hold 4s, out 4s, hold 4s.",
    ep_panic_done: "Done",
    ep_harm_title: "Wave Surfing Script",
    ep_harm_body: "Urges are like waves. They rise, peak, and inevitably fall if you do not feed them. Picture yourself on a secure surfboard. Press your feet down and stay steady \u2014 do not fight the urge. Just ride it out for 10 minutes.",
    ep_harm_done: "Done",
    ep_shame_title: "Neff's Self-Compassion script",
    ep_shame_body: "Take a self-compassion break. Read slowly: \"This is hard. This pain is part of life. May I give myself the same kindness I'd offer to a dear friend in tears.\"",
    ep_shame_proceed: "Proceed to debrief",
    ep_low_body: "You're in a steadier place. Let's calm our systems down and proceed to a gentle closure.",
    ep_low_done: "Safe Close",
    ep_debrief1_title: "Closing Recovery Debrief",
    ep_debrief1_sub: "Step 1 of 3: Tracking trigger context",
    ep_debrief1_trigger: "What triggered this acute episode? (Optional)",
    ep_debrief1_placeholder: "e.g. Perceived rejection, severe work disappointment, lack of sleep...",
    ep_debrief1_skip: "Skip",
    ep_debrief1_save: "Save & Next",
    ep_debrief2_title: "Debrief: Coping Verification",
    ep_debrief2_sub: "Step 2 of 3: Check which skills helped you",
    ep_debrief2_prompt: "What helped most during this session? Toggle helpers:",
    ep_debrief2_continue: "Continue",
    ep_debrief3_title: "Debrief: Intensity Journey",
    ep_debrief3_sub: "Step 3 of 3: Rate your final current state",
    ep_debrief3_when_started: "When you started",
    ep_debrief3_highest: "Highest point",
    ep_debrief3_final: "Where is your intensity rating ending up right now?",
    ep_saved_title: "Session Saved Offline",
    ep_saved_body: "You got through it. That matters more than it might feel right now.",
    ep_saved_done: "I'm done for now",
    ep_synthetic_logged: "Logged current intensity: {n}/10.",
    ep_synthetic_user: "My current intensity is {n}/10. Acknowledge it and guide me through one matching distress-resolution skill.",
    ep_synthetic_initial: "To help me guide you safely, let's lock in: how intense is what you are experiencing right now on a scale of 1 to 10?",
    ep_synthetic_reprompt: "Let's pause and come back to right now: what is your intensity rating from 1 to 10?",
    // Exposure Hierarchy
    ex_crisis_title: "You matter \u2014 support is here right now",
    ex_crisis_body: "What you just wrote sounds like more than an exposure step. This is a moment for a person, not an exercise \u2014 please reach out right now. You're not alone.",
    ex_crisis_back: "Back to the exercise",
    ex_close: "Close",
    ex_subtitle: "Steps ranked by SUDS (0\u2013100). Work from bottom up \u2014 start with the easiest.",
    ex_completed: "Completed",
    ex_avg_suds: "Avg SUDS drop",
    ex_celebrate: "Step completed \u2014 {step}. That takes courage, even when it's hard.",
    ex_complete_step: "Complete this step",
    ex_suds_after: "SUDS after exposure: {n}",
    ex_reflect_prompt: "A few things worth reflecting on:",
    ex_learned_placeholder: "What did you learn? (optional)",
    ex_save: "Save",
    ex_cancel: "Cancel",
    ex_reflection_note: "Reflection prompts based on the inhibitory-learning model (Craske, Treanor, Conway, Zbozinek & Vervliet, 2014) \u2014 noticing what actually happened, versus what you predicted, is what research suggests makes exposure learning last.",
    ex_suds_label: "SUDS: {n}",
    ex_complete_btn: "Complete",
    ex_no_steps: "No steps yet. Add your first one below.",
    ex_step_placeholder: "Exposure step...",
    ex_suds_slider: "SUDS: {n}",
    ex_add_step: "Add step",
    ex_title: "Exposure Hierarchy",
    ex_body: "Build a ladder of fears. Work from the bottom up \u2014 start where it's easiest, not hardest.",
    ex_hierarchy_name: "Hierarchy name (e.g. Social anxiety)",
    ex_confirm_remove: "Remove step?",
    ex_confirm_message: "This step will be deleted from your hierarchy. Progress for this step will be lost.",
    ex_remove: "Remove",
    ex_keep: "Keep",
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
    error_default_title: "कुछ गलत हो गया",
    warning_default_title: "सावधान",
    info_default_title: "जानकारी",
    dismiss_error: "खारिज करें",
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
    perfSub: "वेब वाइटल्स, मॉडल कैश, क्रैश लॉग — केवल इस डिवाइस पर",
    tool_group_moment: "इस क्षण में",
    tool_group_calm: "शांति",
    tool_plan_label: "श्वास और ग्राउंडिंग",
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
    you_progress_label: "आपकी प्रगति",
    you_progress_sub: "स्ट्रीक, मील के पत्थर और जो कमाया",
    achievements_title: "उपलब्धियाँ",
    achievements_empty: "छोटे कदम भी मायने रखते हैं। पहली चेक-इन से आपका पहला बैज मिलता है।",
    milestones_title: "स्ट्रीक मीलस्टोन",
    milestones_body: "हर 3, 7, 14, 30, 60 और 100 दिन की उपस्थिति मनाने लायक है।",
    streak_milestone_reached: "मीलस्टोन पूरा — अपनी उपस्थिति पर गर्व करें।",
    you_nila_memory_label: "नीला क्या याद रखती है",
    you_nila_memory_sub: "देखें, संपादित करें, या हटाएं जो वह जानती है",
    you_settings_label: "सेटिंग्स",
    you_settings_sub: "आवाज़, रिमाइंडर, रिकवरी वाक्यांश",
    you_caregiver_label: "किसी भरोसेमंद व्यक्ति के साथ साझा करें",
    you_caregiver_sub: "परिवार के समर्थन के लिए स्नैपशॉट बनाएं",
    you_group_resources: "बाहरी संसाधन",
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
    mood_avg_7d: "मूड औसत (7 दिन)",
    from_last_week: "पिछले सप्ताह से",
    avg_sleep: "औसत नींद",
    days_active: "सक्रिय दिन",
    streak: "लगातार",
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
    hero_crisis: "आप इसमें अकेले नहीं हैं। चलिए अभी सहायता तक पहुँचते हैं।",
    hero_crisis_label: "सहायता लें",
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
    monthly_word_calm: "शांत",
    monthly_word_steady: "स्थिर",
    monthly_word_choppy: "उतार-चढ़ाव वाला",
    monthly_word_rough: "कठिन",
    narr_tracking_body: "इस महीने महसूस {word} रहा, मूड औसतन {avg}/10 ({min}-{max})। सबसे अधिक आपने {emotion} महसूस किए। आपने {days}/{total} दिन चेक-इन किए — {pacing}।",
    emotion_calm: "शांत पल",
    emotion_anxious: "चिंतित विचार",
    emotion_sad: "नीचे के एहसास",
    emotion_angry: "हताश पल",
    emotion_hopeful: "आशावादी लौ",
    pacing_strong: "इस महीने बहुत अच्छी निरंतरता!",
    pacing_good: "अच्छी गति बन रही है।",
    pacing_keep: "हर चेक-इन से स्पष्टता बढ़ती है — जारी रखें।",
    quiet_step_away: "आप {mins} मिनट से यहाँ हैं। अगर आपका मन व्यस्त है, तो थोड़ा ब्रेक या धीमी सांस स्क्रीन से ज़्यादा मदद कर सकती है। कोई जल्दी नहीं — नीला यहीं रहेगी।",
    dismiss: "बंद करें",
    no_signals_title: "सिग्नल वाले हिस्से में सब शांत है",
    no_sessions_title: "नीला के साथ आपकी बातचीत",
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
    ema_how_are_you: "अभी आप कैसा महसूस कर रहे हैं?",
    ema_energy: "ऊर्जा स्तर",
    ema_valence_very_bad: "बहुत बुरा",
    ema_valence_bad: "बुरा",
    ema_valence_neutral: "सामान्य",
    ema_valence_good: "अच्छा",
    ema_valence_very_good: "बहुत अच्छा",
    ema_energy_very_low: "बहुत कम",
    ema_energy_low: "कम",
    ema_energy_moderate: "सामान्य",
    ema_energy_high: "उच्च",
    ema_note_placeholder: "नोट जोड़ें — क्या मन में है?",
    gate_error_title: "प्रमाणीकरण त्रुटि",
    gate_error_body: "आपका डेटा डिवाइस पर ही रहा, लेकिन हम इसे सुरक्षित रूप से नहीं पढ़ सके। फिर से प्रयास करें।",
    gate_try_again: "फिर से प्रयास करें",
    gate_securing: "आपका डेटा सुरक्षित हो रहा है…",
    gate_pin_error: "गलत PIN — फिर से प्रयास करें।",
    gate_welcome_back: "वापसी पर स्वागत",
    gate_unlock_body: "NilaMind अनलॉक करने के लिए PIN दर्ज करें।",
    gate_pin_placeholder: "PIN दर्ज करें",
    gate_unlock: "अनलॉक",
    gate_privacy_note: "आपका PIN इस डिवाइस से बाहर नहीं जाता।",
    msg_feedback_toggle: "क्या यह मददगार था?",
    msg_thanks_feedback: "प्रतिक्रिया के लिए धन्यवाद!",
    msg_feedback_prompt: "Nila को सिखाएं कि आपके लिए क्या काम करता है",
    msg_feedback_placeholder: "Nila को बताएं कि क्या मदद किया या नहीं…",
    msg_not_now: "अभी नहीं",
    msg_share: "साझा करें",
    learn_badge_skill: "कौशल",
    learn_badge_explainer: "स्पष्टीकरण",
    learn_badge_research: "अनुसंधान",
    learn_title: "सीखें",
    learn_subtitle: "साक्ष्य-आधारित कौशल और सरल भाषा में स्पष्टीकरण",
    learn_crisis_heading: "अभी संकट में हैं?",
    learn_crisis_dismiss: "संकट में नहीं",
    learn_support_cta: "सहायता के लिए पहुंचें",
    learn_hard_moment: "अभी कठिन समय चल रहा है?",
    learn_hard_moment_sub: "आप अकेले नहीं हैं। मदद उपलब्ध है।",
    learn_for_feeling: "आप शायद यह ढूंढ रहे हैं",
    learn_search_placeholder: "कौशल खोजें…",
    learn_filter_all: "सभी",
    learn_filter_all_skills: "सभी कौशल",
    learn_results_count: "{n} कौशल",
    learn_loading: "लोड हो रहा है…",
    learn_no_results: "कोई कौशल मेल नहीं खाता।",
    learn_footer_disclaimer: "NilaMind शैक्षिक सहायता है — चिकित्सा, निदान या संकट सेवा नहीं।",
    learn_what_it_is: "यह क्या है",
    learn_why_it_helps: "यह क्यों मदद करता है",
    learn_the_research: "अनुसंधान",
    learn_reference_verifying: "संदर्भ सत्यापित कर रहे हैं",
    learn_reference_verifying_hint: "उद्धृत अध्ययन सटीक हैं यह जांच रहे हैं…",
    reach_title: "संपर्क करें",
    reach_subtitle: "किसी विश्वसनीय व्यक्ति को भेजने के लिए संदेश",
    reach_crisis_heading: "अभी — संकट सहायता",
    reach_crisis_body: "यदि आप तत्काल खतरे में हैं, तो कृपया अपना स्थानीय आपातकालीन नंबर या संकट हेल्पलाइन कॉल करें।",
    reach_your_kept_message: "आपका सहेजा गया संदेश",
    reach_send_anyway: "फिर भी भेजें",
    reach_copy: "संदेश कॉपी करें",
    reach_back_to_writing: "लेखन पर वापस",
    reach_need_support: "अभी सहायता चाहिए?",
    reach_start_with: "इससे शुरू करें",
    reach_write_own: "अपना लिखें",
    reach_message_placeholder: "किसी विश्वसनीय व्यक्ति को संदेश लिखें…",
    reach_send: "भेजें",
    reach_footer_advice: "भेजना हमेशा आपकी पसंद है। NilaMind आपकी ओर से कुछ नहीं भेजता।",
    id_welcome_title: "NilaMind में आपका स्वागत है",
    id_welcome_body: "आपका निजी कल्याण साथी। सब कुछ आपके डिवाइस पर ही रहता है।",
    id_create_new: "नई जगह बनाएं",
    id_restore_phrase: "रिकवरी फ्रेज़ से पुनर्स्थापित करें",
    id_save_phrase_title: "अपनी रिकवरी फ्रेज़ सहेजें",
    id_save_phrase_body: "इन 12 शब्दों को लिखकर कहीं सुरक्षित रखें। यही एकमात्र तरीका है अपना डेटा पुनर्स्थापित करने का।",
    id_copy_phrase: "फ्रेज़ कॉपी करें",
    id_copied: "कॉपी हो गया",
    id_phrase_warning: "इसे लिखकर रखें। यह फ्रेज़ खो गई तो डेटा पुनर्स्थापित नहीं हो सकता।",
    id_phrase_confirmed: "मैंने लिख लिया है",
    id_enter_nila: "NilaMind में प्रवेश करें",
    id_restore_title: "अपनी जगह पुनर्स्थापित करें",
    id_restore_body: "अपना डेटा पुनर्स्थापित करने के लिए 12-शब्द रिकवरी फ्रेज़ दर्ज करें।",
    id_restore_placeholder: "शब्द शब्द शब्द…",
    id_restore_backup_label: "वैकल्पिक: बैकअप कोड पेस्ट करें",
    id_restore_backup_placeholder: "बैकअप कोड",
    id_restore_button: "पुनर्स्थापित करें",
    id_error_create: "आपकी जगह बनाने में कुछ गड़बड़ हुई। फिर से प्रयास करें।",
    id_error_invalid_phrase: "यह 12-शब्द फ्रेज़ सही नहीं लगती।",
    id_error_backup_read: "आपकी फ्रेज़ सही थी, लेकिन बैकअप नहीं पढ़ा जा सका।",
    id_error_restore: "उस फ्रेज़ से पुनर्स्थापित नहीं हो सका। फिर से प्रयास करें।",
    you_elevated_hint: "उच्च ऊर्जा — अपने पैटर्न देखें या डैशबोर्ड देखें।",
    you_elevated_label: "डैशबोर्ड",
    you_anxious_hint: "चिंता महसूस हो रही है? इनसाइट्स या थॉट रिकॉर्ड मदद कर सकता है।",
    you_anxious_label: "इनसाइट्स",
    you_low_hint: "छोटा कदम भी मायने रखता है। प्रगति या डैशबोर्ड देखें।",
    you_low_label: "प्रगति",
    you_night_hint: "शांत समय — अपना हफ्ता कैसा रहा देखें।",
    you_night_label: "डैशबोर्ड",
    you_evening_hint: "शाम का चिंतन — हफ्ते के पैटर्न देखें।",
    you_evening_label: "डैशबोर्ड",
    you_welcome_checkin_step: "पहली जांच",
    you_welcome_checkin_desc: "Nila को बताएं अभी कैसा महसूस हो रहा है",
    you_welcome_intention_step: "इरादा रखें",
    you_welcome_intention_desc: "इस हफ्ते एक छोटी सी चीज़ जो आप आज़माना चाहते हैं",
    you_welcome_dashboard_step: "अपना डैशबोर्ड देखें",
    you_welcome_dashboard_desc: "अपनी प्रगति बनते देखें",
    you_welcome_title: "NilaMind में आपका स्वागत है",
    you_welcome_body: "आपका निजी कल्याण साथी। सब कुछ आपके डिवाइस पर ही रहता है।",
    you_badge_on_device: "डिवाइस पर",
    you_badge_crisis: "संकट सहायता हमेशा यहां",
    you_streak_this_week: " दिन इस हफ्ते",
    you_mostly: "मुख्य रूप से ",
    you_fallback_emotion: "जांच कर रहे हैं",
    you_heavy_encouragement: "आज भारी लग सकता है — ठीक है। यहां होना ही काफी है।",
    you_data_error: "कुछ डेटा लोड नहीं हो पाया। नीचे खींचें।",
    you_intention_title: "इस हफ्ते का इरादा",
    you_intention_done: "पूरा किया",
    you_intention_clear: "हटाएं",
    you_intention_set_label: "एक इरादा रखें",
    you_intention_set_desc: "इस हफ्ते एक छोटी सी चीज़ जो आप आज़माना चाहते हैं",
    you_intention_picker_title: "इरादा रखें",
    you_intention_picker_helper: "कोई चुनें, या अपना लिखें। कोई दबाव नहीं।",
    you_intention_placeholder: "या अपना लिखें…",
    you_nudge_title: "आदत बना रहे हैं? और आज़माएं:",
    you_nudge_checkin: "जांच",
    you_nudge_diary: "डायरी",
    you_fewer_resources: "कम संसाधन दिखाएं",
    you_more_resources: " और संसाधन",
    you_footer_disclaimer: "NilaMind पेशेवर देखभाल के साथ सहायता है — विकल्प नहीं।",
    tr_subtitle: "किसी भारी विचार को पकड़ें, उसे निष्पक्ष होकर देखें, और एक दयालु, सच्चा नज़रिया अपनाएं।",
    tr_step_of: " / 5",
    tr_step1_title: "चरण 1: स्थिति",
    tr_step1_question: "क्या हुआ?",
    tr_step1_placeholder: "ट्रिगरिंग घटना का वर्णन करें: जैसे, 'दोपहर में दोस्त के साथ डिनर प्लान को लेकर बहस...'",
    tr_step2_title: "चरण 2: मूल भावना",
    tr_step2_question: "आपने क्या महसूस किया?",
    tr_step2_placeholder: "जैसे शर्म, तीव्र क्रोध, त्याग, घबराहट",
    tr_step2_intensity: "भावना तीव्रता?",
    tr_step3_title: "चरण 3: अनचाहा विचार",
    tr_step3_question: "आपके मन में कौन से स्वचालित विचार आए?",
    tr_step3_placeholder: "जैसे, 'वे मुझे छोड़ रहे हैं क्योंकि मैं पूरी तरह विषैला और अप्रेमणीय हूं...'",
    tr_step3_belief: "आप इस विचार पर कितना विश्वास करते हैं?",
    tr_spot_looking: "देख रहे हैं...",
    tr_spot_traps: "फंदे खोजें",
    tr_step4_title: "चरण 4: फंदा कार्ड पहचानें",
    tr_step4_instruction: "इस समय कौन से संज्ञानात्मक विकृतियां लागू होती हैं?",
    tr_step4_active: "सक्रिय",
    tr_step5_title: "चरण 5: पुनर्गठित मानसिकता",
    tr_step5_question: "अधिक संतुलित विचार क्या है?",
    tr_step5_placeholder: "एक वस्तुनिष्ठ पुनर्मूल्यांकन का मसौदा तैयार करें...",
    tr_step5_reenable: "मूल भावना तीव्रता फिर से रेट करें:",
    tr_step5_asking: "Nila से पूछ रहे हैं...",
    tr_step5_ask_nila: "Nila से पूछें",
    tr_step5_crisis_heading: "आपने जो लिखा वह इस अभ्यास से अधिक महत्वपूर्ण है",
    tr_success_message: "% (from % to %)! विचारों को पुनर्गठित करना शारीरिक मार्गों को शांत करने में मदद करता है।",
    tr_btn_back: "पीछे",
    tr_btn_continue: "जारी रखें",
    tr_btn_saved: "लॉग सहेजा गया!",
    tr_btn_complete: "रिकॉर्ड पूरा करें",
    tr_no_traps: "कोई स्पष्ट सोच फंदे नहीं मिले — ठीक है, यह फैसला नहीं है।",
    tr_empty_error: "कृपया बताएं कि क्या हुआ और कौन से स्वचालित विचार आए।",
    tr_nil_fail: "अभी Nila तक नहीं पहुंच सके। कृपया अपना संतुलित विचार लिखें या पुनः प्रयास करें।",
    tr_trap_all_or_nothing: "सब-या-कुछ नहीं",
    tr_trap_all_or_nothing_desc: "अगर परफेक्ट नहीं, तो पूरी तरह असफल",
    tr_trap_catastrophising: "विपद्कल्पना",
    tr_trap_catastrophising_desc: "यह बिल्कुल आपदा होने वाली है",
    tr_trap_mind_reading: "मन-पठन",
    tr_trap_mind_reading_desc: "मुझे पहले से पता है वे सोचते हैं मैं अक्षम हूं",
    tr_trap_fortune_telling: "भविष्यवाणी",
    tr_trap_fortune_telling_desc: "मुझे पक्का पता है यह गलत होगा",
    tr_trap_emotional_reasoning: "भावनात्मक तर्क",
    tr_trap_emotional_reasoning_desc: "मैं बेकार महसूस करता हूं, तो सच में हूं",
    tr_trap_should_statements: "करना चाहिए कथन",
    tr_trap_should_statements_desc: "मुझे इससे बेहतर करना चाहिए",
    tr_trap_labelling: "लेबल लगाना",
    tr_trap_labelling_desc: "मैं असफल / बुरा व्यक्ति हूं",
    tr_trap_personalisation: "व्यक्तिगतकरण",
    tr_trap_personalisation_desc: "यह पूरी तरह मेरी गलती है",
    tr_trap_mental_filter: "मानसिक फ़िल्टर",
    tr_trap_mental_filter_desc: "केवल नकारात्मक पर ध्यान दें, सकारात्मक को अनदेखा करें",
    tr_trap_magnification: "आवर्धन",
    tr_trap_magnification_desc: "सब कुछ बढ़ा-चढ़ाकर पेश करना",
    ep_here: "मैं यहाँ हूँ।",
    ep_opening_body: "यह आपका एपिसोड सपोर्ट टूल है — एक AI, कोई व्यक्ति नहीं। मैं इंसान की जगह नहीं ले सकता लेकिन अगले कुछ मिनटों में जमीन पर टिके विचारों से नेविगेट करने में मदद कर सकता हूँ।",
    ep_opening_question: "अभी क्या हो रहा है?",
    ep_placeholder: "बताएं आप कैसा महसूस कर रहे हैं, क्या ट्रिगर किया, या कौन सी अनचाही इच्छा है... (टेक्स्ट 100% सुरक्षित/निजी)",
    ep_start: "एपिसोड सपोर्ट शुरू करें",
    ep_offline_note: "Nila पूरी तरह आपके डिवाइस पर चलती है — कनेक्शन की जरूरत नहीं। अगर मॉडल अभी लोड हो रहा है, तो सिक्योर गाइडेड मोड अपने आप चलता है।",
    ep_end_session: "सत्र समाप्त करें",
    ep_live_badge: "Nila · डिवाइस पर",
    ep_not_therapist: "थेरेपिस्ट नहीं। निदान टूल नहीं।",
    ep_crisis_tap: "संकट में हैं? कॉल करने के लिए टैप करें:",
    ep_shielding: "सुरक्षा शील्डिंग सक्रिय",
    ep_return_home: "होम पर लौटें",
    ep_intensity_prompt: "अपनी वर्तमान तीव्रता चुनें (1 शांत है, 10 संकट सीमा है):",
    ep_chat_placeholder: "अभिव्यक्त करें आप कैसा महसूस कर रहे हैं...",
    ep_send: "भेजें",
    ep_escalation_title: "आप इसमें 20 मिनट से हैं और अभी भी उच्च तीव्रता पर हैं।",
    ep_escalation_body: "यह इंसान का पल है। इसलिए नहीं कि मैं मदद नहीं कर सकता — क्योंकि इंसान वह कर सकते हैं जो मैं सच में नहीं कर सकता: आपके साथ शारीरिक रूप से मौजूद रहें और आपकी आवाज़ सुनें।",
    ep_escalation_keep: "Nila से बात जारी रखें",
    ep_guided_title: "गाइडेड ऑफलाइन मोड",
    ep_guided_badge: "कनेक्शन की जरूरत नहीं",
    ep_guided_init_body: "AI साथी अभी पहुँच योग्य नहीं है, लेकिन मैं अभी भी आपको इसके माध्यम से चला सकता हूँ। आइए कदम दर कदम चलें।",
    ep_guided_intensity: "अभी आप जो महसूस कर रहे हैं वह कितना तीव्र है?",
    ep_tipp_title: "जैविक शॉक रीसेट",
    ep_tipp_body: "आपकी तीव्रता चरम पर है। इसका मतलब है आपका सोचने वाला मस्तिष्क ऑफलाइन है। यह जीव विज्ञान है, कमजोरी नहीं। जो अभी फिट बैठता है उसे आज़माएँ।",
    ep_tipp_done: "मैं समाप्त करने के लिए तैयार हूँ",
    ep_medium_question: "अभी सबसे मजबूत अनचाहा फ़िल्टर क्या है?",
    ep_medium_racing: "दौड़ते, अराजक विचार घूम रहे हैं",
    ep_medium_harm: "मुझे चोट पहुँचाने या आवेग में काम करने की तीव्र इच्छा",
    ep_medium_shame: "तीव्र शर्म या खुद से नफरत",
    ep_panic_title: "बॉक्स ब्रीदिंग",
    ep_panic_body: "धीमी, सम साँस आपके शरीर को स्थिर करती है और दौड़ते मन को शांत करने में मदद करती है। आइए 4-4-4-4 चक्र करें: 4 सेकंड साँस लें, 4 सेकंड रोकें, 4 सेकंड छोड़ें, 4 सेकंड रोकें।",
    ep_panic_done: "हो गया",
    ep_harm_title: "वेव सर्फिंग स्क्रिप्ट",
    ep_harm_body: "इच्छाएँ लहरों की तरह होती हैं। वे उठती हैं, चरम पर पहुँचती हैं, और अनिवार्य रूप से गिर जाती हैं अगर आप उन्हें खाद न दें। खुद को एक सुरक्षित सर्फबोर्ड पर देखें। पैर दबाएँ और स्थिर रहें — इच्छा से न लड़ें। बस 10 मिनट तक इसे झेलें।",
    ep_harm_done: "हो गया",
    ep_shame_title: "नेफ का सेल्फ-कम्पैशन स्क्रिप्ट",
    ep_shame_body: "एक सेल्फ-कम्पैशन ब्रेक लें। धीरे पढ़ें: \"यह कठिन है। यह दर्द जीवन का हिस्सा है। क्या मैं खुद को वही दयालुता दूँ जो किसी प्रिय रोते दोस्त को दूँगा।\"",
    ep_shame_proceed: "डीब्रीफ पर जाएँ",
    ep_low_body: "आप एक स्थिर जगह पर हैं। आइए अपने सिस्टम को शांत करें और धीरे से समाप्त करें।",
    ep_low_done: "सेफ क्लोज़",
    ep_debrief1_title: "क्लोजिंग रिकवरी डीब्रीफ",
    ep_debrief1_sub: "चरण 1 ऑफ 3: ट्रिगर संदर्भ ट्रैक करना",
    ep_debrief1_trigger: "इस तीव्र एपिसोड को क्या ट्रिगर किया? (वैकल्पिक)",
    ep_debrief1_placeholder: "जैसे कथित अस्वीकृति, गंभीर कार्य निराशा, नींद की कमी...",
    ep_debrief1_skip: "स्किप करें",
    ep_debrief1_save: "सेव करें और अगला",
    ep_debrief2_title: "डीब्रीफ: कॉपिंग वेरिफिकेशन",
    ep_debrief2_sub: "चरण 2 ऑफ 3: जांचें कौन से कौशल मदद किए",
    ep_debrief2_prompt: "इस सत्र में सबसे ज्यादा क्या मदद किया? हेल्पर्स टॉगल करें:",
    ep_debrief2_continue: "जारी रखें",
    ep_debrief3_title: "डीब्रीफ: इंटेंसिटी जर्नी",
    ep_debrief3_sub: "चरण 3 ऑफ 3: अपनी अंतिम वर्तमान स्थिति रेट करें",
    ep_debrief3_when_started: "जब आपने शुरू किया",
    ep_debrief3_highest: "उच्चतम बिंदु",
    ep_debrief3_final: "आपकी तीव्रता रेटिंग अभी कहाँ खत्म हो रही है?",
    ep_saved_title: "सत्र ऑफलाइन सेव हुआ",
    ep_saved_body: "आप इससे निकल गए। यह उससे ज्यादा मायने रखता है जितना अभी महसूस हो रहा है।",
    ep_saved_done: "अभी के लिए मेरा काम हो गया",
    ep_synthetic_logged: "वर्तमान तीव्रता लॉग की गई: {n}/10।",
    ep_synthetic_user: "मेरी वर्तमान तीव्रता {n}/10 है। इसे स्वीकार करें और मुझे एक मेल खाने वाले डिस्ट्रेस-रिज़ॉल्यूशन कौशल के माध्यम से मार्गदर्शन करें।",
    ep_synthetic_initial: "मुझे सुरक्षित रूप से मार्गदर्शन करने में मदद करने के लिए, आइए लॉक इन करें: अभी आप जो अनुभव कर रहे हैं वह 1 से 10 के पैमाने पर कितना तीव्र है?",
    ep_synthetic_reprompt: "आइए रुकें और अभी वापस आएँ: 1 से 10 तक आपकी तीव्रता रेटिंग क्या है?",
    ex_crisis_title: "आप मायने रखते हैं — सहायता अभी यहाँ है",
    ex_crisis_body: "आपने जो लिखा वह एक एक्सपोज़र स्टेप से अधिक लगता है। यह एक व्यक्ति का पल है, अभ्यास नहीं — कृपया अभी संपर्क करें। आप अकेले नहीं हैं।",
    ex_crisis_back: "अभ्यास पर वापस",
    ex_close: "बंद करें",
    ex_subtitle: "स्टेप्स SUDS (0–100) द्वारा रैंक किए गए। नीचे से ऊपर काम करें — सबसे आसान से शुरू करें।",
    ex_completed: "पूर्ण",
    ex_avg_suds: "औसत SUDS गिरावट",
    ex_celebrate: "स्टेप पूर्ण — {step}। यह साहस लेता है, तब भी जब यह कठिन हो।",
    ex_complete_step: "इस स्टेप को पूरा करें",
    ex_suds_after: "एक्सपोज़र के बाद SUDS: {n}",
    ex_reflect_prompt: "कुछ चीज़ें जिन पर विचार करना उचित है:",
    ex_learned_placeholder: "आपने क्या सीखा? (वैकल्पिक)",
    ex_save: "सेव करें",
    ex_cancel: "रद्द करें",
    ex_reflection_note: "इन्हिबिटरी-लर्निंग मॉडल पर आधारित रिफ्लेक्शन प्रॉम्प्ट्स (क्रास्के, ट्रीनर, कॉनवे, ज़्बोज़िनेक और वर्व्लिएट, 2014) — यह देखना कि वास्तव में क्या हुआ बनाम आपने क्या भविष्यवाणी की, शोध सुझाता है कि एक्सपोज़र लर्निंग को टिकाऊ बनाता है।",
    ex_suds_label: "SUDS: {n}",
    ex_complete_btn: "पूर्ण करें",
    ex_no_steps: "अभी तक कोई स्टेप नहीं। नीचे पहला जोड़ें।",
    ex_step_placeholder: "एक्सपोज़र स्टेप...",
    ex_suds_slider: "SUDS: {n}",
    ex_add_step: "स्टेप जोड़ें",
    ex_title: "एक्सपोज़र हायरार्की",
    ex_body: "डर की सीढ़ी बनाएं। नीचे से ऊपर काम करें — जहाँ सबसे आसान हो वहाँ से शुरू करें, सबसे कठिन से नहीं।",
    ex_hierarchy_name: "हायरार्की नाम (जैसे सामाजिक चिंता)",
    ex_confirm_remove: "स्टेप हटाएँ?",
    ex_confirm_message: "यह स्टेप आपकी हायरार्की से हटा दिया जाएगा। इस स्टेप की प्रगति खो जाएगी।",
    ex_remove: "हटाएँ",
    ex_keep: "रखें",
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
    error_default_title: "பிழை ஏற்பட்டது",
    warning_default_title: "எச்சரிக்கை",
    info_default_title: "தகவல்",
    dismiss_error: "நீக்கு",
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
    perfSub: "வலை முக்கிய அளவீடுகள், மாதிரி கேச், க்ராஷ் பதிவு — இந்தச் சாதனத்தில் மட்டும்",
    tool_group_moment: "இந்தத் தருணத்தில்",
    tool_group_calm: "அமைதி",
    tool_plan_label: "மூச்சு மற்றும் கிரவுண்டிங்",
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
    you_progress_label: "உங்கள் முன்னேற்றம்",
    you_progress_sub: "சரணிகள், மைல்கற்கள் மற்றும் நீங்கள் பெற்றவை",
    achievements_title: "சாதனைகள்",
    achievements_empty: "சிறிய அடிகளும் முக்கியம். உங்கள் முதல் செக்-இன் உங்கள் முதல் பதக்கத்தைத் தரும்.",
    milestones_title: "சரணி மைல்கற்கள்",
    milestones_body: "ஒவ்வொரு 3, 7, 14, 30, 60 மற்றும் 100 நாட்களுக்கும் உங்கள் வருகை கொண்டாடத்தக்கது.",
    streak_milestone_reached: "மைல்கல் அடையப்பட்டது — வருவதில் பெருமை கொள்ளுங்கள்.",
    you_nila_memory_label: "நீலா எதை நினைவில் வைத்திருக்கிறாள்",
    you_nila_memory_sub: "அவள் அறிந்ததைப் பாருங்கள், திருத்துங்கள் அல்லது அழிக்கவும்",
    you_settings_label: "அமைப்புகள்",
    you_settings_sub: "குரல், நினைவூட்டல்கள், மீட்பு சொற்றொடர்",
    you_caregiver_label: "நம்பகமான நபருடன் பகிர்",
    you_caregiver_sub: "குடும்ப ஆதரவுக்கான சித்திரம் உருவாக்கு",
    you_group_resources: "வெளிப்புற வளங்கள்",
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
    mood_avg_7d: "மனநிலை சராசரி (7 நாட்கள்)",
    from_last_week: "கடந்த வாரத்திலிருந்து",
    avg_sleep: "சராசரி தூக்கம்",
    days_active: "செயலில் உள்ள நாட்கள்",
    streak: "தொடர்ச்சி",
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
    hero_crisis: "இதில் நீங்கள் தனியாக இல்லை. இப்போதே உதவியை அடைவோம்.",
    hero_crisis_label: "உதவி பெறு",
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
    monthly_word_calm: "அமைதியான",
    monthly_word_steady: "நிலையான",
    monthly_word_choppy: "ஏற்றத்தாழ்வான",
    monthly_word_rough: "கடினமான",
    narr_tracking_body: "இந்த மாதம் {word} உணர்ந்தீர்கள், மனநிலை சராசரியாக {avg}/10 ({min}-{max}). பெரும்பாலும் நீங்கள் {emotion} உணர்ந்தீர்கள். {days}/{total} நாட்கள் செக்-இன் செய்தீர்கள் — {pacing}.",
    emotion_calm: "அமைதியான தருணங்கள்",
    emotion_anxious: "கவலையான எண்ணங்கள்",
    emotion_sad: "தாழ்ந்த உணர்வுகள்",
    emotion_angry: "சலிப்பான தருணங்கள்",
    emotion_hopeful: "நம்பிக்கைத் துளிர்கள்",
    pacing_strong: "இந்த மாதம் வலுவான தொடர்ச்சி!",
    pacing_good: "நல்ல வேகம் உருவாகிறது.",
    pacing_keep: "ஒவ்வொரு செக்-இன்னும் தெளிவைத் தரும் — தொடருங்கள்.",
    quiet_step_away: "நீங்கள் {mins} நிமிடங்களாக இங்கே இருக்கிறீர்கள். உங்கள் மனம் பரபரப்பாக இருந்தால், சிறு இடைவேளை அல்லது மெதுவான மூச்சு திரையை விட உதவும். அவசரம் இல்லை — நிலா இங்கேயே இருப்பாள்.",
    dismiss: "மூடு",
    no_signals_title: "சிக்னல் பக்கம் அமைதியாக உள்ளது",
    no_sessions_title: "நிலாவுடன் உங்கள் உரையாடல்கள்",
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
    ema_how_are_you: "இப்போது எப்படி உணர்கிறீர்கள்?",
    ema_energy: "ஆற்றல் நிலை",
    ema_valence_very_bad: "மிகவும் மோசம்",
    ema_valence_bad: "மோசம்",
    ema_valence_neutral: "சாதாரணம்",
    ema_valence_good: "நல்லது",
    ema_valence_very_good: "மிகவும் நல்லது",
    ema_energy_very_low: "மிகவும் குறைவு",
    ema_energy_low: "குறைவு",
    ema_energy_moderate: "சராசரி",
    ema_energy_high: "அதிகம்",
    ema_note_placeholder: "குறிப்பு சேர்க்கவும் — மனதில் என்ன இருக்கிறது?",
    gate_error_title: "சரிபார்ப்பு பிழை",
    gate_error_body: "உங்கள் தரவு சாதனத்திலேயே இருந்தது, ஆனால் பாதுகாப்பாக படிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    gate_try_again: "மீண்டும் முயற்சிக்கவும்",
    gate_securing: "உங்கள் தரவு பாதுகாக்கப்படுகிறது…",
    gate_pin_error: "தவறான PIN — மீண்டும் முயற்சிக்கவும்.",
    gate_welcome_back: "மீண்டும் வரவேற்கிறோம்",
    gate_unlock_body: "NilaMind திறக்க PIN உள்ளிடவும்.",
    gate_pin_placeholder: "PIN உள்ளிடவும்",
    gate_unlock: "திற",
    gate_privacy_note: "உங்கள் PIN இந்த சாதனத்தை விட்டு வெளியேறாது.",
    msg_feedback_toggle: "இது உதவியாக இருந்ததா?",
    msg_thanks_feedback: "கருத்துக்கு நன்றி!",
    msg_feedback_prompt: "Nila க்கு எது வேலை செய்கிறது என்று கற்றுக்கொடுங்கள்",
    msg_feedback_placeholder: "Nila க்கு எது உதவியது அல்லது உதவவில்லை என்று சொல்லுங்கள்…",
    msg_not_now: "இப்போது இல்லை",
    msg_share: "பகிர்",
    learn_badge_skill: "திறன்",
    learn_badge_explainer: "விளக்கம்",
    learn_badge_research: "ஆய்வு",
    learn_title: "கற்றல்",
    learn_subtitle: "ஆதார அடிப்படையிலான திறன்கள் மற்றும் எளிய விளக்கங்கள்",
    learn_crisis_heading: "இப்போது நெருக்கடியில் உள்ளீர்களா?",
    learn_crisis_dismiss: "நெருக்கடியில் இல்லை",
    learn_support_cta: "ஆதரவுக்கு தொடர்பு கொள்ளுங்கள்",
    learn_hard_moment: "இப்போது கடினமான நேரம்?",
    learn_hard_moment_sub: "நீங்கள் தனியாக இல்லை. உதவி கிடைக்கும்.",
    learn_for_feeling: "நீங்கள் தேடுவது இது",
    learn_search_placeholder: "திறன்களைத் தேடுங்கள்…",
    learn_filter_all: "அனைத்தும்",
    learn_filter_all_skills: "அனைத்து திறன்கள்",
    learn_results_count: "{n} திறன்கள்",
    learn_loading: "ஏற்றுகிறது…",
    learn_no_results: "திறன்கள் பொருந்தவில்லை.",
    learn_footer_disclaimer: "NilaMind கல்வி ஆதரவு — சிகிச்சை, நோயறிதல் அல்லது நெருக்கடி சேவை அல்ல.",
    learn_what_it_is: "இது என்ன",
    learn_why_it_helps: "ஏன் உதவுகிறது",
    learn_the_research: "ஆய்வு",
    learn_reference_verifying: "குறிப்புகளை சரிபார்க்கிறது",
    learn_reference_verifying_hint: "மேற்கோள் ஆய்வுகள் துல்லியமா என்று சரிபார்க்கிறது…",
    reach_title: "தொடர்பு கொள்ளுங்கள்",
    reach_subtitle: "நம்பகமான நபருக்கு அனுப்பும் செய்தி",
    reach_crisis_heading: "இப்போது — நெருக்கடி ஆதரவு",
    reach_crisis_body: "உடனடி ஆபத்தில் இருந்தால், உள்ளூர் அவசர எண் அல்லது நெருக்கடி ஹெல்ப்லைனை அழைக்கவும்.",
    reach_your_kept_message: "சேமித்த செய்தி",
    reach_send_anyway: "இருப்பினும் அனுப்பு",
    reach_copy: "செய்தியை நகலெடு",
    reach_back_to_writing: "எழுத்துக்கு திரும்பு",
    reach_need_support: "இப்போது ஆதரவு வேண்டுமா?",
    reach_start_with: "இதில் தொடங்குங்கள்",
    reach_write_own: "சொந்தமாக எழுதுங்கள்",
    reach_message_placeholder: "நம்பகமான நபருக்கு செய்தி எழுதுங்கள்…",
    reach_send: "அனுப்பு",
    reach_footer_advice: "அனுப்புவது எப்போதும் உங்கள் தேர்வு. NilaMind உங்கள் சார்பாக ஒன்றும் அனுப்பாது.",
    id_welcome_title: "NilaMind க்கு வரவேற்கிறோம்",
    id_welcome_body: "உங்கள் தனிப்பட்ட நல்வாழ்வு துணை. எல்லாம் உங்கள் சாதனத்திலேயே இருக்கும்.",
    id_create_new: "புதிய இடம் உருவாக்கு",
    id_restore_phrase: "மீட்பு வாக்கியத்திலிருந்து மீட்டெடு",
    id_save_phrase_title: "உங்கள் மீட்பு வாக்கியத்தை சேமியுங்கள்",
    id_save_phrase_body: "இந்த 12 வார்த்தைகளை எழுதி பாதுகாப்பான இடத்தில் வையுங்கள். மீட்டெடுக்க இதுவே ஒரே வழி.",
    id_copy_phrase: "வாக்கியம் நகலெடு",
    id_copied: "நகலெடுக்கப்பட்டது",
    id_phrase_warning: "எழுதி வையுங்கள். இந்த வாக்கியம் தொலைந்தால் தரவை மீட்டெடுக்க முடியாது.",
    id_phrase_confirmed: "நான் எழுதிவிட்டேன்",
    id_enter_nila: "NilaMind உள்ளே செல்",
    id_restore_title: "உங்கள் இடத்தை மீட்டெடு",
    id_restore_body: "தரவை மீட்டெடுக்க 12-வார்த்தை மீட்பு வாக்கியத்தை உள்ளிடவும்.",
    id_restore_placeholder: "வார்த்தை வார்த்தை வார்த்தை…",
    id_restore_backup_label: "விருப்பம்: காப்பு குறியீட்டை ஒட்டவும்",
    id_restore_backup_placeholder: "காப்பு குறியீடு",
    id_restore_button: "மீட்டெடு",
    id_error_create: "உங்கள் இடம் உருவாக்க பிழை. மீண்டும் முயற்சிக்கவும்.",
    id_error_invalid_phrase: "இது 12-வார்த்தை வாக்கியம் போல் தெரியவில்லை.",
    id_error_backup_read: "உங்கள் வாக்கியம் சரி, ஆனால் காப்பு படிக்க முடியவில்லை.",
    id_error_restore: "அந்த வாக்கியத்திலிருந்து மீட்டெடுக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    you_elevated_hint: "அதிக ஆற்றல் — உங்கள் முறைகளைப் பாருங்கள் அல்லது டாஷ்போர்டைப் பாருங்கள்.",
    you_elevated_label: "டாஷ்போர்டு",
    you_anxious_hint: "கவலை உணர்கிறீர்களா? நுண்ணறிவு அல்லது எண்ணப் பதிவு உதவலாம்.",
    you_anxious_label: "நுண்ணறிவு",
    you_low_hint: "சிறிய படியும் முக்கியம். முன்னேற்றம் அல்லது டாஷ்போர்டைப் பாருங்கள்.",
    you_low_label: "முன்னேற்றம்",
    you_night_hint: "அமைதியான நேரம் — உங்கள் வாரம் எப்படி இருந்தது பாருங்கள்.",
    you_night_label: "டாஷ்போர்டு",
    you_evening_hint: "மாலை சிந்தனை — வார முறைகளைப் பாருங்கள்.",
    you_evening_label: "டாஷ்போர்டு",
    you_welcome_checkin_step: "முதல் சரிபார்ப்பு",
    you_welcome_checkin_desc: "Nila க்கு இப்போது எப்படி உணர்கிறீர்கள் என்று சொல்லுங்கள்",
    you_welcome_intention_step: "நோக்கம் நிலுவை",
    you_welcome_intention_desc: "இந்த வாரம் முயற்சிக்க விரும்பும் சிறிய விஷயம்",
    you_welcome_dashboard_step: "டாஷ்போர்டைப் பாருங்கள்",
    you_welcome_dashboard_desc: "உங்கள் முன்னேற்றத்தை உருவாக்குவதைப் பாருங்கள்",
    you_welcome_title: "NilaMind க்கு வரவேற்கிறோம்",
    you_welcome_body: "உங்கள் தனிப்பட்ட நல்வாழ்வு துணை. எல்லாம் உங்கள் சாதனத்திலேயே இருக்கும்.",
    you_badge_on_device: "சாதனத்தில்",
    you_badge_crisis: "நெருக்கடி ஆதரவு எப்போதும் இங்கே",
    you_streak_this_week: " நாட்கள் இந்த வாரம்",
    you_mostly: "முக்கியமாக ",
    you_fallback_emotion: "சரிபார்க்கிறது",
    you_heavy_encouragement: "இன்று கனமாக இருக்கலாம் — சரி. இங்கே இருப்பதே போதும்.",
    you_data_error: "சில தரவு ஏற்ற முடியவில்லை. கீழே இழுக்கவும்.",
    you_intention_title: "இந்த வாரத்தின் நோக்கம்",
    you_intention_done: "முடிந்தது",
    you_intention_clear: "அழி",
    you_intention_set_label: "நோக்கம் நிலுவை",
    you_intention_set_desc: "இந்த வாரம் முயற்சிக்க விரும்பும் சிறிய விஷயம்",
    you_intention_picker_title: "நோக்கம் நிலுவை",
    you_intention_picker_helper: "ஒன்றைத் தேர்ந்தெடுங்கள், அல்லது உங்களுடையதை எழுதுங்கள்.",
    you_intention_placeholder: "அல்லது உங்களுடையதை எழுதுங்கள்…",
    you_nudge_title: "பழக்கம் உருவாக்குகிறீர்களா? மேலும் முயற்சிக்கவும்:",
    you_nudge_checkin: "சரிபார்ப்பு",
    you_nudge_diary: "நாட்குறிப்பு",
    you_fewer_resources: "குறைவான வளங்களைக் காட்டு",
    you_more_resources: " மேலும் வளங்கள்",
    you_footer_disclaimer: "NilaMind தொழில்முறை பரிவுடன் ஆதரவு — மாற்று அல்ல.",
    tr_subtitle: "ஒரு கனமான எண்ணத்தைக் கவனியுங்கள், அதை நியாயமாகப் பரிசீலியுங்கள், மேலும் இரக்கமான, உண்மையான பார்வையை முயற்சிக்கவும்.",
    tr_step_of: " / 5",
    tr_step1_title: "படி 1: சூழ்நிலை",
    tr_step1_question: "என்ன நடந்தது?",
    tr_step1_placeholder: "தூண்டுதல் நிகழ்வை விவரிக்கவும்: எ.கா., 'நண்பருடன் மதிய உணவு திட்டம் பற்றி வாக்குவாதம்...'",
    tr_step2_title: "படி 2: அடிப்படை உணர்வு",
    tr_step2_question: "நீங்கள் என்ன உணர்ந்தீர்கள்?",
    tr_step2_placeholder: "எ.கா. வெட்கம், தீவிர கோபம், கைவிடுதல், பீதி",
    tr_step2_intensity: "உணர்வு தீவிரம்?",
    tr_step3_title: "படி 3: விரும்பத்தகாத எண்ணம்",
    tr_step3_question: "உங்கள் மனதில் என்ன தானியங்கு எண்ணங்கள் வந்தன?",
    tr_step3_placeholder: "எ.கா. 'அவர்கள் என்னை விட்டு விலகுகிறார்கள் ஏனெனில் நான் முற்றிலும் நச்சு மற்றும் அன்பற்றவன்...'",
    tr_step3_belief: "இந்த எண்ணத்தை எவ்வளவு நம்புகிறீர்கள்?",
    tr_spot_looking: "தேடுகிறது...",
    tr_spot_traps: "கண்டறியவும்",
    tr_step4_title: "படி 4: பிடிப்பு அட்டைகளை அடையாளம் காணுங்கள்",
    tr_step4_instruction: "இந்த நேரத்தில் எந்த அறிவாற்றல் கோளாறுகள் பொருந்தும்?",
    tr_step4_active: "செயலில்",
    tr_step5_title: "படி 5: மறுகட்டமைக்கப்பட்ட மனநிலை",
    tr_step5_question: "மிகவும் சமநிலையான எண்ணம் என்ன?",
    tr_step5_placeholder: "ஒரு புள்ளிவிவர மறுமதிப்பீட்டை தயாரிக்கவும்...",
    tr_step5_reenable: "அசல் உணர்வு தீவிரத்தை மீண்டும் மதிப்பிடுங்கள்:",
    tr_step5_asking: "Nila கிடம் கேட்கிறது...",
    tr_step5_ask_nila: "Nila கிடம் கேளுங்கள்",
    tr_step5_crisis_heading: "நீங்கள் எழுதியது இந்த பயிற்சியை விட முக்கியமானது",
    tr_success_message: "% (from % to %)! எண்ணங்களை மறுகட்டமைப்பது உடல் பாதைகளை அமைதிப்படுத்த உதவுகிறது.",
    tr_btn_back: "பின்",
    tr_btn_continue: "தொடர்",
    tr_btn_saved: "பதிவு சேமிக்கப்பட்டது!",
    tr_btn_complete: "பதிவை முடி",
    tr_no_traps: "வெளிப்படையான எண்ண பிடிப்புகள் இல்லை — சரி, இது தீர்ப்பு அல்ல.",
    tr_empty_error: "என்ன நடந்தது மற்றும் என்ன தானியங்கு எண்ணங்கள் எழுந்தன என்று விவரிக்கவும்.",
    tr_nil_fail: "இப்போது Nila ஐ அணுக முடியவில்லை. உங்கள் சமநிலை எண்ணத்தை எழுதுங்கள் அல்லது மீண்டும் முயற்சிக்கவும்.",
    tr_trap_all_or_nothing: "அனைத்தும் அல்லது ஒன்றும் இல்லை",
    tr_trap_all_or_nothing_desc: "சரியாக இல்லாவிட்டால், முற்றிலும் தோல்வி",
    tr_trap_catastrophising: "பேரழிவு கற்பனை",
    tr_trap_catastrophising_desc: "இது முற்றிலும் பேரழிவாக இருக்கும்",
    tr_trap_mind_reading: "மனம் படித்தல்",
    tr_trap_mind_reading_desc: "அவர்கள் நான் திறமையற்றவன் என்று நினைக்கிறார்கள் என்று ஏற்கனவே தெரியும்",
    tr_trap_fortune_telling: "எதிர்கால கணிப்பு",
    tr_trap_fortune_telling_desc: "இது தவறாகும் என்று உறுதியாக தெரியும்",
    tr_trap_emotional_reasoning: "உணர்வு காரணம்",
    tr_trap_emotional_reasoning_desc: "நான் பயனற்றவனாக உணர்கிறேன், அதனால் உண்மையிலேயே அப்படித்தான்",
    tr_trap_should_statements: "செய்ய வேண்டும் கூற்றுகள்",
    tr_trap_should_statements_desc: "நான் இதை விட நன்றாக செய்ய வேண்டும்",
    tr_trap_labelling: "பெயரிடுதல்",
    tr_trap_labelling_desc: "நான் தோல்வியடைந்த / மோசமான நபர்",
    tr_trap_personalisation: "தனிப்படுத்தல்",
    tr_trap_personalisation_desc: "இது முற்றிலும் என் தவறு",
    tr_trap_mental_filter: "மன வடிகட்டி",
    tr_trap_mental_filter_desc: "எதிர்மறையில் மட்டுமே கவனம் செலுத்துங்கள்",
    tr_trap_magnification: "பெருக்கம்",
    tr_trap_magnification_desc: "எல்லாவற்றையும் பெரிதாக்குதல்",
    ep_here: "நான் இங்கே இருக்கிறேன்.",
    ep_opening_body: "இது உங்கள் எபிசோட் ஆதரவு கருவி — ஒரு AI, ஒரு மனிதர் அல்ல. நான் ஒரு மனிதரை மாற்ற முடியாது, ஆனால் அடுத்த சில நிமிடங்களை நெறியாகக் கடக்க தரையிறங்கிய எண்ணங்களைப் பெற உங்களுக்கு உதவலாம்.",
    ep_opening_question: "இப்போது என்ன நடக்கிறது?",
    ep_placeholder: "நீங்கள் எப்படி உணர்கிறீர்கள், உங்களை எது தூண்டியது, அல்லது உங்களுக்கு என்ன தேவையற்ற ஆசை உள்ளது என்பதை விளக்குங்கள்... (உரை 100% பாதுகாப்பானது/தனிப்பட்டது)",
    ep_start: "எபிசோட் ஆதரவைத் தொடங்கு",
    ep_offline_note: "Nila முழுவதும் உங்கள் சாதனத்தில் இயங்குகிறது — இணைப்பு தேவையில்லை. மாதிரி இன்னும் ஏற்றப்படுகிறது என்றால், பாதுகாப்பான வழிகாட்டப்பட்ட முறை தானாகவே இயங்கும்.",
    ep_end_session: "அமர்வை முடி",
    ep_live_badge: "Nila · சாதனத்தில்",
    ep_not_therapist: "சிகிச்சையாளர் அல்ல. நோயறிதல் கருவி அல்ல.",
    ep_crisis_tap: "நெருக்கடியில் உள்ளீர்களா? இப்போது அழைக்க தட்டவும்:",
    ep_shielding: "பாதுகாப்பு கவசம் இயக்கத்தில்",
    ep_return_home: "முகப்புக்குத் திரும்பு",
    ep_intensity_prompt: "உங்கள் தற்போதைய தீவிரத்தைத் தேர்ந்தெடுக்கவும் (1 அமைதி, 10 நெருக்கடி வரம்பு):",
    ep_chat_placeholder: "நீங்கள் எப்படி உணர்கிறீர்கள் என்பதை வெளிப்படுத்துங்கள்...",
    ep_send: "அனுப்பு",
    ep_escalation_title: "நீங்கள் 20 நிமிடங்களாக இதில் இருக்கிறீர்கள், இன்னும் உயர் தீவிரத்தில் இருக்கிறீர்கள்.",
    ep_escalation_body: "இது ஒரு மனிதரின் தருணம். நான் உதவ முடியாததால் அல்ல — மனிதர்களால் நான் உண்மையிலேயே செய்ய முடியாத ஒன்றைச் செய்ய முடியும் என்பதால்: உங்களுடன் உடல் ரீதியாக இருந்து உங்கள் குரலைக் கேட்பது.",
    ep_escalation_keep: "Nila உடன் பேசுவதைத் தொடருங்கள்",
    ep_guided_title: "வழிகாட்டப்பட்ட ஆஃப்லைன் முறை",
    ep_guided_badge: "இணைப்பு தேவையில்லை",
    ep_guided_init_body: "AI துணை இப்போது அணுக முடியாத நிலையில் உள்ளது, ஆனால் நான் இன்னும் உங்களை இதன் வழியாக அழைத்துச் செல்ல முடியும். படிப்படியாகச் செல்லலாம்.",
    ep_guided_intensity: "இப்போது நீங்கள் உணர்வது எவ்வளவு தீவிரம்?",
    ep_tipp_title: "உயிரியல் அதிர்ச்சி மீட்டமைப்பு",
    ep_tipp_body: "உங்கள் தீவிரம் கடுமையானது. அதாவது உங்கள் சிந்திக்கும் மூளை ஆஃப்லைனில் உள்ளது. இது உயிரியல், பலவீனம் அல்ல. இப்போது பொருந்தக்கூடிய ஒன்றை முயற்சிக்கவும்.",
    ep_tipp_done: "முடிக்கத் தயாராக இருக்கிறேன்",
    ep_medium_question: "இப்போது மிகவும் வலுவான தேவையற்ற சிந்தனை எது?",
    ep_medium_racing: "வேகமாகச் சுழலும் குழப்பமான எண்ணங்கள்",
    ep_medium_harm: "என்னை காயப்படுத்த அல்லது மனக்கிளர்ச்சியாகச் செயல்பட ஒரு தீவிர ஆசை",
    ep_medium_shame: "கடுமையான அவமானம் அல்லது தன்னை வெறுத்தல்",
    ep_panic_title: "பாக்ஸ் பிரீதிங்",
    ep_panic_body: "மெதுவான, சீரான சுவாசம் உங்கள் உடலை நிலைப்படுத்தி விரைந்து செல்லும் மனதை அமைதிப்படுத்த உதவுகிறது. 4-4-4-4 சுழற்சிகளைச் செய்வோம்: 4 விநாடி உள்ளே சுவாசிக்கவும், 4 விநாடி நிறுத்தவும், 4 விநாடி வெளியே விடவும், 4 விநாடி நிறுத்தவும்.",
    ep_panic_done: "முடிந்தது",
    ep_harm_title: "அலை சர்ஃபிங் ஸ்கிரிப்ட்",
    ep_harm_body: "ஆசைகள் அலைகளைப் போன்றவை. அவை எழுகின்றன, உச்சத்தை அடைகின்றன, நீங்கள் அவற்றுக்கு உணவளிக்காவிட்டால் அவசியம் வீழ்கின்றன. பாதுகாப்பான சர்ஃப்போர்டில் உங்களைக் கற்பனை செய்யுங்கள். கால்களை ஊன்றி நிலையாக இருங்கள் — ஆசையுடன் போராடாதீர்கள். 10 நிமிடங்களுக்கு அதைத் தாங்கிச் செல்லுங்கள்.",
    ep_harm_done: "முடிந்தது",
    ep_shame_title: "Neff-ன் சுய-கரிசனை ஸ்கிரிப்ட்",
    ep_shame_body: "ஒரு சுய-கரிசனை இடைவெளி எடுத்துக் கொள்ளுங்கள். மெதுவாகப் படியுங்கள்: \"இது கடினம். இந்த வலி வாழ்க்கையின் பகுதி. கண்ணீருடன் இருக்கும் அன்பான நண்பருக்கு நான் அளிக்கும் அதே கருணையை எனக்கும் அளிக்கட்டும்.\"",
    ep_shame_proceed: "டிப்ரீப்பிற்குச் செல்லவும்",
    ep_low_body: "நீங்கள் நிலையான இடத்தில் இருக்கிறீர்கள். நமது அமைப்புகளை அமைதிப்படுத்தி மென்மையான முடிவை நோக்கிச் செல்லலாம்.",
    ep_low_done: "பாதுகாப்பான முடிவு",
    ep_debrief1_title: "மூடும் மீட்பு டிப்ரீப்",
    ep_debrief1_sub: "படி 1/3: தூண்டுதல் சூழலைப் பதிவு செய்தல்",
    ep_debrief1_trigger: "இந்த தீவிர எபிசோடை எது தூண்டியது? (விருப்பத்தேர்வு)",
    ep_debrief1_placeholder: "எ.கா. உணரப்பட்ட நிராகரிப்பு, கடுமையான பணி ஏமாற்றம், தூக்கமின்மை...",
    ep_debrief1_skip: "தவிர்க்கவும்",
    ep_debrief1_save: "சேமித்து அடுத்து",
    ep_debrief2_title: "டிப்ரீப்: சமாளிப்பு சரிபார்ப்பு",
    ep_debrief2_sub: "படி 2/3: எந்த திறன்கள் உங்களுக்கு உதவின என்பதைச் சரிபார்க்கவும்",
    ep_debrief2_prompt: "இந்த அமர்வில் எது அதிகம் உதவியது? உதவும் கருவிகளைத் தேர்ந்தெடுக்கவும்:",
    ep_debrief2_continue: "தொடரவும்",
    ep_debrief3_title: "டிப்ரீப்: தீவிர பயணம்",
    ep_debrief3_sub: "படி 3/3: உங்கள் இறுதி தற்போதைய நிலையை மதிப்பிடவும்",
    ep_debrief3_when_started: "நீங்கள் தொடங்கியபோது",
    ep_debrief3_highest: "மிக உயர்ந்த புள்ளி",
    ep_debrief3_final: "உங்கள் தீவிர மதிப்பீடு இப்போது எங்கு முடிகிறது?",
    ep_saved_title: "அமர்வு ஆஃப்லைனில் சேமிக்கப்பட்டது",
    ep_saved_body: "நீங்கள் அதைத் தாண்டி வந்தீர்கள். அது இப்போது உணர்வதை விட அதிக முக்கியத்துவம் வாய்ந்தது.",
    ep_saved_done: "இப்போதைக்கு முடித்துவிட்டேன்",
    ep_synthetic_logged: "தற்போதைய தீவிரம் பதிவு செய்யப்பட்டது: {n}/10.",
    ep_synthetic_user: "என் தற்போதைய தீவிரம் {n}/10. அதை ஏற்றுக்கொண்டு, ஒரு பொருத்தமான துயர-தீர்வு திறனின் வழியே என்னை வழிநடத்துங்கள்.",
    ep_synthetic_initial: "என்னைப் பாதுகாப்பாக வழிநடத்த உதவ, உறுதி செய்வோம்: நீங்கள் இப்போது அனுபவிப்பது 1 முதல் 10 வரையிலான அளவில் எவ்வளவு தீவிரம்?",
    ep_synthetic_reprompt: "இப்போது சற்று நிறுத்தி இங்கே திரும்புவோம்: 1 முதல் 10 வரை உங்கள் தீவிர மதிப்பீடு என்ன?",
    ex_crisis_title: "நீங்கள் முக்கியம் — ஆதரவு இப்போதே இங்கே உள்ளது",
    ex_crisis_body: "நீங்கள் எழுதியது ஒரு வெளிப்பாடு படியை விட அதிகமாகத் தெரிகிறது. இது ஒரு மனிதருக்கான தருணம், பயிற்சி அல்ல — தயவுசெய்து இப்போதே தொடர்பு கொள்ளுங்கள். நீங்கள் தனியாக இல்லை.",
    ex_crisis_back: "பயிற்சிக்குத் திரும்பு",
    ex_close: "மூடு",
    ex_subtitle: "படிகள் SUDS (0–100) மூலம் வரிசைப்படுத்தப்படுகின்றன. கீழிருந்து மேலே வேலை செய்யுங்கள் — எளிதானதிலிருந்து தொடங்குங்கள்.",
    ex_completed: "நிறைவு",
    ex_avg_suds: "சராசரி SUDS குறைவு",
    ex_celebrate: "படி நிறைவடைந்தது — {step}. அது கடினமாக இருந்தாலும் தைரியம் தேவை.",
    ex_complete_step: "இந்தப் படியை நிறைவு செய்யுங்கள்",
    ex_suds_after: "வெளிப்பாட்டிற்குப் பின் SUDS: {n}",
    ex_reflect_prompt: "சிந்திக்கத் தகுந்த சில விஷயங்கள்:",
    ex_learned_placeholder: "நீங்கள் என்ன கற்றீர்கள்? (விருப்பத்தேர்வு)",
    ex_save: "சேமி",
    ex_cancel: "ரத்து",
    ex_reflection_note: "தடுப்பு-கற்றல் மாதிரியை அடிப்படையாகக் கொண்ட பிரதிபலிப்பு வழிகாட்டிகள் (Craske, Treanor, Conway, Zbozinek & Vervliet, 2014) — நீங்கள் கணித்ததற்கு மாறாக உண்மையில் என்ன நடந்தது என்பதைக் கவனிப்பது, வெளிப்பாட்டுக் கற்றல் நிலைத்திருக்க ஆராய்ச்சி பரிந்துரைக்கும் விஷயம்.",
    ex_suds_label: "SUDS: {n}",
    ex_complete_btn: "நிறைவு",
    ex_no_steps: "இன்னும் படிகள் இல்லை. கீழே உங்கள் முதல் படியைச் சேர்க்கவும்.",
    ex_step_placeholder: "வெளிப்பாட்டு படி...",
    ex_suds_slider: "SUDS: {n}",
    ex_add_step: "படி சேர்க்கவும்",
    ex_title: "வெளிப்பாட்டு படிநிலை",
    ex_body: "பயத்தின் ஏணியைக் கட்டுங்கள். கீழிருந்து மேலே வேலை செய்யுங்கள் — மிகக் கடினமான இடத்திலிருந்து அல்ல, எளிதான இடத்திலிருந்து தொடங்குங்கள்.",
    ex_hierarchy_name: "படிநிலை பெயர் (எ.கா. சமூக கவலை)",
    ex_confirm_remove: "படியை நீக்கவா?",
    ex_confirm_message: "இந்தப் படி உங்கள் படிநிலையிலிருந்து நீக்கப்படும். இந்தப் படியின் முன்னேற்றம் இழக்கப்படும்.",
    ex_remove: "நீக்கு",
    ex_keep: "வை",
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
    error_default_title: "ఏదో తప్పు జరిగింది",
    warning_default_title: "హెచ్చరిక",
    info_default_title: "సమాచారం",
    dismiss_error: "విస్మరించు",
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
    perfSub: "వెబ్ వైటల్స్, మోడల్ క్యాచ్, క్రాష్ లాగ్ — ఈ పరికరంలో మాత్రమే",
    tool_group_moment: "ఈ క్షణంలో",
    tool_group_calm: "ప్రశాంతత",
    tool_plan_label: "శ్వాస మరియు గ్రౌండింగ్",
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
    you_progress_label: "మీ పురోగతి",
    you_progress_sub: "స్ట్రీక్‌లు, మైలురాళ్లు మరియు మీరు సాధించినవి",
    achievements_title: "సాధనలు",
    achievements_empty: "చిన్న అడుగులు కూడా ముఖ్యమైనవి. మీ మొదటి చెక్-ఇన్ మీకు మొదటి బ్యాడ్జ్‌ను ఇస్తుంది.",
    milestones_title: "స్ట్రీక్ మైలురాళ్లు",
    milestones_body: "ప్రతి 3, 7, 14, 30, 60 మరియు 100 రోజులకు మీరు వచ్చినందుకు గర్వపడవచ్చు.",
    streak_milestone_reached: "మైలురాయి చేరుకున్నారు — వచ్చినందుకు గర్వపడండి.",
    you_nila_memory_label: "నీలా ఏమి గుర్తుంచుకుంటుంది",
    you_nila_memory_sub: "ఆమె తెలిసినదాన్ని చూడండి, సవరించండి లేదా తొలగించండి",
    you_settings_label: "సెట్టింగ్‌లు",
    you_settings_sub: "వాయిస్, రిమైండర్లు, రికవరీ వాక్యం",
    you_caregiver_label: "నమ్మకమైన వ్యక్తితో షేర్ చేయి",
    you_caregiver_sub: "కుటుంబ మద్దతు కోసం స్నాప్‌షాట్ రూపొందించు",
    you_group_resources: "బాహ్య వనరులు",
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
    mood_avg_7d: "మూడ్ సగటు (7 రోజులు)",
    from_last_week: "గత వారం నుండి",
    avg_sleep: "సగటు నిద్ర",
    days_active: "సక్రియ రోజులు",
    streak: "క్రమం",
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
    hero_crisis: "మీరు దీనిలో ఒంటరి కాదు. ఇప్పుడే మద్దతు చేరుకుందాం.",
    hero_crisis_label: "మద్దతు పొందండి",
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
    monthly_word_calm: "ప్రశాంతమైన",
    monthly_word_steady: "స్థిరమైన",
    monthly_word_choppy: "హెచ్చుతగ్గులు ఉన్న",
    monthly_word_rough: "కష్టమైన",
    narr_tracking_body: "ఈ నెల {word}గా అనిపించింది, మూడ్ సగటున {avg}/10 ({min}-{max}). ఎక్కువగా మీరు {emotion} అనుభవించారు. మీరు {days}/{total} రోజులు చెక్-ఇన్ చేశారు — {pacing}.",
    emotion_calm: "ప్రశాంత క్షణాలు",
    emotion_anxious: "ఆందోళన ఆలోచనలు",
    emotion_sad: "లోతైన భావాలు",
    emotion_angry: "అలసట క్షణాలు",
    emotion_hopeful: "ఆశావహ కిరణాలు",
    pacing_strong: "ఈ నెల బలమైన నిలకడ!",
    pacing_good: "మంచి వేగం పెరుగుతోంది.",
    pacing_keep: "ప్రతి చెక్-ఇన్ స్పష్టత ఇస్తుంది — కొనసాగించండి.",
    quiet_step_away: "మీరు {mins} నిమిషాలుగా ఇక్కడే ఉన్నారు. మీ మనసు తొట్టలుగా ఉంటే, చిన్న విరామం లేదా నెమ్మది శ్వాస ఎక్కువ స్క్రీన్ కంటే ఎక్కువ సహాయపడుతుంది. ఆర్పు లేదు — నీలా ఇక్కడే ఉంటుంది.",
    dismiss: "మూసివేయి",
    no_signals_title: "సిగ్నల్ విభాగంలో నిశ్శబ్దంగా ఉంది",
    no_sessions_title: "నీలాతో మీ సంభాషణలు",
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
    ema_how_are_you: "ఇప్పుడు ఎలా అనిపిస్తోంది?",
    ema_energy: "శక్తి స్థాయి",
    ema_valence_very_bad: "చాలా చెడు",
    ema_valence_bad: "చెడు",
    ema_valence_neutral: "సాధారణం",
    ema_valence_good: "మంచి",
    ema_valence_very_good: "చాలా మంచి",
    ema_energy_very_low: "చాలా తక్కువ",
    ema_energy_low: "తక్కువ",
    ema_energy_moderate: "సగటు",
    ema_energy_high: "ఎక్కువ",
    ema_note_placeholder: "గమనిక చేర్చండి — మనసులో ఏముంది?",
    gate_error_title: "ధృవీకరణ లోపం",
    gate_error_body: "మీ డేటా పరికరంలోనే ఉంది, కానీ సురక్షితంగా చదవలేకపోయాము. మళ్ళీ ప్రయత్నించండి.",
    gate_try_again: "మళ్ళీ ప్రయత్నించండి",
    gate_securing: "మీ డేటా సురక్షితం చేయబడుతోంది…",
    gate_pin_error: "తప్పు PIN — మళ్ళీ ప్రయత్నించండి.",
    gate_welcome_back: "తిరిగి స్వాగతం",
    gate_unlock_body: "NilaMind అన్‌లాక్ చేయడానికి PIN నమోదు చేయండి.",
    gate_pin_placeholder: "PIN నమోదు చేయండి",
    gate_unlock: "అన్‌లాక్",
    gate_privacy_note: "మీ PIN ఈ పరికరం నుండి బయటకు వెళ్ళదు.",
    msg_feedback_toggle: "ఇది సహాయకరంగా ఉందా?",
    msg_thanks_feedback: "అభిప్రాయానికి ధన్యవాదాలు!",
    msg_feedback_prompt: "Nila కు ఏది పని చేస్తుందో నేర్పించండి",
    msg_feedback_placeholder: "Nila కు ఏది సహాయపడిందో లేదా సహాయపడలేదో చెప్పండి…",
    msg_not_now: "ఇప్పుడు కాదు",
    msg_share: "షేర్ చేయండి",
    learn_badge_skill: "నైపుణ్యం",
    learn_badge_explainer: "వివరణ",
    learn_badge_research: "పరిశోధన",
    learn_title: "నేర్చుకోండి",
    learn_subtitle: "ఆధారిత నైపుణ్యాలు మరియు సరళమైన వివరణలు",
    learn_crisis_heading: "ఇప్పుడు సంక్షోభంలో ఉన్నారా?",
    learn_crisis_dismiss: "సంక్షోభంలో లేను",
    learn_support_cta: "మద్దతు కోసం సంప్రదించండి",
    learn_hard_moment: "ఇప్పుడు కష్టమైన సమయం?",
    learn_hard_moment_sub: "మీరు ఒంటరిగా లేరు. సహాయం అందుబాటులో ఉంది.",
    learn_for_feeling: "మీరు వెతుకుతున్నది ఇది",
    learn_search_placeholder: "నైపుణ్యాలను వెతకండి…",
    learn_filter_all: "అన్నీ",
    learn_filter_all_skills: "అన్ని నైపుణ్యాలు",
    learn_results_count: "{n} నైపుణ్యాలు",
    learn_loading: "లోడ్ అవుతోంది…",
    learn_no_results: "నైపుణ్యాలు సరిపోలడం లేదు.",
    learn_footer_disclaimer: "NilaMind విద్యా మద్దతు — చికిత్స, నిర్ధారణ లేదా సంక్షోభ సేవ కాదు.",
    learn_what_it_is: "ఇది ఏమిటి",
    learn_why_it_helps: "ఎందుకు సహాయపడుతుంది",
    learn_the_research: "పరిశోధన",
    learn_reference_verifying: "సూచనలను ధృవీకరిస్తోంది",
    learn_reference_verifying_hint: "ఉల్లేఖించబడిన అధ్యయనాలు ఖచ్చితమైనవా అని ధృవీకరిస్తోంది…",
    reach_title: "సంప్రదించండి",
    reach_subtitle: "నమ్మకమైన వ్యక్తికి పంపగల సందేశం",
    reach_crisis_heading: "ఇప్పుడు — సంక్షోభ మద్దతు",
    reach_crisis_body: "మీరు తక్షణ ప్రమాదంలో ఉంటే, స్థానిక అత్యవసర నంబర్ లేదా సంక్షోభ హెల్ప్‌లైన్‌ను కాల్ చేయండి.",
    reach_your_kept_message: "సేవ్ చేసిన సందేశం",
    reach_send_anyway: "అయినా పంపండి",
    reach_copy: "సందేశం కాపీ చేయండి",
    reach_back_to_writing: "రాయడానికి తిరిగి",
    reach_need_support: "ఇప్పుడు మద్దతు కావాలా?",
    reach_start_with: "దీనితో ప్రారంభించండి",
    reach_write_own: "సొంతంగా రాయండి",
    reach_message_placeholder: "నమ్మకమైన వ్యక్తికి సందేశం రాయండి…",
    reach_send: "పంపండి",
    reach_footer_advice: "పంపడం ఎల్లప్పుడూ మీ ఎంపిక. NilaMind మీ తరపున ఏమీ పంపదు.",
    id_welcome_title: "NilaMind కు స్వాగతం",
    id_welcome_body: "మీ వ్యక్తిగత ఆరోగ్య సహచరుడు. ప్రతిదీ మీ పరికరంలోనే ఉంటుంది.",
    id_create_new: "కొత్త స్థలం సృష్టించండి",
    id_restore_phrase: "రికవరీ వాక్యం నుండి పునరుద్ధరించండి",
    id_save_phrase_title: "మీ రికవరీ వాక్యాన్ని సేవ్ చేయండి",
    id_save_phrase_body: "ఈ 12 పదాలను రాసి సురక్షితమైన చోట ఉంచండి. పునరుద్ధరించడానికి ఇదే ఏకైక మార్గం.",
    id_copy_phrase: "వాక్యం కాపీ చేయండి",
    id_copied: "కాపీ చేయబడింది",
    id_phrase_warning: "రాసి ఉంచండి. ఈ వాక్యం పోతే డేటా పునరుద్ధరించబడదు.",
    id_phrase_confirmed: "నేను రాసేశాను",
    id_enter_nila: "NilaMind లోకి ప్రవేశించండి",
    id_restore_title: "మీ స్థలాన్ని పునరుద్ధరించండి",
    id_restore_body: "డేటా పునరుద్ధరించడానికి 12-పద రికవరీ వాక్యాన్ని నమోదు చేయండి.",
    id_restore_placeholder: "పదం పదం పదం…",
    id_restore_backup_label: "ఐచ్ఛికం: బ్యాకప్ కోడ్ పేస్ట్ చేయండి",
    id_restore_backup_placeholder: "బ్యాకప్ కోడ్",
    id_restore_button: "పునరుద్ధరించండి",
    id_error_create: "మీ స్థలం సృష్టించడంలో లోపం. మళ్ళీ ప్రయత్నించండి.",
    id_error_invalid_phrase: "ఇది 12-పద వాక్యంలా అనిపించలేదు.",
    id_error_backup_read: "మీ వాక్యం సరైనది, కానీ బ్యాకప్ చదవలేకపోయింది.",
    id_error_restore: "ఆ వాక్యం నుండి పునరుద్ధరించలేకపోయాము. మళ్ళీ ప్రయత్నించండి.",
    you_elevated_hint: "ఎక్కువ శక్తి — మీ నమూనాలు చూడండి లేదా డాష్‌బోర్డ్ చూడండి.",
    you_elevated_label: "డాష్‌బోర్డ్",
    you_anxious_hint: "ఆందోళనగా ఉందా? అంతర్దృష్టి లేదా ఆలోచన రికార్డు సహాయపడవచ్చు.",
    you_anxious_label: "అంతర్దృష్టి",
    you_low_hint: "చిన్న అడుగు కూడా ముఖ్యం. పురోగతి లేదా డాష్‌బోర్డ్ చూడండి.",
    you_low_label: "పురోగతి",
    you_night_hint: "ప్రశాంత సమయం — మీ వారం ఎలా ఉందో చూడండి.",
    you_night_label: "డాష్‌బోర్డ్",
    you_evening_hint: "సాయంత్రం చింతన — వారం నమూనాలు చూడండి.",
    you_evening_label: "డాష్‌బోర్డ్",
    you_welcome_checkin_step: "మొదటి తనిఖీ",
    you_welcome_checkin_desc: "Nila కు ఇప్పుడు ఎలా అనిపిస్తోందో చెప్పండి",
    you_welcome_intention_step: "ఉద్దేశ్యం నిర్ణయించండి",
    you_welcome_intention_desc: "ఈ వారం ప్రయత్నించాలనుకుంటున్న చిన్న విషయం",
    you_welcome_dashboard_step: "మీ డాష్‌బోర్డ్ చూడండి",
    you_welcome_dashboard_desc: "మీ పురోగతి రూపొందడం చూడండి",
    you_welcome_title: "NilaMind కు స్వాగతం",
    you_welcome_body: "మీ వ్యక్తిగత ఆరోగ్య సహచరుడు. ప్రతిదీ మీ పరికరంలోనే ఉంటుంది.",
    you_badge_on_device: "పరికరంలో",
    you_badge_crisis: "సంక్షోభ మద్దతు ఎల్లప్పుడూ ఇక్కడ",
    you_streak_this_week: " రోజులు ఈ వారం",
    you_mostly: "ప్రధానంగా ",
    you_fallback_emotion: "తనిఖీ చేస్తోంది",
    you_heavy_encouragement: "ఈ రోజు భారంగా అనిపించవచ్చు — సరే. ఇక్కడ ఉండటమే చాలు.",
    you_data_error: "కొంత డేటా లోడ్ కాలేదు. క్రిందికి లాగండి.",
    you_intention_title: "ఈ వారం ఉద్దేశ్యం",
    you_intention_done: "పూర్తయింది",
    you_intention_clear: "తొలగించు",
    you_intention_set_label: "ఉద్దేశ్యం నిర్ణయించండి",
    you_intention_set_desc: "ఈ వారం ప్రయత్నించాలనుకుంటున్న చిన్న విషయం",
    you_intention_picker_title: "ఉద్దేశ్యం నిర్ణయించండి",
    you_intention_picker_helper: "ఒకటి ఎంచుకోండి, లేదా మీ సొంతంగా రాయండి.",
    you_intention_placeholder: "లేదా మీ సొంతంగా రాయండి…",
    you_nudge_title: "అలవాటు చేస్తున్నారా? మరింత ప్రయత్నించండి:",
    you_nudge_checkin: "తనిఖీ",
    you_nudge_diary: "డైరీ",
    you_fewer_resources: "తక్కువ వనరులు చూపించు",
    you_more_resources: " మరిన్ని వనరులు",
    you_footer_disclaimer: "NilaMind వృత్తిపరమైన సంరక్షణతో పాటు మద్దతు — ప్రత్యామ్నాయం కాదు.",
    tr_subtitle: "ఒక బరువైన ఆలోచనను గమనించండి, దాన్ని నిష్పక్షపాతంగా చూడండి, మరింత దయగల, నిజమైన దృక్కోణాన్ని ప్రయత్నించండి.",
    tr_step_of: " / 5",
    tr_step1_title: "దశ 1: పరిస్థితి",
    tr_step1_question: "ఏమి జరిగింది?",
    tr_step1_placeholder: "ట్రిగ్గరింగ్ సంఘటనను వివరించండి: ఉదా., 'మధ్యాహ్నం స్నేహితుడితో డిన్నర్ ప్లాన్ల గురించి వాదన...'",
    tr_step2_title: "దశ 2: ప్రాథమిక భావన",
    tr_step2_question: "మీరు ఏమి అనుభవించారు?",
    tr_step2_placeholder: "ఉదా. సిగ్గు, తీవ్ర కోపం, విడిచిపెట్టడం, భయం",
    tr_step2_intensity: "భావన తీవ్రత?",
    tr_step3_title: "దశ 3: అవాంఛిత ఆలోచన",
    tr_step3_question: "మీ మనసులో ఏ స్వయంచాలిత ఆలోచనలు వచ్చాయి?",
    tr_step3_placeholder: "ఉదా. 'వారు నన్ను విడిచిపెడుతున్నారు ఎందుకంటే నేను పూర్తిగా విషపూరితమైన మరియు ప్రేమలేనివాడిని...'",
    tr_step3_belief: "ఈ ఆలోచనను మీరు ఎంత నమ్ముతున్నారు?",
    tr_spot_looking: "చూస్తోంది...",
    tr_spot_traps: "ఉచ్చులు కనుగొనండి",
    tr_step4_title: "దశ 4: ఉచ్చు కార్డులను గుర్తించండి",
    tr_step4_instruction: "ఈ సమయంలో ఏ అంతర్జ్ఞాన వికృతులు వర్తిస్తాయి?",
    tr_step4_active: "సక్రియం",
    tr_step5_title: "దశ 5: పునర్నిర్మాణ మానసిక స్థితి",
    tr_step5_question: "మరింత సమతుల్య ఆలోచన ఏమిటి?",
    tr_step5_placeholder: "ఒక వస్తునిష్ఠ పునర్మూల్యాంకనం తయారు చేయండి...",
    tr_step5_reenable: "అసలు భావన తీవ్రతను మళ్ళీ రేట్ చేయండి:",
    tr_step5_asking: "Nila ని అడుగుతోంది...",
    tr_step5_ask_nila: "Nila ని అడగండి",
    tr_step5_crisis_heading: "మీరు రాసింది ఈ వ్యాయామం కంటే ముఖ్యమైనది",
    tr_success_message: "% (from % to %)! ఆలోచనలను పునర్నిర్మాణం చేయడం శారీరక మార్గాలను శాంతపరచడంలో సహాయపడుతుంది.",
    tr_btn_back: "వెనుకకు",
    tr_btn_continue: "కొనసాగించు",
    tr_btn_saved: "లాగ్ సేవ్ చేయబడింది!",
    tr_btn_complete: "రికార్డు పూర్తి చేయండి",
    tr_no_traps: "స్పష్టమైన ఆలోచన ఉచ్చులు కనుగొనబడలేదు — సరే, ఇది తీర్పు కాదు.",
    tr_empty_error: "ఏమి జరిగింది మరియు ఏ స్వయంచాలిత ఆలోచనలు వచ్చాయో వివరించండి.",
    tr_nil_fail: "ఇప్పుడు Nila ని చేరుకోలేకపోయాము. మీ సమతుల్య ఆలోచన రాయండి లేదా మళ్ళీ ప్రయత్నించండి.",
    tr_trap_all_or_nothing: "అన్నీ లేదా ఏమీ లేదు",
    tr_trap_all_or_nothing_desc: "పరిపూర్ణంగా లేకపోతే, పూర్తిగా విఫలమైంది",
    tr_trap_catastrophising: "విపత్తు ఊహ",
    tr_trap_catastrophising_desc: "ఇది ఖచ్చితంగా విపత్తు అవుతుంది",
    tr_trap_mind_reading: "మనసు చదవడం",
    tr_trap_mind_reading_desc: "వారు నేను అసమర్థుడని అనుకుంటున్నారని ఇప్పటికే తెలుసు",
    tr_trap_fortune_telling: "భవిష్యత్ చెప్పడం",
    tr_trap_fortune_telling_desc: "ఇది తప్పు అవుతుందని ఖచ్చితంగా తెలుసు",
    tr_trap_emotional_reasoning: "భావన కారణం",
    tr_trap_emotional_reasoning_desc: "నేను విలువలేనివాడిగా భావిస్తున్నాను, కాబట్టి నిజంగా అలానే",
    tr_trap_should_statements: "చేయాలి ప్రకటనలు",
    tr_trap_should_statements_desc: "నేను దీని కంటే బాగా చేయాలి",
    tr_trap_labelling: "లేబుల్ చేయడం",
    tr_trap_labelling_desc: "నేను విఫలమైన / చెడు వ్యక్తి",
    tr_trap_personalisation: "వ్యక్తిగతీకరణ",
    tr_trap_personalisation_desc: "ఇది పూర్తిగా నా తప్పు",
    tr_trap_mental_filter: "మానసిక ఫిల్టర్",
    tr_trap_mental_filter_desc: "ఋణాత్మకంపై మాత్రమే దృష్టి పెట్టండి",
    tr_trap_magnification: "పెద్దది చేయడం",
    tr_trap_magnification_desc: "ప్రతిదీ పెద్దదిగా చేయడం",
    // Episode Support (ep_*) — 2026-08-03
    ep_here: "నేను ఇక్కడ ఉన్నాను.",
    ep_opening_body: "ఇది మీ ఎపిసోడ్ మద్దతు సాధనం — ఒక AI, మానవుడు కాదు. నేను మానవుని స్థానంలో ఉండలేను, కానీ తర్వాతి కొన్ని నిమిషాలను నావిగేట్ చేయడానికి స్థిరమైన ఆలోచనలను పొందడంలో మీకు సహాయపడగలను.",
    ep_opening_question: "ఇప్పుడు ఏమి జరుగుతోంది?",
    ep_placeholder: "మీరు ఎలా భావిస్తున్నారు, మిమ్మల్ని ఏది ట్రిగ్గర్ చేసింది, లేదా మీకు ఏ అవాంఛిత కోరిక ఉందో వివరించండి... (వచనం 100% సురక్షితం/గోప్యం)",
    ep_start: "ఎపిసోడ్ మద్దతు ప్రారంభించండి",
    ep_offline_note: "Nila పూర్తిగా మీ పరికరంలో నడుస్తుంది — కనెక్షన్ అవసరం లేదు. మోడల్ ఇంకా లోడ్ అవుతుంటే, సురక్షితమైన గైడెడ్ మోడ్ స్వయంచాలకంగా నడుస్తుంది.",
    ep_end_session: "సెషన్ ముగించండి",
    ep_live_badge: "Nila · పరికరంలో",
    ep_not_therapist: "థెరపిస్ట్ కాదు. నిర్ధారణ సాధనం కాదు.",
    ep_crisis_tap: "సంక్షోభంలో ఉన్నారా? ఇప్పుడే కాల్ చేయడానికి ట్యాప్ చేయండి:",
    ep_shielding: "భద్రతా కవచం సక్రియంగా ఉంది",
    ep_return_home: "హోమ్‌కు తిరిగి వెళ్ళండి",
    ep_intensity_prompt: "మీ ప్రస్తుత తీవ్రతను ఎంచుకోండి (1 ప్రశాంతం, 10 సంక్షోభ పరిమితి):",
    ep_chat_placeholder: "మీరు ఎలా భావిస్తున్నారో వ్యక్తపరచండి...",
    ep_send: "పంపండి",
    ep_escalation_title: "మీరు 20 నిమిషాలుగా ఇందులో ఉన్నారు, ఇంకా అధిక తీవ్రతలో ఉన్నారు.",
    ep_escalation_body: "ఇది మానవుని క్షణం. నేను సహాయం చేయలేనందువల్ల కాదు — మానవులు నేను నిజంగా చేయలేని పని చేయగలరు: మీతో శారీరకంగా ఉండి మీ గొంతు వినడం.",
    ep_escalation_keep: "Nila తో మాట్లాడటం కొనసాగించండి",
    ep_guided_title: "గైడెడ్ ఆఫ్‌లైన్ మోడ్",
    ep_guided_badge: "కనెక్షన్ అవసరం లేదు",
    ep_guided_init_body: "AI సహచరుడు ప్రస్తుతం అందుబాటులో లేడు, కానీ నేను మిమ్మల్ని ఇందులో నడిపించగలను. దశలవారీగా ముందుకు వెళ్దాం.",
    ep_guided_intensity: "మీరు ఇప్పుడు భావిస్తున్నది ఎంత తీవ్రం?",
    ep_tipp_title: "జీవశాస్త్ర షాక్ రీసెట్",
    ep_tipp_body: "మీ తీవ్రత అత్యంతం. అంటే మీ ఆలోచించే మెదడు ఆఫ్‌లైన్లో ఉంది. ఇది జీవశాస్త్రం, బలహీనత కాదు. ఇప్పుడు సరిపోయేదాన్ని ప్రయత్నించండి.",
    ep_tipp_done: "నేను ముగించడానికి సిద్ధంగా ఉన్నాను",
    ep_medium_question: "ఇప్పుడు బలమైన అవాంఛిత ఆలోచన ఏది?",
    ep_medium_racing: "వేగంగా, గందరగోళంగా తిరుగుతున్న ఆలోచనలు",
    ep_medium_harm: "నాకు హాని చేసుకోవాలనే లేదా హఠాత్తుగా ప్రవర్తించాలనే తీవ్రమైన కోరిక",
    ep_medium_shame: "తీవ్రమైన అవమానం లేదా నన్ను నేను ద్వేషించడం",
    ep_panic_title: "బాక్స్ బ్రీతింగ్",
    ep_panic_body: "నెమ్మదైన, స్థిరమైన శ్వాస మీ శరీరాన్ని స్థిరపరుస్తుంది మరియు వేగవంతమైన మనస్సును శాంతింపజేయడంలో సహాయపడుతుంది. 4-4-4-4 చక్రాలు చేద్దాం: 4 సెకన్లు లోపలికి ఊపిరి తీసుకోండి, 4 సెకన్లు ఆపండి, 4 సెకన్లు బయటకు వదలండి, 4 సెకన్లు ఆపండి.",
    ep_panic_done: "అయిపోయింది",
    ep_harm_title: "వేవ్ సర్ఫింగ్ స్క్రిప్ట్",
    ep_harm_body: "కోరికలు అలల లాంటివి. మీరు వాటిని పోషించకపోతే అవి లేచి, శిఖరాన్ని చేరి, అనివార్యంగా పడిపోతాయి. మిమ్మల్ని సురక్షితమైన సర్ఫ్‌బోర్డ్‌పై ఉన్నట్లు ఊహించుకోండి. పాదాలను నొక్కి స్థిరంగా ఉండండి — కోరికతో పోరాడకండి. కేవలం 10 నిమిషాలు దాన్ని భరించండి.",
    ep_harm_done: "అయిపోయింది",
    ep_shame_title: "Neff సెల్ఫ్-కంపాషన్ స్క్రిప్ట్",
    ep_shame_body: "సెల్ఫ్-కంపాషన్ విరామం తీసుకోండి. నెమ్మదిగా చదవండి: \"ఇది కష్టం. ఈ బాధ జీవితంలో భాగం. కన్నీళ్లలో ఉన్న ప్రియమైన స్నేహితుడికి నేను ఇచ్చే దయను నాకు కూడా ఇస్తాను.\"",
    ep_shame_proceed: "డిబ్రీఫ్‌కు వెళ్ళండి",
    ep_low_body: "మీరు స్థిరమైన స్థానంలో ఉన్నారు. మన వ్యవస్థలను శాంతింపజేసి, సున్నితమైన ముగింపుకు వెళ్దాం.",
    ep_low_done: "సురక్షిత ముగింపు",
    ep_debrief1_title: "ముగింపు రికవరీ డిబ్రీఫ్",
    ep_debrief1_sub: "దశ 1/3: ట్రిగ్గర్ సందర్భాన్ని ట్రాక్ చేయడం",
    ep_debrief1_trigger: "ఈ తీవ్రమైన ఎపిసోడ్‌ను ఏది ట్రిగ్గర్ చేసింది? (ఐచ్ఛికం)",
    ep_debrief1_placeholder: "ఉదా. తిరస్కరించబడినట్లు భావించడం, తీవ్రమైన పని నిరాశ, నిద్ర లేకపోవడం...",
    ep_debrief1_skip: "దాటవేయి",
    ep_debrief1_save: "సేవ్ & తదుపరి",
    ep_debrief2_title: "డిబ్రీఫ్: కోపింగ్ ధృవీకరణ",
    ep_debrief2_sub: "దశ 2/3: ఏ నైపుణ్యాలు మీకు సహాయపడ్డాయో తనిఖీ చేయండి",
    ep_debrief2_prompt: "ఈ సెషన్‌లో ఏది ఎక్కువగా సహాయపడింది? సహాయకరమైనవాటిని టోగుల్ చేయండి:",
    ep_debrief2_continue: "కొనసాగించండి",
    ep_debrief3_title: "డిబ్రీఫ్: తీవ్రత ప్రయాణం",
    ep_debrief3_sub: "దశ 3/3: మీ చివరి ప్రస్తుత స్థితిని రేట్ చేయండి",
    ep_debrief3_when_started: "మీరు ప్రారంభించినప్పుడు",
    ep_debrief3_highest: "అత్యధిక స్థానం",
    ep_debrief3_final: "మీ తీవ్రత రేటింగ్ ఇప్పుడు ఎక్కడ ముగుస్తోంది?",
    ep_saved_title: "సెషన్ ఆఫ్‌లైన్‌లో సేవ్ చేయబడింది",
    ep_saved_body: "మీరు దీన్ని దాటారు. అది ఇప్పుడు అనిపించే దాని కంటే ఎక్కువ ముఖ్యం.",
    ep_saved_done: "ఇప్పుడు నాకు సరిపోతుంది",
    ep_synthetic_logged: "ప్రస్తుత తీవ్రత లాగ్ చేయబడింది: {n}/10.",
    ep_synthetic_user: "నా ప్రస్తుత తీవ్రత {n}/10. దాన్ని గుర్తించి, సరిపోలే ఒక డిస్ట్రెస్-రిజల్యూషన్ నైపుణ్యం ద్వారా నన్ను నడిపించండి.",
    ep_synthetic_initial: "నన్ను సురక్షితంగా నడిపించడానికి, నిర్ధారించుకుందాం: మీరు ఇప్పుడు అనుభవిస్తున్నది 1 నుండి 10 స్కేల్‌లో ఎంత తీవ్రం?",
    ep_synthetic_reprompt: "ఆగి ఇప్పుడే ఇక్కడికి తిరిగి వద్దాం: 1 నుండి 10 వరకు మీ తీవ్రత రేటింగ్ ఎంత?",
    ex_crisis_title: "మీరు ముఖ్యులు — మద్దతు ఇప్పుడే ఇక్కడ ఉంది",
    ex_crisis_body: "మీరు ఇప్పుడే రాసినది ఒక ఎక్స్పోజర్ దశ కంటే ఎక్కువగా అనిపిస్తుంది. ఇది ఒక వ్యక్తి కోసం క్షణం, వ్యాయామం కాదు — దయచేసి ఇప్పుడే సంప్రదించండి. మీరు ఒంటరిగా లేరు.",
    ex_crisis_back: "వ్యాయామానికి తిరిగి వెళ్ళండి",
    ex_close: "మూసివేయి",
    ex_subtitle: "దశలు SUDS (0–100) ప్రకారం ర్యాంక్ చేయబడతాయి. దిగువ నుండి పైకి పని చేయండి — సులభమైన దానితో ప్రారంభించండి.",
    ex_completed: "పూర్తయింది",
    ex_avg_suds: "సగటు SUDS తగ్గుదల",
    ex_celebrate: "దశ పూర్తయింది — {step}. అది కష్టంగా ఉన్నా ధైర్యం అవసరం.",
    ex_complete_step: "ఈ దశను పూర్తి చేయండి",
    ex_suds_after: "ఎక్స్పోజర్ తర్వాత SUDS: {n}",
    ex_reflect_prompt: "ప్రతిబింబించడానికి విలువైన కొన్ని విషయాలు:",
    ex_learned_placeholder: "మీరు ఏమి నేర్చుకున్నారు? (ఐచ్ఛికం)",
    ex_save: "సేవ్ చేయి",
    ex_cancel: "రద్దు",
    ex_reflection_note: "ఇన్హిబిటరీ-లెర్నింగ్ మోడల్ ఆధారిత ప్రతిబింబ ప్రాంప్ట్‌లు (Craske, Treanor, Conway, Zbozinek & Vervliet, 2014) — మీరు ఊహించిన దాని కంటే వాస్తవంగా ఏమి జరిగిందో గమనించడం, ఎక్స్పోజర్ అభ్యాసం నిలిచిపోకుండా ఉండటానికి పరిశోధన సూచించేది.",
    ex_suds_label: "SUDS: {n}",
    ex_complete_btn: "పూర్తి చేయండి",
    ex_no_steps: "ఇంకా దశలు లేవు. క్రింద మీ మొదటి దశను జోడించండి.",
    ex_step_placeholder: "ఎక్స్పోజర్ దశ...",
    ex_suds_slider: "SUDS: {n}",
    ex_add_step: "దశను జోడించండి",
    ex_title: "ఎక్స్పోజర్ హైరార్కీ",
    ex_body: "భయాల నిచ్చెనను నిర్మించండి. దిగువ నుండి పైకి పని చేయండి — అత్యంత కష్టమైన చోట కాదు, సులభమైన చోట ప్రారంభించండి.",
    ex_hierarchy_name: "హైరార్కీ పేరు (ఉదా. సామాజిక ఆందోళన)",
    ex_confirm_remove: "దశను తొలగించాలా?",
    ex_confirm_message: "ఈ దశ మీ హైరార్కీ నుండి తొలగించబడుతుంది. ఈ దశ యొక్క పురోగతి కోల్పోతారు.",
    ex_remove: "తొలగించు",
    ex_keep: "ఉంచుకోండి",
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
