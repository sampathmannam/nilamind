import { describe, it, expect } from "vitest";
import {
  routeByContext,
  type RoutingContext,
} from "./adaptiveContextRouter";

const BASE_CTX: RoutingContext = {
  state: null,
  timeBlock: "afternoon",
  completedToday: false,
  hasRecentEpisode: false,
  streakDays: 0,
};

describe("routeByContext", () => {
  it("routes to calm phase for anxious state", () => {
    const result = routeByContext({ ...BASE_CTX, state: "anxious" });
    expect(result.phase).toBe("calm");
  });

  it("routes to data phase for low state", () => {
    const result = routeByContext({ ...BASE_CTX, state: "low" });
    expect(result.phase).toBe("data");
  });

  it("routes to calm phase for crisis state", () => {
    const result = routeByContext({ ...BASE_CTX, state: "crisis" });
    expect(result.phase).toBe("calm");
  });

  it("routes to calm for crisis, suggests plan tool", () => {
    const result = routeByContext({ ...BASE_CTX, state: "crisis" });
    expect(result.toolId).toBe("plan");
  });

  it("routes to data phase by default in afternoon", () => {
    const result = routeByContext(BASE_CTX);
    expect(result.phase).toBe("data");
  });

  it("routes to calm at night", () => {
    const result = routeByContext({ ...BASE_CTX, timeBlock: "night" });
    expect(result.phase).toBe("calm");
  });

  it("routes to protocol in evening", () => {
    const result = routeByContext({ ...BASE_CTX, timeBlock: "evening" });
    expect(result.phase).toBe("protocol");
  });

  it("includes a reason string", () => {
    const result = routeByContext(BASE_CTX);
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
