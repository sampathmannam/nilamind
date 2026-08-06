import { useMemo } from "react";
import { Pin } from "lucide-react";
import { buildToolGroups, personalizeToolOrder, personalizeToolByContext } from "./toolsRows";
import Section from "./Section";
import ToolRow from "./ToolRow";
import CrisisHeaderButton from "./CrisisHeaderButton";
import { getUserGoals } from "../services/chatSuggestions";
import { useUserContext } from "../hooks/useUserContext";
import { recordToolUse, getAllRecentTools } from "../services/recentTools";

const PINNED_MIN_USES = 2;
const PINNED_MAX_DISPLAY = 3;

function getPinnedTools(go: (target: string) => void, onEpisode: () => void, phoneEnabled: boolean) {
  const allTools = buildToolGroups({ go, onEpisode, phoneEnabled }).flatMap((g) => g.rows);
  const toolMap = new Map(allTools.map((t) => [t.id, t]));
  const recent = getAllRecentTools();
  if (recent.length < PINNED_MIN_USES) return [];

  const usage = new Map<string, number>();
  for (const entry of recent) {
    usage.set(entry.target, (usage.get(entry.target) ?? 0) + 1);
  }

  const sorted = [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, PINNED_MAX_DISPLAY)
    .map(([target]) => toolMap.get(target))
    .filter((t): t is NonNullable<typeof t> => !!t);
  return sorted;
}

interface Props {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
  onOpenCrisis: () => void;
}

// ── Section definitions: maps toolsRows group titles → visible section labels ──
const SECTIONS = [
  { title: "Calm", groupFilter: (id: string) => ["plan", "winddown", "sounds", "reach_out"].includes(id) },
  { title: "Track", groupFilter: (id: string) => ["ema_checkin", "diary", "medication"].includes(id) },
  { title: "Skills", groupFilter: (id: string) =>
    ["problem_solving", "values_to_action", "assessment", "social_rhythm", "exposure", "relapse_plan", "chain_analysis"].includes(id),
  },
] as const;

function sectionRows(allRows: ReturnType<typeof buildToolGroups>[number]["rows"], filter: (id: string) => boolean) {
  return allRows.filter((r) => filter(r.id));
}

export default function ToolsScreen({ go, onEpisode, phoneEnabled, onOpenCrisis }: Props) {
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

  const pinnedTools = useMemo(() => getPinnedTools(go, onEpisode, phoneEnabled), [go, onEpisode, phoneEnabled]);

  return (
    <div className="space-y-6 max-w-md mx-auto px-4" id="tools-hub">
      <header className="pt-2 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="editorial text-[26px] text-ink tracking-tight">Tools</h1>
          <p className="text-[12px] text-ink-muted">Skills, trackers, and practices.</p>
        </div>
        <CrisisHeaderButton onClick={onOpenCrisis} className="shrink-0" />
      </header>

      {pinnedTools.length > 0 && (
        <Section title="Pinned">
          {pinnedTools.map((r) => (
            <ToolRow
              key={r.id}
              icon={<Pin className="w-5 h-5 text-accent" />}
              label={r.label}
              subtitle={r.sub}
              onPress={() => { recordToolUse(r.id); r.onTap(); }}
            />
          ))}
        </Section>
      )}

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
                onPress={() => { recordToolUse(r.id); r.onTap(); }}
              />
            ))}
          </Section>
        );
      })}
    </div>
  );
}
