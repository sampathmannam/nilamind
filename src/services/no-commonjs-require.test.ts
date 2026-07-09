import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// audit #8: buildPersonalContext used CommonJS require("./behaviouralActivation" / "./proactiveEngine"),
// which throws "require is not defined" in the ESM Capacitor WebView bundle and was swallowed by try/catch —
// so those context blocks silently never reached the model in production. Node's test env HAS require, so a
// behavioural test can't catch this class of bug; this source-level scan can. Production source must be pure ESM.
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("no CommonJS require() in production ESM source (audit #8)", () => {
  it("src/**/*.{ts,tsx} (excluding tests) contains no `require(` calls", () => {
    const files = walk(join(process.cwd(), "src"));
    const offenders: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, ""); // ignore // comments
        if (/\brequire\s*\(/.test(code)) offenders.push(`${f.replace(process.cwd() + "/", "")}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
