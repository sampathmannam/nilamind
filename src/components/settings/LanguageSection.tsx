import { useState } from "react";
import { Globe } from "lucide-react";
import { LANGUAGES, getLanguage, setLanguage, t, type SupportedLang } from "../../services/i18n";

export default function LanguageSection() {
  const [lang, setLang] = useState<SupportedLang>(getLanguage());

  const handleChange = (code: SupportedLang) => {
    setLanguage(code);
    setLang(code);
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="language-section">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" /> {t("language")}
        </h2>
        <p className="text-base text-ink-muted mt-1 leading-relaxed">
          Choose the language for the app interface. More languages coming soon.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => handleChange(l.code)}
            className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
              lang === l.code
                ? "bg-accent/20 border-accent/40 text-accent-hi"
                : "bg-page border-line text-ink-2 hover:border-slate-600"
            }`}
          >
            <span className="block font-medium">{l.native}</span>
            <span className="block text-xs text-ink-faint">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
