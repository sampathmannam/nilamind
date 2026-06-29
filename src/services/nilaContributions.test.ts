import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// In-memory encrypted store; crisisResources (pulled in by ../safety) touches localStorage at import.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));
beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

import {
  scrubPII, buildDonationPreview, confirmDonation, isDonated, revokeDonation,
  donationCount, donatedContributions, clearDonations, type Donation,
} from "./nilaContributions";
import type { ReplyFeedback } from "./nilaFeedback";

const fb = (over: Partial<ReplyFeedback> = {}): ReplyFeedback => ({
  id: over.id ?? "fb_1",
  at: over.at ?? "2026-06-27",
  rating: over.rating ?? "down",
  reply: over.reply ?? "Here's a gentler way to see it.",
  suggestion: over.suggestion,
});

beforeEach(() => store.clear());

describe("scrubPII — deterministic PII removal", () => {
  it("strips emails, phone/long-digit runs, urls, and @handles", () => {
    const out = scrubPII("mail me at jo.doe@gmail.com or +91 98765 43210, see https://x.io/y and @jodoe123");
    expect(out).toContain("[email]");
    expect(out).toContain("[number]");
    expect(out).toContain("[link]");
    expect(out).toContain("[handle]");
    expect(out).not.toMatch(/jo\.doe@gmail\.com|98765|https:\/\/x\.io|@jodoe123/);
  });
  it("is empty-safe and bounded to 2000 chars", () => {
    expect(scrubPII("")).toBe("");
    expect(scrubPII("a".repeat(5000)).length).toBe(2000);
  });
  it("leaves ordinary supportive prose untouched", () => {
    const t = "You did the brave thing by naming it.";
    expect(scrubPII(t)).toBe(t);
  });
});

describe("buildDonationPreview — exactly what would be sent", () => {
  it("returns the scrubbed reply + suggestion for benign content", () => {
    const p = buildDonationPreview(fb({ reply: "ping me at a@b.com", suggestion: "Maybe ask how they slept." }));
    expect(p.blockedByCrisis).toBe(false);
    expect(p.nilaReply).toBe("ping me at [email]");
    expect(p.betterReply).toBe("Maybe ask how they slept.");
  });
  it("flags crisis content in the SUGGESTION (pre-scrub scan)", () => {
    const p = buildDonationPreview(fb({ reply: "ok", suggestion: "i want to end my life" }));
    expect(p.blockedByCrisis).toBe(true);
  });
  it("flags crisis content in the REPLY too", () => {
    const p = buildDonationPreview(fb({ reply: "no reason to live", suggestion: "be warmer" }));
    expect(p.blockedByCrisis).toBe(true);
  });
});

describe("confirmDonation — §9 + consent + no-raw-egress", () => {
  it("queues a clean donation containing ONLY {id, at, nilaReply, betterReply}, scrubbed", () => {
    const entry = fb({ id: "fb_x", reply: "reach me at a@b.com", suggestion: "Name the feeling first." });
    expect(confirmDonation(entry)).toBe(true);
    const q: Donation[] = donatedContributions();
    expect(q).toHaveLength(1);
    expect(Object.keys(q[0]).sort()).toEqual(["at", "betterReply", "id", "nilaReply"]);
    expect(q[0].nilaReply).toBe("reach me at [email]"); // scrubbed
    expect(JSON.stringify(q[0])).not.toContain("a@b.com"); // no raw PII anywhere in the queued payload
    expect(isDonated("fb_x")).toBe(true);
  });

  it("REFUSES to queue crisis content (§9) — returns false and stores nothing", () => {
    expect(confirmDonation(fb({ id: "c1", reply: "ok", suggestion: "i want to end my life" }))).toBe(false);
    expect(donationCount()).toBe(0);
    expect(isDonated("c1")).toBe(false);
  });

  it("returns false when there is no typed suggestion (nothing to contribute)", () => {
    expect(confirmDonation(fb({ id: "n1", suggestion: undefined }))).toBe(false);
    expect(donationCount()).toBe(0);
  });

  it("is idempotent per id (a second confirm does not duplicate)", () => {
    const entry = fb({ id: "fb_dup", suggestion: "warmer" });
    confirmDonation(entry);
    confirmDonation(entry);
    expect(donationCount()).toBe(1);
  });
});

describe("revoke / clear — the person stays in control", () => {
  it("revokeDonation withdraws a single donation", () => {
    confirmDonation(fb({ id: "a", suggestion: "x" }));
    confirmDonation(fb({ id: "b", suggestion: "y" }));
    revokeDonation("a");
    expect(donationCount()).toBe(1);
    expect(isDonated("a")).toBe(false);
    expect(isDonated("b")).toBe(true);
  });
  it("clearDonations wipes the whole queue", () => {
    confirmDonation(fb({ id: "a", suggestion: "x" }));
    clearDonations();
    expect(donatedContributions()).toEqual([]);
  });
});
