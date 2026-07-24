import NilaDot from "./NilaDot";
import CrisisHeaderButton from "./CrisisHeaderButton";
import { Settings } from "lucide-react";
import { t } from "../services/i18n";

interface NilaHeaderProps {
  greeting: string;
  onOpenSettings?: () => void;
  onOpenCrisis?: () => void;
}

export default function NilaHeader({ greeting, onOpenSettings, onOpenCrisis }: NilaHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-5 border-b border-line/40 bg-page/80 backdrop-blur-sm shrink-0"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: '12px' }}
    >
      <div className="flex items-center gap-3">
        <NilaDot size={10} />
        <span className="text-[15px] font-semibold text-ink tracking-tight">{greeting}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl hover:bg-fill text-ink-muted hover:text-ink transition-colors cursor-pointer focus-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t("settings")}
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
        <CrisisHeaderButton onClick={() => onOpenCrisis?.()} />
      </div>
    </header>
  );
}
