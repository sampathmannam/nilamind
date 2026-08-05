import { useMemo } from "react";
import { buildToolGroups, personalizeToolOrder, personalizeToolByContext } from "./toolsRows";
import Section from "./Section";
import ToolRow from "./ToolRow";
import { getUserGoals } from "../services/chatSuggestions";
import { useUserContext } from "../hooks/useUserContext";

interface Props {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
  onOpenCrisis: () => void;
}

// ── Section definitions: maps toolsRows group titles → visible section labels ──
const SECTIONS = [
  { title: "Calm", groupFilter: (id: string) => ["plan", "breathing", "winddown", "sounds", "reach_out"].includes(id) },
  { title: "Track", groupFilter: (id: string) => ["ema_checkin", "diary", "dbt_diary_card", "medication"].includes(id) },
  { title: "Skills", groupFilter: (id: string) =>
    ["problem_solving", "values_to_action", "assessment", "social_rhythm", "exposure", "relapse_plan", "chain_analysis"].includes(id),
  },
] as const;

function sectionRows(allRows: ReturnType<typeof buildToolGroups>[number]["rows"], filter: (id: string) => boolean) {
  return allRows.filter((r) => filter(r.id));
}

export default function ToolsScreen({ go, onEpisode, phoneEnabled }: Props) {
  const { timeMode, state } = useUserContext();

  const groups = useMemo(
    () =>
      personalizeToolByContext(
        personalizeToolOrder(buildToolGroups({ go, onEpisode, phoneEnabled }), getUserGoals()),
        { timeMode, state },
      ),
    [go, onEpisode, phoneEnabled, timeMode, state],
  );

  const allRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  return (
    <div className="space-y-6 max-w-md mx-auto px-4" id="tools-hub">
      <header className="space-y-1 pt-2">
        <h1 className="editorial text-[26px] text-ink tracking-tight">Tools</h1>
        <p className="text-[12px] text-ink-muted">Skills, trackers, and practices.</p>
      </header>

      {SECTIONS.map((sec) => {
        const rows = sectionRows(allRows, sec.groupFilter);
        if (rows.length === 0) return null;
        return (
          <Section key={sec.title} title={sec.title}>
            {rows.map((r) => (
              <ToolRow
                key={r.id}
                icon={<r.Icon className={r.iconClass} aria-hidden="true" />}
                label={r.label}
                subtitle={r.sub}
                onPress={r.onTap}
              />
            ))}
          </Section>
        );
      })}
    </div>
  );
}
