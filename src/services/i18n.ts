// Minimal, privacy-first i18n core. Translations are bundled in the app — no network calls.
// India-first languages: English (default), Hindi, Tamil, Telugu.

import { ls } from "./storageUtils";

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
  | "notTherapy";

const DICT: Record<SupportedLang, Partial<Record<I18nKey, string>>> = {
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
    crisisDisclaimer: "If you're in danger, use the crisis button.",
    notTherapy: "NilaMind is not therapy or a crisis service.",
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
    crisisDisclaimer: "यदि आप खतरे में हैं, तो संकट बटन का उपयोग करें।",
    notTherapy: "NilaMind थेरेपी या संकट सेवा नहीं है।",
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
    crisisDisclaimer: "ஆபத்தில் இருந்தால், அவசர பொத்தானைப் பயன்படுத்தவும்.",
    notTherapy: "NilaMind சிகிச்சை அல்லது அவசர சேவை அல்ல.",
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
    crisisDisclaimer: "ప్రమాదంలో ఉన్నట్లయితే, అత్యవసర బటన్ ఉపయోగించండి.",
    notTherapy: "NilaMind థెరపీ లేదా అత్యవసర సేవ కాదు.",
  },
};

export function getLanguage(): SupportedLang {
  try {
    const raw = ls()?.getItem(STORAGE_KEY);
    if (raw && raw in DICT) return raw as SupportedLang;
  } catch { /* ignore */ }
  return "en";
}

export function setLanguage(lang: SupportedLang): void {
  try { ls()?.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
}

/** Translate a key. Falls back to English, then to the key itself. */
export function t(key: I18nKey, lang: SupportedLang = getLanguage()): string {
  return DICT[lang]?.[key] ?? DICT.en[key] ?? key;
}

/** Convenience hook-free getter for components that read language on mount/render. */
export function currentLanguage(): SupportedLang {
  return getLanguage();
}
