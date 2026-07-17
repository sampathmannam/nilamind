import { describe, it, expect } from "vitest";
import { localDateKey } from "./storageUtils";

// The suite runs with TZ=Asia/Kolkata (+05:30) on this machine; these fixtures make the
// UTC-vs-local divergence explicit either way by constructing absolute instants.

describe("localDateKey", () => {
  it("formats the local calendar day, zero-padded", () => {
    const d = new Date(2026, 0, 5); // Jan 5, local midnight
    expect(localDateKey(d)).toBe("2026-01-05");
  });

  it("differs from the UTC date for a late-night IST instant", () => {
    // 00:30 IST on Jul 17 = 19:00 UTC Jul 16. The local day is the 17th.
    const lateNight = new Date("2026-07-17T00:30:00+05:30");
    const local = localDateKey(lateNight);
    const utc = lateNight.toISOString().split("T")[0];
    if (new Date().getTimezoneOffset() === -330) {
      // Running in IST: this is exactly the shipped-device case.
      expect(local).toBe("2026-07-17");
      expect(utc).toBe("2026-07-16"); // the old pattern stamped yesterday
    } else {
      // Any TZ: the helper must agree with the Date's own local components.
      expect(local).toBe(
        `${lateNight.getFullYear()}-${String(lateNight.getMonth() + 1).padStart(2, "0")}-${String(lateNight.getDate()).padStart(2, "0")}`,
      );
    }
  });

  it("defaults to now", () => {
    const now = new Date();
    expect(localDateKey()).toBe(localDateKey(now));
  });
});
