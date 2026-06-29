// src/services/nilaInsights.ts
// Nila's COMPOUNDING MEMORY (Phase 1). Durable, typed, user-editable insights consolidated from the
// person's on-device history. Stored ENCRYPTED via secureLocal; the user can see/edit/delete every
// item; reflection may ADD/UPDATE but the user always wins (tombstones + verbatim keep).
import { secureLocal } from "./secureLocal";
import { ymd } from "./streaks";
import { generateOnDevice } from "./localLlm";
import { loadNilaMemories } from "./nilaMemory";

export type InsightKind = "working_through" | "what_helps" | "pattern" | "context" | "value";
export const INSIGHT_KINDS: InsightKind[] = ["working_through", "what_helps", "pattern", "context", "value"];

export interface Insight {
  id: string;
  kind: InsightKind;
  text: string;                         // one short line
  date: string;                         // YYYY-MM-DD (local), last touched
  source: "reflection" | "user";        // "user" = created/edited by the person → protected
}

const INSIGHTS_KEY = "nilamind_nila_insights";
const TOMBSTONES_KEY = "nilamind_nila_insights_removed";
const CAP = 20;
const TOMBSTONE_CAP = 100;

/** Stable identity of an insight by its meaning — used for dedup, tombstones and carry-over. */
export function fingerprint(kind: InsightKind, text: string): string {
  return (
    kind +
    "|" +
    text.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?,;:]+$/, "")
  );
}

function isValidInsight(x: any): x is Insight {
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.text === "string" &&
    x.text.trim().length > 0 &&
    (x.source === "user" || x.source === "reflection") &&
    INSIGHT_KINDS.includes(x.kind) &&
    typeof x.date === "string"
  );
}

export function loadInsights(): Insight[] {
  try {
    const raw = secureLocal.getItem(INSIGHTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(isValidInsight) : [];
  } catch {
    return [];
  }
}

/** Partition cap: keep EVERY user item; fill remaining slots with the newest reflection items. */
export function capInsights(all: Insight[]): Insight[] {
  const user = all.filter((i) => i.source === "user");
  const reflection = all
    .filter((i) => i.source === "reflection")
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first
  const slots = Math.max(0, CAP - user.length);
  return [...user, ...reflection.slice(0, slots)];
}

export function saveInsights(all: Insight[]): void {
  try {
    secureLocal.setItem(INSIGHTS_KEY, JSON.stringify(capInsights(all)));
  } catch (e) {
    console.error("Failed to save Nila insights:", e);
  }
}

export function loadTombstones(): string[] {
  try {
    const raw = secureLocal.getItem(TOMBSTONES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function addTombstone(fp: string): void {
  const set = new Set(loadTombstones());
  set.delete(fp); // re-insert so the most-recently-added sits last (survives overflow trim)
  set.add(fp);
  let arr = [...set];
  if (arr.length > TOMBSTONE_CAP) arr = arr.slice(arr.length - TOMBSTONE_CAP);
  try {
    secureLocal.setItem(TOMBSTONES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error("Failed to save Nila tombstones:", e);
  }
}

function newId(): string {
  return "ins_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** PURE. Merge a fresh reflection proposal into the current set; the user always wins. */
export function reconcile(
  current: Insight[],
  proposed: { kind: InsightKind; text: string }[],
  tombstoned: Set<string>,
  today: string,
  mintId: () => string,
): Insight[] {
  const user = current.filter((i) => i.source === "user");
  const userFps = new Set(user.map((i) => fingerprint(i.kind, i.text)));
  const reflectionByFp = new Map(
    current.filter((i) => i.source === "reflection").map((i) => [fingerprint(i.kind, i.text), i] as const),
  );
  const seen = new Set<string>();
  const nextReflection: Insight[] = [];
  for (const p of proposed) {
    const text = (p?.text ?? "").trim();
    if (!text || !INSIGHT_KINDS.includes(p?.kind as InsightKind)) continue;
    const fp = fingerprint(p.kind, text);
    if (tombstoned.has(fp) || userFps.has(fp) || seen.has(fp)) continue;
    seen.add(fp);
    const prev = reflectionByFp.get(fp);
    nextReflection.push(
      prev
        ? { id: prev.id, kind: p.kind, text, date: prev.date, source: "reflection" }
        : { id: mintId(), kind: p.kind, text, date: today, source: "reflection" },
    );
  }
  return capInsights([...user, ...nextReflection]);
}

/** Create or refresh a user-owned insight; promotes a matching reflection insight to user-owned. */
export function upsertUserInsight(kind: InsightKind, text: string): void {
  const clean = text.trim();
  if (!clean) return;
  const all = loadInsights();
  const fp = fingerprint(kind, clean);
  const today = ymd(new Date());
  const existing = all.find((i) => fingerprint(i.kind, i.text) === fp);
  if (existing) {
    existing.text = clean;
    existing.kind = kind;
    existing.source = "user";
    existing.date = today;
  } else {
    all.push({ id: newId(), kind, text: clean, date: today, source: "user" });
  }
  saveInsights(all);
}

/** Edit an insight's text. Tombstones the PRE-EDIT text so reflection won't re-propose the old wording. */
export function editInsight(id: string, text: string): void {
  const clean = text.trim();
  if (!clean) return;
  const all = loadInsights();
  const item = all.find((i) => i.id === id);
  if (!item) return;
  const preFp = fingerprint(item.kind, item.text);
  const nextFp = fingerprint(item.kind, clean);
  if (preFp !== nextFp) addTombstone(preFp);
  item.text = clean;
  item.source = "user";
  item.date = ymd(new Date());
  saveInsights(all);
}

/** Delete an insight and tombstone it so reflection won't re-surface it. */
export function deleteInsight(id: string): void {
  const all = loadInsights();
  const item = all.find((i) => i.id === id);
  if (!item) return;
  addTombstone(fingerprint(item.kind, item.text));
  saveInsights(all.filter((i) => i.id !== id));
}

/** The durable-insights block for buildPersonalContext (newest-first), or "" when empty. */
export function insightsContextBlock(): string {
  const all = loadInsights().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (!all.length) return "";
  return all.map((i) => `- ${i.text}`).join("\n");
}

// ─── Reflection job ────────────────────────────────────────────────────────────

const LAST_REFLECTED_KEY = "nilamind_last_reflected"; // plain localStorage, non-sensitive, date-only
const MAX_INPUT_CHARS = 6000;
const MAX_PROPOSED = 8;
const MAX_TEXT = 200;

const REFLECTION_SYSTEM =
  "You are Nila, an AI companion who keeps a small, private set of durable notes about a friend you " +
  "support, so you understand them over time instead of starting over each talk. You'll be given a " +
  "private on-device summary of their recent activity, your own past session notes, the durable notes " +
  "you already hold, and a short list of themes they've asked you to forget. Decide what is genuinely " +
  "lasting and worth remembering. Return ONLY a minified JSON array (no prose, no code fences) of AT " +
  'MOST 8 objects, each {"kind":<one of "working_through","what_helps","pattern","context","value">,' +
  '"text":<one short, warm, third-person sentence>}. "working_through" = what they\'re currently ' +
  'struggling with; "what_helps" = a coping skill or thing that reliably helps them; "pattern" = a ' +
  'recurring pattern (e.g. a time of day or trigger); "context" = stable life context; "value" = ' +
  "something that matters to them. Be conservative: prefer fewer, high-confidence notes; never include " +
  "a clinical label or anything more sensitive than necessary; never include a theme from the forget " +
  "list or a close paraphrase of one. If nothing is worth noting, return [].";

function buildReflectionInput(digest: string): string {
  const notes = loadNilaMemories().map((m) => `- ${m.note}`).join("\n");
  const current = loadInsights().map((i) => `${i.kind}: ${i.text}`).join("\n");
  const forget = loadTombstones().join("\n");
  return [
    "RECENT ACTIVITY (private on-device summary):",
    digest || "(not much recent activity)",
    "",
    "YOUR PAST SESSION NOTES:",
    notes || "(none yet)",
    "",
    "DURABLE NOTES YOU ALREADY HOLD:",
    current || "(none yet)",
    "",
    "THEY ASKED YOU TO FORGET (never resurface these or close paraphrases):",
    forget || "(none)",
  ]
    .join("\n")
    .slice(0, MAX_INPUT_CHARS);
}

type ReflectResult =
  | { status: "transient" }
  | { status: "empty" }
  | { status: "ok"; items: { kind: InsightKind; text: string }[] };

async function fetchReflection(digest: string): Promise<ReflectResult> {
  // On-device reflection. No model loaded => null => treat as transient (skip this round, retry later).
  const raw = await generateOnDevice(REFLECTION_SYSTEM, [{ role: "user", content: buildReflectionInput(digest) }]);
  if (raw === null) return { status: "transient" };

  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let arr: any;
  try {
    arr = JSON.parse(text);
  } catch {
    return { status: "empty" };
  }
  if (!Array.isArray(arr)) return { status: "empty" };

  const items: { kind: InsightKind; text: string }[] = [];
  const seen = new Set<string>();
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const kind = (it as any).kind;
    const t = typeof (it as any).text === "string" ? (it as any).text.trim().slice(0, MAX_TEXT) : "";
    if (!INSIGHT_KINDS.includes(kind) || !t) continue;
    const fp = fingerprint(kind, t);
    if (seen.has(fp)) continue;
    seen.add(fp);
    items.push({ kind, text: t });
    if (items.length >= MAX_PROPOSED) break;
  }
  return items.length ? { status: "ok", items } : { status: "empty" };
}

export function shouldReflectToday(today: string): boolean {
  try {
    return localStorage.getItem(LAST_REFLECTED_KEY) !== today;
  } catch {
    return false;
  }
}
function setLastReflected(today: string): void {
  try {
    localStorage.setItem(LAST_REFLECTED_KEY, today);
  } catch {
    /* ignore */
  }
}

let reflectionInFlight = false;
let reflectedBootDate: string | null = null;
// test-only reset for the in-memory same-boot guard — assigned only under DEV, never shipped to prod.
if ((import.meta as any).env?.DEV) {
  (globalThis as any).__resetReflectionBootGuard = () => {
    reflectionInFlight = false;
    reflectedBootDate = null;
  };
}

/**
 * Consolidate the day's activity into durable memory. Throttled to once/local-day. Fire-and-forget;
 * never blocks the UI. On a transient network failure the day is NOT consumed (retries on a later
 * background event). On a refusal/garbled/empty reply the store is left byte-identical (never wiped).
 * `digest` is the derived 30-day summary (App passes buildReflectionDigest()), so this module never
 * imports nilaContext.
 */
export async function runReflection(digest: string): Promise<void> {
  const today = ymd(new Date());
  if (reflectionInFlight || reflectedBootDate === today) return;
  if (!shouldReflectToday(today)) return;
  reflectionInFlight = true;
  try {
    const result = await fetchReflection(digest);
    if (result.status === "transient") return; // flag NOT set → retry later today
    if (result.status === "ok") {
      const current = loadInsights();
      const tombstoned = new Set(loadTombstones());
      let n = Date.now();
      const mintId = () => "ins_" + (n++).toString(36) + Math.random().toString(36).slice(2, 6);
      saveInsights(reconcile(current, result.items, tombstoned, today, mintId));
    }
    // "ok" or "empty" (parse-fail / [] / all-invalid) → consume the day; never wipe on empty.
    setLastReflected(today);
    reflectedBootDate = today;
  } finally {
    reflectionInFlight = false;
  }
}
