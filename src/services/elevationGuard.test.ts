import { describe, it, expect } from "vitest";
import { detectElevationRisk, elevationGuardNote, elevationOutputNote } from "./elevationGuard";

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
