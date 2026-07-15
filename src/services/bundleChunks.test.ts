/**
 * Bundle-size cleanup (C2) — verify manualChunks configuration.
 *
 * Every heavy dependency NOT in manualChunks will end up in the boot bundle or an
 * auto-named chunk with unstable cache keys. This test ensures the manualChunks
 * list stays current as the dep graph evolves.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve(__dirname, "..", "..", "vite.config.ts");
const configSrc = fs.readFileSync(configPath, "utf-8");

/** Extract the manualChunks object as a map of chunkName → sources from the config source. */
function extractManualChunks(): Record<string, string[]> {
  const match = configSrc.match(/manualChunks:\s*\{([^}]+)\}/s);
  if (!match) throw new Error("manualChunks not found in vite.config.ts");
  const body = match[1];
  const out: Record<string, string[]> = {};
  const re = /(['"]?)([\w@/\-]+)\1\s*:\s*\[(['"]?)([\w@/\-]+)\3\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out[m[2]] = [m[4]];
  }
  return out;
}

describe("vite.config.ts manualChunks — bundle-size cleanup (C2)", () => {
  it("splits recharts into its own chunk (381 KB, used by 3 screens)", () => {
    expect(configSrc).toMatch(/recharts:\s*\[/);
  });

  it("splits jspdf into its own chunk (391 KB, used by export features)", () => {
    expect(configSrc).toMatch(/jspdf:\s*\[/);
  });

  it("splits react-markdown into its own chunk (124 KB)", () => {
    expect(configSrc).toMatch(/(['"]?)react-markdown\1\s*:\s*\[/);
  });

  it("splits dexie into its own chunk (93 KB, encrypted local store)", () => {
    expect(configSrc).toMatch(/dexie:\s*\[/);
  });

  // C2 additions — these are heavy deps that previously auto-chunked with unstable names
  it("splits @huggingface/transformers into its own chunk (544 KB, MiniLM embedder)", () => {
    expect(configSrc).toMatch(/transformers:\s*\[/);
  });

  it("splits vosk-browser into its own chunk (5.5 MB, on-device STT)", () => {
    expect(configSrc).toMatch(/vosk:\s*\[/);
  });

  it("splits html2canvas into its own chunk (198 KB, jspdf transitive dep)", () => {
    expect(configSrc).toMatch(/html2canvas:\s*\[/);
  });

  it("splits dompurify into its own chunk (27 KB, jspdf transitive dep)", () => {
    expect(configSrc).toMatch(/dompurify:\s*\[/);
  });
});
