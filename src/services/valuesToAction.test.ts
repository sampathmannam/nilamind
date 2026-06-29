import { describe, it, expect } from "vitest";
import { toDoList, isActivityId, isStepId, DoItem } from "./valuesToAction";
import type { BAActivityLog } from "./behaviouralActivation";
import type { CommittedAction } from "./values";

const act = (over: Partial<BAActivityLog> = {}): BAActivityLog => ({
  id: "ba_1",
  date: "2026-06-21",
  timestamp: "10:00:00",
  title: "Walk outside",
  category: "movement",
  status: "planned",
  ...over,
});

const step = (over: Partial<CommittedAction> = {}): CommittedAction => ({
  id: "va_1",
  date: "2026-06-21",
  domainId: "health",
  action: "Take a 10-min walk",
  status: "open",
  ...over,
});

describe("isActivityId / isStepId", () => {
  it("recognises ba_ ids as activities", () => {
    expect(isActivityId("ba_123")).toBe(true);
    expect(isActivityId("va_123")).toBe(false);
  });
  it("recognises va_ ids as steps", () => {
    expect(isStepId("va_123")).toBe(true);
    expect(isStepId("ba_123")).toBe(false);
  });
});

describe("toDoList", () => {
  it("maps a planned activity to a not-done, not-skipped DoItem of kind 'activity'", () => {
    const [item] = toDoList([act({ id: "ba_9", status: "planned" })], []);
    expect(item.kind).toBe("activity");
    expect(item.id).toBe("ba_9");
    expect(item.title).toBe("Walk outside");
    expect(item.done).toBe(false);
    expect(item.skipped).toBe(false);
    expect(item.activity).toBeDefined();
    expect(item.step).toBeUndefined();
  });

  it("maps a done activity to done=true, skipped=false", () => {
    const [item] = toDoList([act({ id: "ba_9", status: "done", mastery: 6, pleasure: 7 })], []);
    expect(item.done).toBe(true);
    expect(item.skipped).toBe(false);
  });

  it("maps a skipped activity to skipped=true, done=false", () => {
    const [item] = toDoList([act({ id: "ba_9", status: "skipped" })], []);
    expect(item.done).toBe(false);
    expect(item.skipped).toBe(true);
  });

  it("maps an open committed step to kind 'step', not done", () => {
    const [item] = toDoList([], [step({ id: "va_9", status: "open" })]);
    expect(item.kind).toBe("step");
    expect(item.id).toBe("va_9");
    expect(item.title).toBe("Take a 10-min walk");
    expect(item.done).toBe(false);
    expect(item.skipped).toBe(false);
    expect(item.step).toBeDefined();
    expect(item.activity).toBeUndefined();
  });

  it("maps a done committed step to done=true", () => {
    const [item] = toDoList([], [step({ id: "va_9", status: "done", doneDate: "2026-06-22" })]);
    expect(item.done).toBe(true);
  });

  it("ROUND-TRIPS: every DoItem can be split back to its original record by id prefix, preserving both status enums and the ba_/va_ prefixes", () => {
    const activities: BAActivityLog[] = [
      act({ id: "ba_a", status: "planned" }),
      act({ id: "ba_b", status: "done", mastery: 8, pleasure: 5, note: "felt good" }),
      act({ id: "ba_c", status: "skipped" }),
    ];
    const actions: CommittedAction[] = [
      step({ id: "va_a", status: "open" }),
      step({ id: "va_b", status: "done", doneDate: "2026-06-22" }),
    ];

    const items = toDoList(activities, actions);
    expect(items.length).toBe(5);

    // split back out by prefix and reattach the original embedded record
    const backActs = items.filter((i) => isActivityId(i.id)).map((i) => i.activity as BAActivityLog);
    const backSteps = items.filter((i) => isStepId(i.id)).map((i) => i.step as CommittedAction);

    // every record survives identically (no id mangling, no status coercion)
    expect(new Set(backActs.map((a) => a.id))).toEqual(new Set(["ba_a", "ba_b", "ba_c"]));
    expect(new Set(backSteps.map((s) => s.id))).toEqual(new Set(["va_a", "va_b"]));
    expect(backActs.find((a) => a.id === "ba_a")!.status).toBe("planned");
    expect(backActs.find((a) => a.id === "ba_b")!.status).toBe("done");
    expect(backActs.find((a) => a.id === "ba_c")!.status).toBe("skipped");
    expect(backSteps.find((s) => s.id === "va_a")!.status).toBe("open");
    expect(backSteps.find((s) => s.id === "va_b")!.status).toBe("done");
    // no item carries BOTH a ba_ and va_ record
    for (const i of items) {
      expect(isActivityId(i.id) ? i.step : i.activity).toBeUndefined();
    }
  });

  it("orders newest-first within group (activities reversed, then steps reversed)", () => {
    const items = toDoList(
      [act({ id: "ba_old" }), act({ id: "ba_new" })],
      [step({ id: "va_old" }), step({ id: "va_new" })],
    );
    expect(items.map((i) => i.id)).toEqual(["ba_new", "ba_old", "va_new", "va_old"]);
  });
});
