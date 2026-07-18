import { describe, it, expect, beforeEach, vi } from "vitest";

// Map-backed secureLocal so the real checkin store + draft store operate against an in-memory encrypted-
// at-rest stand-in. Provides appendToSecureArray (lives in secureLocal) too.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: <T,>(key: string, item: T) => {
    const arr = JSON.parse(store.get(key) ?? "[]") as T[];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
  SENSITIVE_KEYS: [],
}));

vi.mock("./localLlm", () => ({ generateOnDevice: vi.fn(), isLocalLlmReady: vi.fn() }));
vi.mock("./crisisClassifier", () => ({ detectCrisis: vi.fn() }));

import * as localLlm from "./localLlm";
import * as crisisClassifier from "./crisisClassifier";
const generateOnDevice = vi.mocked(localLlm.generateOnDevice);
const isLocalLlmReady = vi.mocked(localLlm.isLocalLlmReady);
const detectCrisis = vi.mocked(crisisClassifier.detectCrisis);

import {
  parseDraft,
  draftCheckinFromConversation,
  savePendingCheckinDraft,
  getPendingCheckinDraft,
  dismissCheckinDraftToday,
  clearPendingCheckinDraft,
  confirmCheckinDraft,
  summarizeDraft,
  maybeDraftCheckin,
  type CheckinDraftProposal,
} from "./checkinDraft";
import { localDateKey } from "./storageUtils";
import { hasCheckinToday } from "./checkin";

const TODAY = localDateKey();
const validRaw = { expressedFeeling: true, mood: "Anxious", intensity: 7, energy: 2, contextTag: "Work", granularEmotion: "restless", confidence: 0.8 };

beforeEach(() => {
  store.clear();
  generateOnDevice.mockReset();
  isLocalLlmReady.mockReturnValue(true);
  detectCrisis.mockResolvedValue(false);
});

describe("parseDraft (validation + clamp — nothing hallucinated into the store)", () => {
  it("accepts a valid, confident draft and maps it 1:1", () => {
    const p = parseDraft(validRaw, TODAY);
    expect(p).toMatchObject({ mood: "Anxious", intensity: 7, energy: 2, contextTag: "Work", granularEmotion: "restless" });
  });

  it("returns null when the user did not express a feeling", () => {
    expect(parseDraft({ ...validRaw, expressedFeeling: false }, TODAY)).toBeNull();
  });

  it("returns null for a mood outside the fixed vocabulary", () => {
    expect(parseDraft({ ...validRaw, mood: "Ecstatic" }, TODAY)).toBeNull();
  });

  it("returns null below the confidence floor (a wrong pre-fill is worse than none)", () => {
    expect(parseDraft({ ...validRaw, confidence: 0.4 }, TODAY)).toBeNull();
  });

  it("snaps off-vocabulary intensity/energy to the nearest allowed chip value", () => {
    const p = parseDraft({ ...validRaw, intensity: 6, energy: 5 }, TODAY);
    expect(p!.intensity).toBe(5); // 6 → nearest of {3,5,7,9}
    expect(p!.energy).toBe(4);    // 5 → nearest of {1,2,3,4}
  });

  it("falls back to 'Not sure' for an unknown context and clamps granular length", () => {
    const p = parseDraft({ ...validRaw, contextTag: "Weather", granularEmotion: "x".repeat(200) }, TODAY);
    expect(p!.contextTag).toBe("Not sure");
    expect(p!.granularEmotion!.length).toBeLessThanOrEqual(40);
  });
});

describe("draftCheckinFromConversation (§9-gated, fail-open)", () => {
  it("returns null with too few turns", async () => {
    expect(await draftCheckinFromConversation(["hi"])).toBeNull();
    expect(generateOnDevice).not.toHaveBeenCalled();
  });

  it("never drafts from a crisis conversation (§9 gate)", async () => {
    detectCrisis.mockResolvedValue(true);
    const p = await draftCheckinFromConversation(["i can't do this anymore", "everything is too much"]);
    expect(p).toBeNull();
    expect(generateOnDevice).not.toHaveBeenCalled();
  });

  it("returns null when the model is unavailable or returns junk", async () => {
    generateOnDevice.mockResolvedValue(null);
    expect(await draftCheckinFromConversation(["work was rough", "i'm on edge"])).toBeNull();
    generateOnDevice.mockResolvedValue("not json");
    expect(await draftCheckinFromConversation(["work was rough", "i'm on edge"])).toBeNull();
  });

  it("produces a proposal from valid model output", async () => {
    generateOnDevice.mockResolvedValue(JSON.stringify(validRaw));
    const p = await draftCheckinFromConversation(["work was rough today", "i keep feeling on edge"]);
    expect(p).toMatchObject({ mood: "Anxious", contextTag: "Work", date: TODAY });
  });
});

describe("pending draft store (per-day, dismissible)", () => {
  const p: CheckinDraftProposal = { mood: "Low", intensity: 5, energy: 2, contextTag: "Thoughts", confidence: 0.7, date: TODAY };

  it("round-trips today's draft, and hides it once dismissed", () => {
    savePendingCheckinDraft(p);
    expect(getPendingCheckinDraft()).toMatchObject({ mood: "Low" });
    dismissCheckinDraftToday();
    expect(getPendingCheckinDraft()).toBeNull();
  });

  it("ignores a draft left over from a previous day", () => {
    savePendingCheckinDraft({ ...p, date: "2020-01-01" });
    expect(getPendingCheckinDraft()).toBeNull();
  });

  it("clear removes it entirely", () => {
    savePendingCheckinDraft(p);
    clearPendingCheckinDraft();
    expect(getPendingCheckinDraft()).toBeNull();
  });
});

describe("confirmCheckinDraft", () => {
  it("writes a provenance-tagged check-in and clears the pending draft", () => {
    const p: CheckinDraftProposal = { mood: "Anxious", intensity: 7, energy: 2, contextTag: "Work", granularEmotion: "restless", confidence: 0.8, date: TODAY };
    savePendingCheckinDraft(p);
    expect(hasCheckinToday(TODAY)).toBe(false);
    confirmCheckinDraft(p);
    expect(hasCheckinToday(TODAY)).toBe(true);
    expect(getPendingCheckinDraft()).toBeNull();
    const entry = JSON.parse(store.get("nilamind_checkins")!)[0];
    expect(entry.emotion).toBe("Anxious (Nila)");
    expect(entry.context).toBe("Work");
    expect(entry.intensity).toBe(7);
  });
});

describe("summarizeDraft (deterministic — no model prose surfaced)", () => {
  it("reads back the state in plain words", () => {
    const s = summarizeDraft({ mood: "Anxious", intensity: 7, energy: 2, contextTag: "Work", granularEmotion: "restless", confidence: 0.8, date: TODAY });
    expect(s.toLowerCase()).toContain("anxious");
    expect(s.toLowerCase()).toContain("restless");
    expect(s.toLowerCase()).toContain("work");
    expect(s.toLowerCase()).toContain("strong"); // intensity 7 label
  });
});

describe("maybeDraftCheckin (guards — never nags)", () => {
  const turns = ["work was rough today", "i keep feeling on edge"];

  it("does nothing when the model isn't ready", async () => {
    isLocalLlmReady.mockReturnValue(false);
    await maybeDraftCheckin(turns);
    expect(generateOnDevice).not.toHaveBeenCalled();
    expect(getPendingCheckinDraft()).toBeNull();
  });

  it("does nothing when a check-in is already logged today", async () => {
    store.set("nilamind_checkins", JSON.stringify([{ id: "x", date: TODAY, emotion: "Okay", intensity: 3 }]));
    await maybeDraftCheckin(turns);
    expect(generateOnDevice).not.toHaveBeenCalled();
  });

  it("does not re-draft when one is already pending/dismissed today", async () => {
    savePendingCheckinDraft({ mood: "Low", intensity: 5, energy: 2, contextTag: "Thoughts", confidence: 0.7, date: TODAY });
    await maybeDraftCheckin(turns);
    expect(generateOnDevice).not.toHaveBeenCalled();
  });

  it("drafts and saves a pending proposal on a clean slate", async () => {
    generateOnDevice.mockResolvedValue(JSON.stringify(validRaw));
    await maybeDraftCheckin(turns);
    expect(getPendingCheckinDraft()).toMatchObject({ mood: "Anxious" });
  });
});
