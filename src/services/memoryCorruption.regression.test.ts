// Regression (2026-07-17 tester pass): a malformed persisted memory element (null / missing note)
// used to throw inside memoryBiasBlock -> estimateDistress (.toLowerCase() on undefined) — and since
// buildPersonalContext() is assembled UNWRAPPED on every chat turn (nila.ts) and episode turn, one bad
// element bricked the whole conversation. Reachable via phrase-backup restore (identity.ts writes
// restored keys verbatim). Guards now live in loadNilaMemories (shape filter) + memoryBiasBlock.
import { describe, it, expect, beforeEach, vi } from "vitest";

const emStore = new Map<string, string>();
vi.mock("./secureLocal", async () => {
  const actual = await vi.importActual<typeof import("./secureLocal")>("./secureLocal");
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => (emStore.has(k) ? emStore.get(k)! : null),
      setItem: (k: string, v: string) => void emStore.set(k, v),
      removeItem: (k: string) => void emStore.delete(k),
    },
  };
});

import { memoryBiasBlock } from "./realityTesting";
import { buildPersonalContext } from "./nilaContext";
import { secureLocal } from "./secureLocal";

describe("QA corruption probe", () => {
  beforeEach(() => {
    emStore.clear();
  });

  it("memoryBiasBlock survives an element missing note", () => {
    expect(() =>
      memoryBiasBlock([
        { note: "feeling sad today", date: "2026-07-01" },
        { date: "2026-07-02" } as any,
      ]),
    ).not.toThrow();
  });

  it("memoryBiasBlock survives a null element", () => {
    expect(() =>
      memoryBiasBlock([
        { note: "feeling sad today", date: "2026-07-01" },
        null as any,
      ]),
    ).not.toThrow();
  });

  it("buildPersonalContext survives corrupt nila memories in storage", () => {
    // two elements so memoryBiasBlock's length>=2 path runs; one malformed
    secureLocal.setItem(
      "nilamind_nila_memory",
      JSON.stringify([{ date: "2026-07-01", note: "rough week" }, { date: "2026-07-02" }]),
    );
    expect(() => buildPersonalContext()).not.toThrow();
  });
});
