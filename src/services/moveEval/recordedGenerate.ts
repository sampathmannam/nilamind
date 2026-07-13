// A GenerateFn backed by pre-recorded replies (keyed by probe), so a captured set of on-device outputs can be
// re-scored through the eval harness without re-running the model. This is the cheapest "generator": it feeds
// runEval() real replies we already captured (e.g. an adb probe session), so the scorecard reflects true
// on-device behavior. The live device / laptop-proxy generators plug into the same GenerateFn seam later.
import type { GenerateFn } from "./runEval";

/** Build a GenerateFn from a probe→reply map. Lookup is case/space-insensitive. Throws on a missing probe
 *  (a missing capture is a real gap, not something to silently paper over). */
export function recordedGenerate(records: Record<string, string>): GenerateFn {
  const norm = (s: string) => s.trim().toLowerCase();
  const table = new Map<string, string>();
  for (const [k, v] of Object.entries(records)) table.set(norm(k), v);

  return async (probe: string): Promise<string> => {
    const reply = table.get(norm(probe));
    if (reply === undefined) throw new Error(`recordedGenerate: no recorded reply for probe "${probe}"`);
    return reply;
  };
}
