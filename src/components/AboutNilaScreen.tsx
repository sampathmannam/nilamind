import { Sparkles, Shield, BookOpen, HeartHandshake, Cpu } from "lucide-react";
import { NILA_ORIGIN } from "../services/personaConfig";
import { t } from "../services/i18n";

export default function AboutNilaScreen() {
  return (
    <div className="space-y-5 max-w-md mx-auto px-4 pb-8" id="about-nila-screen">
      {/* Header */}
      <div className="glass rounded-2xl p-5 text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>
        <h1 className="editorial text-xl text-ink">About Nila</h1>
        <p className="text-xs text-ink-muted">{t("abt_subtitle")}</p>
      </div>

      {/* What Nila is */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-accent" /> {t("abt_whatIs_title")}
        </h2>
        <p className="text-base text-ink-muted leading-relaxed">
          {t("abt_whatIs_body")}
        </p>
      </div>

      {/* Origin story — NILA_ORIGIN itself is not localized (persona narrative, not UI copy) */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> {t("abt_story_title")}
        </h2>
        <p className="text-base text-ink-muted leading-relaxed italic">
          "{NILA_ORIGIN}"
        </p>
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Cpu className="w-4 h-4 text-success" /> {t("abt_howWorks_title")}
        </h2>
        <p className="text-base text-ink-muted leading-relaxed">
          {t("abt_howWorks_body")}
        </p>
      </div>

      {/* What Nila can do */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-warn" /> {t("abt_canDo_title")}
        </h2>
        <ul className="text-base text-ink-muted leading-relaxed space-y-1.5 list-disc list-inside">
          <li>{t("abt_canDo_1")}</li>
          <li>{t("abt_canDo_2")}</li>
          <li>{t("abt_canDo_3")}</li>
          <li>{t("abt_canDo_4")}</li>
          <li>{t("abt_canDo_5")}</li>
          <li>{t("abt_canDo_6")}</li>
        </ul>
      </div>

      {/* What Nila cannot do */}
      <div className="glass rounded-2xl p-4 border-l-4 border-l-rose-500 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Shield className="w-4 h-4 text-danger" /> {t("abt_cannotDo_title")}
        </h2>
        <ul className="text-base text-ink-muted leading-relaxed space-y-1.5 list-disc list-inside">
          <li>{t("abt_cannotDo_1")}</li>
          <li>{t("abt_cannotDo_2")}</li>
          <li>{t("abt_cannotDo_3")}</li>
          <li>{t("abt_cannotDo_4")}</li>
        </ul>
      </div>

      {/* Anti-sycophancy: Nila won't always agree */}
      <div className="glass rounded-2xl p-4 border-l-4 border-l-amber-500 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-warn" /> {t("abt_disagree_title")}
        </h2>
        <p className="text-base text-ink-muted leading-relaxed">
          {t("abt_disagree_body")}
        </p>
      </div>

      {/* Privacy */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Shield className="w-4 h-4 text-success" /> {t("abt_privacy_title")}
        </h2>
        <p className="text-base text-ink-muted leading-relaxed">
          {t("abt_privacy_body")}
        </p>
      </div>

      {/* Research basis */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" /> {t("abt_research_title")}
        </h2>
        <p className="text-base text-ink-muted leading-relaxed">
          {t("abt_research_body")}
        </p>
      </div>

       <p className="text-base text-ink-faint text-center leading-relaxed px-4">
         {t("you_footer_disclaimer")}
       </p>
       <p className="text-[10px] text-slate-600 text-center">
         Version {typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"}
       </p>
    </div>
  );
}
