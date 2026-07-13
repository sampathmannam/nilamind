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
  | "tool_peer_support_label"
  | "tool_peer_support_sub"
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
  | "days_logged"
  | "nila_chats_7d"
  | "usage_checkins"
  | "usage_programs"
  | "usage_assessments"
  | "usage_features"
  // Settings sub-section titles (Redesign §2 — Settings hub)
  | "sec_appearance"
  | "sec_voice"
  | "sec_reminders"
  | "sec_ema"
  | "sec_notif_types"
  | "sec_inflection"
  | "sec_health_connect"
  | "sec_on_device"
  | "sec_identity"
  | "sec_privacy_lock"
  | "sec_feedback"
  | "sec_region"
  | "sec_pilot";

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
    tool_diary_label: "Diary",
    tool_diary_sub: "A DBT diary card for today",
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
    tool_peer_support_label: "Peer support",
    tool_peer_support_sub: "Practice reaching out to people who get it",
    tool_group_patterns: "Patterns",
    tool_behaviour_label: "Phone patterns",
    tool_behaviour_sub: "Screen time & sleep vs. mood — on-device",
    you_group_manage: "Manage",
    you_about_nila_label: "About Nila",
    you_about_nila_sub: "How Nila works, privacy, capabilities, and boundaries",
    you_dashboard_label: "Your dashboard",
    you_dashboard_sub: "Streak, mood & score trends, recent Nila",
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
    days_logged: "days logged",
    nila_chats_7d: "Nila chats (7d)",
    usage_checkins: "check-ins",
    usage_programs: "programs done",
    usage_assessments: "assessments",
    usage_features: "features used",
    sec_appearance: "Appearance",
    sec_voice: "Soothing Voice",
    sec_reminders: "Gentle Reminders",
    sec_ema: "Quick Check-ins",
    sec_notif_types: "Notification types",
    sec_inflection: "Gentle Nudges from Nila",
    sec_health_connect: "Sleep from Health Connect",
    sec_on_device: "Nila Runs On Your Device",
    sec_identity: "Account & Recovery",
    sec_privacy_lock: "Privacy Lock",
    sec_feedback: "Feedback & about",
    sec_region: "Crisis lines & region",
    sec_pilot: "Research pilot",
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
    tool_diary_sub: "आज के लिए एक DBT डायरी कार्ड",
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
    tool_peer_support_label: "साथी समर्थन",
    tool_peer_support_sub: "उन लोगों तक पहुंचने का अभ्यास करें जो समझते हैं",
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
    days_logged: "दिन लॉग किए",
    nila_chats_7d: "नीला चैट (7 दिन)",
    usage_checkins: "चेक-इन",
    usage_programs: "पूर्ण कार्यक्रम",
    usage_assessments: "मूल्यांकन",
    usage_features: "उपयोग किए गए फ़ीचर",
    sec_appearance: "दिखावट",
    sec_voice: "सुखद आवाज़",
    sec_reminders: "सौम्य रिमाइंडर",
    sec_ema: "त्वरित चेक-इन",
    sec_notif_types: "सूचना प्रकार",
    sec_inflection: "नीला से सौम्य संकेत",
    sec_health_connect: "हेल्थ कनेक्ट से नींद",
    sec_on_device: "नीला आपके डिवाइस पर चलती है",
    sec_identity: "खाता और रिकवरी",
    sec_privacy_lock: "गोपनीयता लॉक",
    sec_feedback: "प्रतिक्रिया और बारे में",
    sec_region: "संकट लाइनें और क्षेत्र",
    sec_pilot: "अनुसंधान पायलट",
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
    tool_diary_sub: "இன்றைய DBT டைரி அட்டை",
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
    tool_peer_support_label: "சக ஆதரவு",
    tool_peer_support_sub: "உங்களைப் புரிந்துகொள்பவர்களைத் தொடர்பு கொள்வதைப் பயிற்சி செய்யுங்கள்",
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
    days_logged: "நாட்கள் பதிவு செய்யப்பட்டன",
    nila_chats_7d: "நீலா அரட்டைகள் (7 நாட்கள்)",
    usage_checkins: "செக்-இன்கள்",
    usage_programs: "முடிக்கப்பட்ட நிரல்கள்",
    usage_assessments: "மதிப்பீடுகள்",
    usage_features: "பயன்படுத்திய அம்சங்கள்",
    sec_appearance: "தோற்றம்",
    sec_voice: "அமைதியான குரல்",
    sec_reminders: "மென்மையான நினைவூட்டல்கள்",
    sec_ema: "விரைவான செக்-இன்கள்",
    sec_notif_types: "அறிவிப்பு வகைகள்",
    sec_inflection: "நீலாவிடமிருந்து மென்மையான நடவடிக்கைகள்",
    sec_health_connect: "ஹெல்த் கனெக்ட் வழியே தூக்கம்",
    sec_on_device: "நீலா உங்கள் சாதனத்தில் இயங்குகிறது",
    sec_identity: "கணக்கு மற்றும் மீட்பு",
    sec_privacy_lock: "தனியுரிமை பூட்டு",
    sec_feedback: "கருத்து & பற்றி",
    sec_region: "நெருக்கடி வரிகள் & பகுதி",
    sec_pilot: "ஆராய்ச்சி பைலட்",
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
    tool_diary_sub: "ఈ రోజు కోసం DBT డైరీ కార్డ్",
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
    tool_peer_support_label: "సాటి మద్దతు",
    tool_peer_support_sub: "మిమ్మల్ని అర్థం చేసుకునే వారిని సంప్రదించడం అభ్యాసం చేయండి",
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
    days_logged: "రోజులు నమోదు చేయబడ్డాయి",
    nila_chats_7d: "నీలా చాట్‌లు (7రోజులు)",
    usage_checkins: "చెక్-ఇన్‌లు",
    usage_programs: "పూర్తి చేసిన ప్రోగ్రామ్‌లు",
    usage_assessments: "అసెస్‌మెంట్‌లు",
    usage_features: "ఉపయోగించిన ఫీచర్‌లు",
    sec_appearance: "రూపు",
    sec_voice: "ప్రశాంతమైన స్వరం",
    sec_reminders: "మృదువైన రిమైండర్లు",
    sec_ema: "త్వరిత చెక్-ఇన్‌లు",
    sec_notif_types: "నోటిఫికేషన్ రకాలు",
    sec_inflection: "నీలా నుండి మృదువైన నడుపులు",
    sec_health_connect: "హెల్త్ కనెక్ట్ నుండి నిద్ర",
    sec_on_device: "నీలా మీ పరికరంపై నడుస్తుంది",
    sec_identity: "ఖాతా & రికవరీ",
    sec_privacy_lock: "ప్రైవసీ లాక్",
    sec_feedback: "ఫీడ్‌బ్యాక్ & గురించి",
    sec_region: "సంక్షోభ లైన్‌లు & ప్రాంతం",
    sec_pilot: "పరిశోధన పైలట్",
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
