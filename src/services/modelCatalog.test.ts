import { describe, it, expect } from "vitest";
import { MODELS } from "./modelCatalog";

// Catalog integrity. The download path REQUIRES an exact byte match and (when present) a SHA-256 —
// a wrong size means every completed download is rejected as corrupt at 100%. These are the
// first-run-experience guards for a public release.

describe("model catalog", () => {
  it("MODELS[0] is the device-verified default brain (fast — Qwen2.5-1.5B)", () => {
    // ModelSetupScreen downloads MODELS[0] on first run. Flipping the default brain requires
    // on-device verification first (see the MiniCPM swap lesson) — this test makes an accidental
    // array reorder loud instead of silent.
    expect(MODELS[0].id).toBe("fast");
  });

  it("every entry carries a real 64-hex SHA-256 (defends same-size poisoning; proves LFS metadata was read)", () => {
    for (const m of MODELS) {
      expect(m.sha256, `${m.id} is missing sha256`).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("sizes are exact LFS byte lengths, never rounded placeholders", () => {
    for (const m of MODELS) {
      expect(m.sizeBytes, `${m.id} sizeBytes looks like a rounded placeholder`).toBeGreaterThan(0);
      // A real GGUF byte length is never a clean multiple of a million.
      expect(m.sizeBytes % 1_000_000, `${m.id} sizeBytes is suspiciously round: ${m.sizeBytes}`).not.toBe(0);
    }
  });

  it("known-good entries pin the verified sizes", () => {
    const byId = Object.fromEntries(MODELS.map((m) => [m.id, m]));
    expect(byId.fast.sizeBytes).toBe(1117320736);
    expect(byId.quality.sizeBytes).toBe(2104932768);
    expect(byId.fast3.sizeBytes).toBe(1834426016);
  });
});
