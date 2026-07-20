import React, { useState } from "react";
import { PROTOCOLS, type Protocol } from "../services/protocols";
import { getActiveProgress } from "../services/protocolProgress";

// Grouping axis: PROTOCOLS is the union of 13 protocols defined inline in protocols.ts ("quick
// programs") and 8 imported from their own dedicated protocol*.ts files ("deeper modules"). This is
// a real code-structural distinction, not step count — step counts range 3-7 in the "quick" group
// and 5-10 in the "deeper" group, they overlap, so don't try to regroup by step count later.
const DEEPER_MODULE_IDS = new Set([
  "dbt-skills-training", "act-training", "assertion-training", "cbti-sleep",
  "social-rhythm", "relapse-prevention", "mindfulness-practice", "behavioral-experiments",
]);

function isDeeperModule(p: Protocol): boolean {
  return DEEPER_MODULE_IDS.has(p.id);
}

interface Props {
  onStart: (protocolId: string) => void;
}

export default function GuidedProgramsScreen({ onStart }: Props) {
  const [pendingSwitch, setPendingSwitch] = useState<Protocol | null>(null);
  const active = getActiveProgress();

  const quick = PROTOCOLS.filter((p) => !isDeeperModule(p));
  const deeper = PROTOCOLS.filter(isDeeperModule);

  const handleTap = (p: Protocol) => {
    if (active && active.protocol.id !== p.id) {
      setPendingSwitch(p);
      return;
    }
    onStart(p.id);
  };

  return (
    <div className="p-4 space-y-6">
      <p className="text-sm text-ink-muted">
        Real, structured programs Nila can guide you through — each one traces to published research.
      </p>

      {pendingSwitch && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm space-y-3">
          <p>Switch from {active?.protocol.title}? You'll restart it from the beginning next time.</p>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-medium min-h-[44px]"
              onClick={() => {
                const id = pendingSwitch.id;
                setPendingSwitch(null);
                onStart(id);
              }}
            >
              Switch
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-line-strong/50 text-ink-2 text-xs font-medium min-h-[44px]"
              onClick={() => setPendingSwitch(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ProtocolSection title="Quick programs" protocols={quick} onTap={handleTap} />
      <ProtocolSection title="Deeper modules" protocols={deeper} onTap={handleTap} />
    </div>
  );
}

function ProtocolSection({ title, protocols, onTap }: { title: string; protocols: Protocol[]; onTap: (p: Protocol) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase font-mono tracking-widest text-ink-faint">{title}</p>
      {protocols.map((p) => (
        <button
          key={p.id}
          onClick={() => onTap(p)}
          className="w-full text-left px-4 py-3 rounded-xl glass hover:brightness-125 transition-all min-h-[44px] focus-ring"
        >
          <span className="block text-sm font-medium text-ink-2">{p.title}</span>
          <span className="block mt-0.5 text-xs text-ink-faint">{p.steps.length} steps</span>
          <span className="block mt-1 text-[10px] text-ink-faint">{p.basis}</span>
        </button>
      ))}
    </div>
  );
}
