import { describe, it, expect } from "vitest";
import { runExclusive, tryRunExclusive, isModelBusy } from "./modelLock";

// The llama.cpp binding runs completion() on Capacitor's ONE plugin thread — two overlapping completions
// freeze the app. modelLock serializes ALL model access: runExclusive() waits its turn (primary: chat/voice),
// tryRunExclusive() skips if busy (aux: reflection/coach). These tests pin that contract.

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("modelLock — serialize all on-device model access", () => {
  it("runExclusive runs sections FIFO and never overlaps", async () => {
    const order: string[] = [];
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    let started2 = false;

    const p1 = runExclusive(async () => { order.push("start1"); const v = await d1.promise; order.push("end1"); return v; });
    const p2 = runExclusive(async () => { started2 = true; order.push("start2"); const v = await d2.promise; order.push("end2"); return v; });

    await Promise.resolve();
    expect(started2).toBe(false);   // section 2 must NOT start while section 1 holds the lock
    expect(isModelBusy()).toBe(true);

    d1.resolve("a");
    await p1;
    await Promise.resolve();
    expect(started2).toBe(true);    // now that 1 released, 2 runs

    d2.resolve("b");
    await p2;
    expect(isModelBusy()).toBe(false);
    expect(order).toEqual(["start1", "end1", "start2", "end2"]);
  });

  it("tryRunExclusive skips (null) while busy, runs when free", async () => {
    const d = deferred<string>();
    const p1 = runExclusive(async () => await d.promise);
    await Promise.resolve();

    const skipped = await tryRunExclusive(async () => "ran");
    expect(skipped).toBeNull();     // busy → aux skips

    d.resolve("done");
    await p1;

    const ran = await tryRunExclusive(async () => "ran");
    expect(ran).toBe("ran");        // free → aux runs
  });

  it("a throwing section still releases the lock", async () => {
    await expect(runExclusive(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(isModelBusy()).toBe(false);
    expect(await tryRunExclusive(async () => "ok")).toBe("ok");
  });
});
