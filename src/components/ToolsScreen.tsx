import { useMemo, useState, useEffect } from "react";
import { buildToolGroups, personalizeToolOrder, personalizeToolByContext } from "./toolsRows";
import Section from "./Section";
import ToolRow from "./ToolRow";
import CrisisHeaderButton from "./CrisisHeaderButton";
import { SkeletonList } from "./Skeleton";
import { getUserGoals } from "../services/chatSuggestions";
import { useUserContext } from "../hooks/useUserContext";
import { recordToolUse } from "../services/recentTools";

// "Pinned" was removed after the 15-day longitudinal run (2026-08-24): it re-rendered rows that were
// already visible in the catalog BELOW it — at day 7 "Calm space" appeared twice on one screen, same
// icon, same label, same subtitle. Pinning earns its keep on a long list; this catalog is 9 rows in
// 4 labeled groups (~1.5 screens), so the shortcut only added duplicates and made the screen's layout
// shift as usage changed (breaking the spatial memory a short, stable list is supposed to give you).
// The recency shortcut still exists where it isn't a same-screen duplicate: Home's "Recently".

interface Props {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
  onOpenCrisis: () => void;
}

// Redesign §5.3: ToolsScreen renders exactly what buildToolGroups() returns — the old SECTIONS
// whitelist (which silently dropped built rows like episode + dashboard) is gone.
export default function ToolsScreen({ go, onEpisode, phoneEnabled, onOpenCrisis }: Props) {
  const { timeMode, state } = useUserContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(t);
  }, []);

  const groups = useMemo(
    () =>
      personalizeToolByContext(
        personalizeToolOrder(buildToolGroups({ go, onEpisode, phoneEnabled }), getUserGoals()),
        { timeMode, state },
      ),
    [go, onEpisode, phoneEnabled, timeMode, state],
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-md mx-auto px-4" id="tools-hub">
        <header className="pt-2 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="editorial text-[26px] text-ink tracking-tight">Tools</h1>
            <p className="text-[12px] text-ink-muted">Skills, trackers, and practices.</p>
          </div>
          <CrisisHeaderButton onClick={onOpenCrisis} className="shrink-0" />
        </header>
        <SkeletonList count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto px-4" id="tools-hub">
      <header className="pt-2 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="editorial text-[26px] text-ink tracking-tight">Tools</h1>
          <p className="text-[12px] text-ink-muted">Skills, trackers, and practices.</p>
        </div>
        <CrisisHeaderButton onClick={onOpenCrisis} className="shrink-0" />
      </header>

      {groups.map((g) => (
        <Section key={g.title} title={g.title}>
          {g.rows.map((r) => (
            <ToolRow
              key={r.id}
              icon={<r.Icon className={r.iconClass} aria-hidden="true" />}
              label={r.label}
              subtitle={r.sub}
              onPress={() => { recordToolUse(r.id); r.onTap(); }}
            />
          ))}
        </Section>
      ))}
    </div>
  );
}
