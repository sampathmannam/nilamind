// Dependency guard — defends the "success case IS the harm case" risk (Fang et al. 2025, MIT × OpenAI:
// heavy companion use → loneliness + emotional dependence; high-attachment users fare worst). Per the
// ethics red-panel this is a ship-blocker, not a tuning knob: when use is heavy AND escalating, Nila names
// it and pushes the user OUTWARD toward a person. Deterministic, from the local session log; dismissible
// for the week so it nudges, never nags.

import { loadNilaTurns, type NilaTurn } from "./nilaSessions";
import { secureLocal } from "./secureLocal";
import { ymd } from "./streaks";

const HEAVY_7D = 28; // ~4 chats/day for a week — the heavy-use floor the dependency literature flags
const DISMISS_KEY = "nilamind_dependency_dismissed";

export interface DependencySignal { firing: boolean; recent7: number; prior7: number }

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00") - Date.parse(a + "T00:00:00")) / 86_400_000);
}

/** PURE. Heavy AND not-declining Nila use → fire (push toward a human). */
export function dependencySignal(turns: NilaTurn[], today: string): DependencySignal {
  let recent7 = 0, prior7 = 0;
  for (const t of turns) {
    if (!t?.date) continue;
    const age = diffDays(t.date, today);
    if (age < 0) continue;
    if (age < 7) recent7++;
    else if (age < 14) prior7++;
  }
  return { firing: recent7 >= HEAVY_7D && recent7 >= prior7, recent7, prior7 };
}

export function dismissDependencyNudge(today = ymd(new Date())): void {
  try { secureLocal.setItem(DISMISS_KEY, today); } catch { /* ignore */ }
}
function dismissedRecently(today: string): boolean {
  try {
    const last = secureLocal.getItem(DISMISS_KEY);
    return !!last && diffDays(last, today) < 7;
  } catch {
    return false;
  }
}

/** Should the home show the dependency nudge today? (heavy + escalating, not dismissed in the last week) */
export function activeDependencyNudge(today = ymd(new Date())): boolean {
  if (dismissedRecently(today)) return false;
  return dependencySignal(loadNilaTurns(), today).firing;
}
