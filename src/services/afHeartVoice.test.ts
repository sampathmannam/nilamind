import { describe, it, expect } from "vitest";

import { AF_HEART_ID, afHeartAvailable, speakAfHeart, stopAfHeart } from "./afHeartVoice";

describe("afHeartVoice — retired cloud voice stubs", () => {
  it("AF_HEART_ID is kokoro:af_heart", () => {
    expect(AF_HEART_ID).toBe("kokoro:af_heart");
  });

  it("afHeartAvailable returns false", async () => {
    expect(await afHeartAvailable()).toBe(false);
  });

  it("speakAfHeart returns false", async () => {
    expect(await speakAfHeart("hello")).toBe(false);
  });

  it("stopAfHeart is callable and returns void", () => {
    expect(stopAfHeart()).toBeUndefined();
  });
});
