import ToolRow from "./ToolRow";
import { TOOL_META } from "./toolMeta";
import { recordToolUse } from "../services/recentTools";

// Skills hub (redesign §5.3) — one Tools row fans out to the structured practices, including the
// Guided Programs library (previously built but unreachable — no Tools row survived the old SECTIONS
// whitelist). Progressive disclosure: the catalog stays complete without 7 identical top-level rows.

const SKILL_CHILDREN = [
  "problem_solving",
  "values_to_action",
  "social_rhythm",
  "exposure",
  "relapse_plan",
  "chain_analysis",
  "guided_programs",
] as const;

export default function SkillsHubScreen({ go }: { go: (target: string) => void }) {
  return (
    <div className="p-4 space-y-2" id="skills-hub">
      <p className="text-sm text-ink-muted pb-2">Structured practices — go at your own pace.</p>
      {SKILL_CHILDREN.map((id) => {
        const m = TOOL_META[id];
        return (
          <ToolRow
            key={id}
            icon={<m.Icon className={m.iconClass} aria-hidden="true" />}
            label={m.label()}
            subtitle={m.sub()}
            onPress={() => { recordToolUse(id); go(id); }}
          />
        );
      })}
    </div>
  );
}
