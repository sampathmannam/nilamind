import React from "react";
import Card from "./Card";
import { buildAffectToneStrip } from "../services/affectToneChart";
import { valenceToColor, NO_DATA_COLOR } from "../services/affectToneColor";
import { localDateKey } from "../services/storageUtils";

export default function AffectToneStrip() {
  const { sufficient, cells } = buildAffectToneStrip();
  const byDate = new Map(cells.map((c) => [c.date, c]));

  return (
    <Card>
      <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
        Conversation tone (automatic)
      </h3>
      {!sufficient ? (
        <p className="text-[11px] text-ink-muted">No data yet.</p>
      ) : (
        <>
          <div
            className="flex gap-1 overflow-x-auto"
            role="img"
            aria-label="Conversation tone over the last 30 days, an automatic estimate"
          >
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (29 - i));
              const key = localDateKey(d);
              const cell = byDate.get(key);
              return (
                <div
                  key={key}
                  title={cell ? `${key}: ${cell.count} conversation${cell.count === 1 ? "" : "s"}` : `${key}: no data`}
                  className="rounded-full shrink-0"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: cell ? valenceToColor(cell.valence) : NO_DATA_COLOR,
                  }}
                />
              );
            })}
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            An automatic tone estimate from the app's on-device model — not something you told the app.
          </p>
        </>
      )}
    </Card>
  );
}
