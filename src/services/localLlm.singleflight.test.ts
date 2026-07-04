import { describe, it, expect, afterEach } from "vitest";
import {
  registerLocalLlmBackend,
  generateGuarded,
  generateOnDevice,
  isGenerating,
  type LocalLlmBackend,
} from "./localLlm";

// The shipped llama.cpp binding runs completion() SYNCHRONOUSLY on Capacitor's single plugin thread, so two
// overlapping completions freeze the app (the "send msg → switch tab → return → frozen" bug: the background
// reflection collided with / blocked the live chat). This locks the single-flight guard: an AUX caller
// (generateOnDevice — reflection/coach/episode) must BAIL while any generation is already in flight, and must
// never start a second concurrent completion.
function backendFirstPending() {
  let calls = 0;
  let resolveFirst: (v: string) => void = () => {};
  const backend: LocalLlmBackend = {
    id: "fake",
    isReady: () => true,
    generate: () => {
      calls += 1;
      if (calls === 1) return new Promise<string>((res) => { resolveFirst = res; }); // chat stays in flight
      return Promise.resolve("aux-reply"); // an aux call would resolve here IF the guard were missing
    },
  };
  return { backend, resolveFirst: (v = "chat-reply") => resolveFirst(v), calls: () => calls };
}

afterEach(() => registerLocalLlmBackend(null));

describe("localLlm single-flight guard (one plugin thread)", () => {
  it("aux generateOnDevice bails (null, no 2nd completion) while a generation is in flight", async () => {
    const { backend, resolveFirst, calls } = backendFirstPending();
    registerLocalLlmBackend(backend);

    const chat = generateGuarded({ system: "s", messages: [{ role: "user", content: "hi" }], onToken: () => {} });
    expect(isGenerating()).toBe(true); // set synchronously before the first await

    const aux = await generateOnDevice("sys", [{ role: "user", content: "reflect" }]);
    expect(aux).toBeNull();      // reflection deferred, did not run
    expect(calls()).toBe(1);     // backend.generate was NOT called a second time

    resolveFirst("chat-reply");
    await chat;
    expect(isGenerating()).toBe(false); // flag cleared after the generation settles
  });

  it("SERIALIZES two primary generateGuarded calls — the second waits, never overlapping on the plugin thread", async () => {
    let n = 0;
    const resolvers: Array<(v: string) => void> = [];
    const backend: LocalLlmBackend = {
      id: "fake",
      isReady: () => true,
      generate: () => { n += 1; return new Promise<string>((res) => { resolvers.push(res); }); },
    };
    registerLocalLlmBackend(backend);

    const a = generateGuarded({ system: "s", messages: [{ role: "user", content: "1" }], onToken: () => {} });
    const b = generateGuarded({ system: "s", messages: [{ role: "user", content: "2" }], onToken: () => {} });
    await Promise.resolve();
    expect(isGenerating()).toBe(true);
    expect(n).toBe(1); // ONLY the first is running; the second is queued behind the lock — no overlap

    resolvers[0]("first");
    await a;
    await Promise.resolve();
    expect(n).toBe(2); // now the second acquires the lock and runs

    const aux = await generateOnDevice("sys", [{ role: "user", content: "reflect" }]);
    expect(aux).toBeNull(); // aux still deferred while the second primary runs

    resolvers[1]("second");
    await b;
    expect(isGenerating()).toBe(false);
  });

  it("aux runs normally when nothing else is generating", async () => {
    const { backend } = backendFirstPending();
    // make the FIRST call resolve so a lone aux call succeeds
    (backend as unknown as { generate: () => Promise<string> }).generate = () => Promise.resolve("solo");
    registerLocalLlmBackend(backend);
    const aux = await generateOnDevice("sys", [{ role: "user", content: "reflect" }]);
    expect(aux).toBe("solo");
  });
});
