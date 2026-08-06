import ToolRow from "./ToolRow";
import { TOOL_META } from "./toolMeta";
import { recordToolUse } from "../services/recentTools";

// Calm hub (redesign §5.3) — one Tools row fans out to the three self-soothing surfaces. Progressive
// disclosure: fewer top-level choices for a distressed scanner; the extra tap is paid back by Pinned/
// Recently shortcuts once a tool is used. Reach out stays a top-level Tools row (support-seeking, not
// self-soothing).

const CALM_CHILDREN = ["plan", "winddown", "sounds"] as const;

export default function CalmHubScreen({ go }: { go: (target: string) => void }) {
  return (
    <div className="p-4 space-y-2" id="calm-hub">
      <p className="text-sm text-ink-muted pb-2">A quieter minute, whichever way works right now.</p>
      {CALM_CHILDREN.map((id) => {
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
