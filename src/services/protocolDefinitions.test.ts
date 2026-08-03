import { describe, it, expect } from "vitest";
import { PROTOCOLS } from "./protocolDefinitions";

describe("PROTOCOLS registry", () => {
  it('contains keys "grounding", "moodCheckIn", "windDown", "strengths", "connection"', () => {
    expect(PROTOCOLS).toHaveProperty("grounding");
    expect(PROTOCOLS).toHaveProperty("moodCheckIn");
    expect(PROTOCOLS).toHaveProperty("windDown");
    expect(PROTOCOLS).toHaveProperty("strengths");
    expect(PROTOCOLS).toHaveProperty("connection");
  });

  for (const key of ["grounding", "moodCheckIn", "windDown", "strengths", "connection"] as const) {
    describe(`${key} protocol`, () => {
      const proto = PROTOCOLS[key];

      it("has id, name, trigger, completionMessage, and steps", () => {
        expect(proto.id).toBeTruthy();
        expect(proto.name).toBeTruthy();
        expect(proto.trigger).toBeTruthy();
        expect(proto.completionMessage).toBeTruthy();
        expect(Array.isArray(proto.steps)).toBe(true);
        expect(proto.steps.length).toBeGreaterThan(0);
      });

      it("every step has a non-empty id, prompt, nilaTemplate, and modelFill", () => {
        for (const step of proto.steps) {
          expect(step.id).toBeTruthy();
          expect(step.prompt.length).toBeGreaterThan(0);
          expect(step.nilaTemplate.length).toBeGreaterThan(0);
          expect(step.modelFill.length).toBeGreaterThan(0);
        }
      });

      it("every step has a next() function returning advance, repeat, or exit", () => {
        for (const step of proto.steps) {
          expect(typeof step.next).toBe("function");
          const result = step.next("yes");
          expect(["advance", "repeat", "exit"]).toContain(result);
          const result2 = step.next("no");
          expect(["advance", "repeat", "exit"]).toContain(result2);
          const result3 = step.next("");
          expect(["advance", "repeat", "exit"]).toContain(result3);
        }
      });
    });
  }

  describe("grounding protocol specifics", () => {
    it("has exactly 4 steps", () => {
      expect(PROTOCOLS.grounding.steps).toHaveLength(4);
    });

    it("step ids are acknowledge, breathe, ground_54321, close", () => {
      const ids = PROTOCOLS.grounding.steps.map((s) => s.id);
      expect(ids).toEqual(["acknowledge", "breathe", "ground_54321", "close"]);
    });

    it("acknowledge step advances on yes-like responses and exits on no", () => {
      const acknowledge = PROTOCOLS.grounding.steps[0];
      expect(acknowledge.next("yes")).toBe("advance");
      expect(acknowledge.next("sure")).toBe("advance");
      expect(acknowledge.next("no")).toBe("exit");
      expect(acknowledge.next("not now")).toBe("exit");
    });

    it("breathe step always advances", () => {
      const breathe = PROTOCOLS.grounding.steps[1];
      expect(breathe.next("good")).toBe("advance");
      expect(breathe.next("bad")).toBe("advance");
      expect(breathe.next("")).toBe("advance");
    });

    it("close step always exits", () => {
      const close = PROTOCOLS.grounding.steps[3];
      expect(close.next("")).toBe("exit");
      expect(close.next("thanks")).toBe("exit");
    });
  });
});
