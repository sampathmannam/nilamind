import { describe, it, expect, beforeEach, vi } from "vitest";

// audit #11: the at-rest encryption core (AES-GCM DEK, device-KEK wrap, PBKDF2 PIN wrap, wrong-PIN rejection)
// backs the app's "encrypted at rest" promise but had ZERO real coverage — every other test mocks it with an
// identity passthrough. Node has real Web Crypto (crypto.subtle) but no IndexedDB, so we install a tiny
// in-memory IDB shim (stores values BY REFERENCE in a Map, so the non-extractable CryptoKey round-trips
// without structured clone, which node lacks for CryptoKey). The crypto exercised below is 100% real.

function installFakeIndexedDB() {
  const stores = new Map<string, Map<string, unknown>>();
  const ensure = (n: string) => { if (!stores.has(n)) stores.set(n, new Map()); return stores.get(n)!; };
  const request = (resultFn: () => unknown) => {
    const r: any = { onsuccess: null, onerror: null, result: undefined, error: null };
    queueMicrotask(() => { try { r.result = resultFn(); r.onsuccess?.(); } catch (e) { r.error = e; r.onerror?.(); } });
    return r;
  };
  const makeDB = () => ({
    objectStoreNames: { contains: (n: string) => stores.has(n) },
    createObjectStore: (n: string) => { ensure(n); return {}; },
    transaction: (name: string) => {
      const tx: any = { oncomplete: null, onerror: null, onabort: null, error: null };
      tx.objectStore = () => ({
        get: (k: string) => request(() => ensure(name).get(k)),
        put: (v: unknown, k: string) => { ensure(name).set(k, v); queueMicrotask(() => tx.oncomplete?.()); return request(() => undefined); },
        delete: (k: string) => { ensure(name).delete(k); queueMicrotask(() => tx.oncomplete?.()); return request(() => undefined); },
        getAllKeys: () => request(() => [...ensure(name).keys()]),
        getAll: () => request(() => [...ensure(name).values()]),
      });
      return tx;
    },
    close: () => {},
  });
  (globalThis as any).indexedDB = {
    open: () => {
      const r: any = { onupgradeneeded: null, onsuccess: null, onerror: null, result: undefined };
      queueMicrotask(() => { r.result = makeDB(); r.onupgradeneeded?.(); r.onsuccess?.(); });
      return r;
    },
  };
  return stores;
}

describe("secureStore — real at-rest crypto (audit #11)", () => {
  beforeEach(() => { installFakeIndexedDB(); vi.resetModules(); });

  it("initSecure creates a device-mode store and encryptValue→decryptValue round-trips", async () => {
    const s = await import("./secureStore");
    expect(await s.initSecure()).toEqual({ mode: "device", unlocked: true });
    const blob = await s.encryptValue("my safety plan: call Sam");
    // real ciphertext — the plaintext must not be recoverable from the stored blob
    expect(blob.ct).toBeTruthy();
    expect(atob(blob.ct)).not.toContain("safety plan");
    expect(await s.decryptValue(blob)).toBe("my safety plan: call Sam");
  });

  it("encryptValue throws before unlock (fails safe, never plaintext)", async () => {
    const s = await import("./secureStore");
    await expect(s.encryptValue("x")).rejects.toThrow(/locked/);
  });

  it("the DEK survives an app restart (device mode) — a prior blob still decrypts", async () => {
    const s1 = await import("./secureStore");
    await s1.initSecure();
    const blob = await s1.encryptValue("diary entry");
    // simulate relaunch: reset module singletons but keep the SAME IndexedDB (installed once per test)
    vi.resetModules();
    const s2 = await import("./secureStore");
    expect((await s2.initSecure()).unlocked).toBe(true);
    expect(await s2.decryptValue(blob)).toBe("diary entry");
  });

  it("unlockWithPin rejects a wrong PIN and accepts the right one", async () => {
    const s1 = await import("./secureStore");
    await s1.initSecure();
    const blob = await s1.encryptValue("check-in history");
    await s1.setPin("2468");
    // relaunch into pin mode (locked until the correct PIN is supplied)
    vi.resetModules();
    const s2 = await import("./secureStore");
    expect(await s2.initSecure()).toEqual({ mode: "pin", unlocked: false });
    await expect(s2.unlockWithPin("0000")).rejects.toThrow(); // AES-GCM auth failure on wrong PIN
    expect(s2.isUnlocked()).toBe(false);
    await s2.unlockWithPin("2468");
    expect(s2.isUnlocked()).toBe(true);
    expect(await s2.decryptValue(blob)).toBe("check-in history");
  });
});
