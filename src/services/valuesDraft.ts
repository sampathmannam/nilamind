/**
 * Story → values domains present (NILA_COMPLETE_AGENT §B, "values map from stories"). ACT values are
 * SELF-CHOSEN — so unlike a check-in or a problem statement, Nila must not infer what you value or how
 * much. The only thing it extracts is which life *areas* you actually talked about (a factual read), and
 * surfaces them as a starting point in the values tool. You still rate every domain yourself; the model
 * never assigns importance or consistency. ("The model proposes; deterministic systems dispose.")
 *
 * §9-gated (a crisis disclosure never reaches the model), fail-open (nothing clearly present / model
 * unavailable → empty → the tool opens as usual). Output is domain IDs only — no free text is surfaced.
 * 100% on-device.
 */
import { generateOnDevice } from "./localLlm";
import { scanForCrisis } from "../safety";
import { VALUE_DOMAINS } from "./values";

const DOMAIN_IDS = VALUE_DOMAINS.map((d) => d.id);
const MAX_DOMAINS = 4;

export const VALUES_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    domains: { type: "array", items: { type: "string", enum: [...DOMAIN_IDS] } },
  },
  required: ["domains"],
} as const;

function draftSystemPrompt(): string {
  return `You are Nila. Read the person's recent messages and identify which life areas they actually talked
about or that clearly mattered in what they said — so the values tool can start there instead of a blank list.

Choose ONLY from the allowed area IDs, and ONLY ones genuinely present in their words. Do NOT guess, do NOT
add areas they didn't touch, and do NOT rate how important anything is — that is theirs to decide. If no life
area clearly came up, return an empty list. Output JSON only: { "domains": ["id", ...] }.`;
}

/** Validate + dedupe raw model output into a capped list of known domain IDs. */
export function parseValueDomains(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const arr = (raw as { domains?: unknown }).domains;
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of arr) {
    if (typeof d === "string" && DOMAIN_IDS.includes(d) && !seen.has(d)) {
      seen.add(d);
      out.push(d);
      if (out.length >= MAX_DOMAINS) break;
    }
  }
  return out;
}

/** Extract the value domains present in a story. Fail-open: [] on empty/unavailable/parse error. */
export async function draftValueDomains(storyText: string): Promise<string[]> {
  let raw: string | null;
  try {
    raw = await generateOnDevice(draftSystemPrompt(), [{ role: "user", content: storyText }], () => {}, undefined, {
      jsonSchema: VALUES_DRAFT_SCHEMA as unknown as object,
    });
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    return parseValueDomains(JSON.parse(raw));
  } catch {
    return [];
  }
}

export type SafeValuesDraftResult =
  | { ok: true; domains: string[] }
  | { ok: false; reason: "crisis" | "empty" };

/** §9-gated: a crisis disclosure never reaches the model; the caller surfaces crisis help instead. */
export async function safeDraftValueDomains(storyText: string): Promise<SafeValuesDraftResult> {
  const v = storyText.trim();
  if (!v) return { ok: false, reason: "empty" };
  if (scanForCrisis(v)) return { ok: false, reason: "crisis" };
  const domains = await draftValueDomains(v);
  if (domains.length === 0) return { ok: false, reason: "empty" };
  return { ok: true, domains };
}
