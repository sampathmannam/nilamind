import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  },
}));

import { detectElevationRisk, elevationGuardNote, elevationOutputNote, energyElevationSignal } from "./elevationGuard";

beforeEach(() => { store = {}; });

describe("detectElevationRisk — high-precision mania-risk detection", () => {
  it("none for ordinary, distressed, or empty text", () => {
    for (const t of ["i feel really low today", "work was stressful", "i had a good day", ""]) {
      expect(detectElevationRisk(t).level).toBe("none");
    }
  });

  it("HIGH for stopping psychiatric meds (the most dangerous marker)", () => {
    for (const t of ["I'm going to stop taking my meds", "i flushed my pills", "i don't need my meds anymore"]) {
      expect(detectElevationRisk(t).level).toBe("high");
    }
  });

  it("elevated for sleep-dismissal / impulsive spending / grandiosity", () => {
    expect(detectElevationRisk("honestly I don't need sleep anymore").level).toBe("elevated");
    expect(detectElevationRisk("went on a spending spree today").level).toBe("elevated");
    expect(detectElevationRisk("I've figured it all out, I'm unstoppable").level).toBe("elevated");
  });

  it("does NOT fire on insomnia — 'haven't slept' ≠ 'don't need sleep'", () => {
    expect(detectElevationRisk("i haven't slept well in days, i'm exhausted").level).toBe("none");
  });

  it("elevated for racing / pressured thoughts (DSM hypomania criterion)", () => {
    for (const t of ["my mind is racing and I can't slow down", "my thoughts are racing tonight", "my brain won't shut off"]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on anxiety 'heart racing' or rumination (precision boundary)", () => {
    expect(detectElevationRisk("my heart is racing before the interview").level).toBe("none");
    expect(detectElevationRisk("i've been overthinking everything and feel anxious").level).toBe("none");
    expect(detectElevationRisk("i was racing to catch the bus").level).toBe("none");
  });

  it("ELEVATED for hypersexuality markers (DSM-5 criterion B7)", () => {
    for (const t of [
      "i've been feeling so hypersexual lately",
      "my sex drive is through the roof",
      "i can't stop thinking about sex",
      "i've been sleeping with everyone this week",
      "i keep making risky sexual decisions",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on benign sexual well-being talk (precision boundary)", () => {
    expect(detectElevationRisk("my libido has been low since starting the meds").level).toBe("none");
    expect(detectElevationRisk("i had a good date last night").level).toBe("none");
    expect(detectElevationRisk("my partner and i are having communication issues about intimacy").level).toBe("none");
  });

  it("ELEVATED for religious grandiosity (manic prodrome)", () => {
    for (const t of [
      "god is speaking to me and telling me what to do",
      "i think i am a prophet",
      "i was chosen by god for something bigger",
      "i'm on a divine mission",
      "i am the messiah",
      "god has chosen me for this",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on ordinary faith / spiritual talk (precision boundary)", () => {
    expect(detectElevationRisk("i prayed this morning and it helped me feel calm").level).toBe("none");
    expect(detectElevationRisk("i went to temple and felt really connected").level).toBe("none");
    expect(detectElevationRisk("god has been good to me lately").level).toBe("none");
    expect(detectElevationRisk("my faith helps me get through hard days").level).toBe("none");
  });

  it("ELEVATED for passive sleep-denial euphoria (manic prodrome)", () => {
    for (const t of [
      "i haven't slept and i feel amazing",
      "i've been barely sleeping and i feel incredible",
      "honestly sleep barely matters anymore",
      "i'm running on 2 hours and i feel amazing",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on ordinary insomnia / short-sleep talk (precision boundary)", () => {
    expect(detectElevationRisk("i slept 2 hours last night and i'm so tired").level).toBe("none");
    expect(detectElevationRisk("running on 5 hours of sleep today — rough morning").level).toBe("none");
    expect(detectElevationRisk("i barely slept all week because the baby was up").level).toBe("none");
  });

  it("ELEVATED for pressured-speech behavioral markers (DSM hypomania criterion)", () => {
    for (const t of [
      "i can't stop talking and everyone's getting annoyed",
      "my thoughts are pouring out of me right now",
      "everyone says i'm talking too fast today",
      "i know i'm talking too fast but i can't help it",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("ELEVATED for irritable / agitated mania markers (DSM-5 criterion A — audit gap)", () => {
    for (const t of [
      "i keep snapping at everyone today for no reason",
      "everything is annoying me and i can't calm down",
      "i'm so pissed off at everyone and i don't know why",
      "i feel like screaming at the top of my lungs",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on ordinary irritability / stress (precision boundary)", () => {
    expect(detectElevationRisk("i've been irritable all week because of work stress").level).toBe("none");
    expect(detectElevationRisk("everything is annoying at the office today").level).toBe("none");
    expect(detectElevationRisk("i'm just really pissed off about what happened").level).toBe("none");
  });

  it("ELEVATED for distractibility markers (DSM-5 criterion B6 — audit gap)", () => {
    for (const t of [
      "i'm jumping between a million things and can't settle",
      "everything is grabbing my attention right now",
      "i can't finish anything i start today",
      "i started ten things today and finished none",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on ordinary concentration struggles (precision boundary)", () => {
    expect(detectElevationRisk("i can't focus at work, kept getting distracted by Slack").level).toBe("none");
    expect(detectElevationRisk("my ADHD is making it hard to finish anything today").level).toBe("none");
    expect(detectElevationRisk("i keep picking up my phone instead of working").level).toBe("none");
  });

  it("ELEVATED for increased goal-directed activity markers (DSM-5 criterion B7 — audit gap)", () => {
    for (const t of [
      "i keep starting too many projects at the same time",
      "i started a million projects this week",
      "it feels like i have a new project every day",
      "i have too many ideas to keep up with right now",
    ]) {
      expect(detectElevationRisk(t).level).toBe("elevated");
    }
  });

  it("does NOT fire on ordinary productivity / ambition (precision boundary)", () => {
    expect(detectElevationRisk("i've got a new project at work and i'm excited about it").level).toBe("none");
    expect(detectElevationRisk("i started a new hobby this weekend — painting").level).toBe("none");
    expect(detectElevationRisk("i have so many ideas for the business plan").level).toBe("none");
  });

  it("does NOT fire on ordinary talking / nervous chatter (precision boundary)", () => {
    expect(detectElevationRisk("my friend says i talk too fast when i'm nervous but i feel fine").level).toBe("none");
    expect(detectElevationRisk("i talk a lot when i get excited about something new").level).toBe("none");
    expect(detectElevationRisk("i talk fast when i'm excited about a project").level).toBe("none");
  });
});

describe("guard notes", () => {
  it("system steer only when elevated/high", () => {
    expect(elevationGuardNote("none")).toBe("");
    expect(elevationGuardNote("elevated")).toContain("POSSIBLE ELEVATION");
    expect(elevationGuardNote("high")).toContain("POSSIBLE ELEVATION");
  });
  it("scripted meds-output line only for high", () => {
    expect(elevationOutputNote("none")).toBe("");
    expect(elevationOutputNote("elevated")).toBe("");
    expect(elevationOutputNote("high")).toContain("your doctor");
  });
});

describe("energyElevationSignal — check-in energy prodrome", () => {
  const ymd = (d: Date = new Date()) => d.toISOString().slice(0, 10);

  function setCheckins(entries: Array<{ date: string; energy: number }>) {
    store["nilamind_checkins"] = JSON.stringify(
      entries.map((e, i) => ({
        id: `c${i}`,
        date: e.date,
        timestamp: `${e.date}T12:00:00.000Z`,
        emotion: "neutral",
        intensity: 5,
        energy: e.energy,
        context: "none",
      }))
    );
  }

  it("returns 'none' when no check-ins exist", () => {
    expect(energyElevationSignal()).toBe("none");
  });

  it("returns 'none' when check-ins lack energy data", () => {
    store["nilamind_checkins"] = JSON.stringify([
      { id: "c1", date: ymd(), timestamp: "2026-07-10T12:00:00.000Z", emotion: "ok", intensity: 5, context: "none" },
    ]);
    expect(energyElevationSignal()).toBe("none");
  });

  it("returns 'none' when fewer than 3 check-ins have energy", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 2)), energy: 2 },
      { date: ymd(new Date(Date.now() - 86400000)), energy: 3 },
    ]);
    expect(energyElevationSignal()).toBe("none");
  });

  it("returns 'none' when energy is stable", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 4)), energy: 2 },
      { date: ymd(new Date(Date.now() - 86400000 * 2)), energy: 2 },
      { date: ymd(), energy: 2 },
    ]);
    expect(energyElevationSignal()).toBe("none");
  });

  it("returns 'none' when energy is falling", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 4)), energy: 4 },
      { date: ymd(new Date(Date.now() - 86400000 * 2)), energy: 2 },
      { date: ymd(), energy: 1 },
    ]);
    expect(energyElevationSignal()).toBe("none");
  });

  it("returns 'elevated' when energy rises notably and recent is ≥3", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 4)), energy: 2 },
      { date: ymd(new Date(Date.now() - 86400000 * 2)), energy: 3 },
      { date: ymd(), energy: 4 },
    ]);
    expect(energyElevationSignal()).toBe("elevated");
  });

  it("returns 'high' when energy rises steeply and recent is ≥4", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 4)), energy: 1 },
      { date: ymd(new Date(Date.now() - 86400000 * 2)), energy: 2 },
      { date: ymd(), energy: 4 },
    ]);
    expect(energyElevationSignal()).toBe("high");
  });

  it("returns 'none' when recent energy is < 3 despite rising", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 4)), energy: 1 },
      { date: ymd(new Date(Date.now() - 86400000 * 2)), energy: 2 },
      { date: ymd(), energy: 2 },
    ]);
    expect(energyElevationSignal()).toBe("none");
  });

  it("ignores check-ins older than 7 days", () => {
    setCheckins([
      { date: ymd(new Date(Date.now() - 86400000 * 10)), energy: 1 },
      { date: ymd(new Date(Date.now() - 86400000 * 8)), energy: 2 },
      { date: ymd(new Date(Date.now() - 86400000 * 6)), energy: 2 },
    ]);
    // Only within 7 days counts, so fewer than 3 valid entries
    expect(energyElevationSignal()).toBe("none");
  });
});
