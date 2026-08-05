import { describe, it, expect } from "vitest";
import { normalizeText } from "./textNormalize";

const ZWSP = String.fromCharCode(0x200b); // zero-width space
const ZWNJ = String.fromCharCode(0x200c); // zero-width non-joiner
const ZWJ = String.fromCharCode(0x200d); // zero-width joiner
const BOM = String.fromCharCode(0xfeff); // zero-width no-break space
const CURLY_APOSTROPHE = String.fromCharCode(0x2019); // U+2019, what iOS/Gboard emit by default

describe("normalizeText", () => {
  it("lowercases", () => {
    expect(normalizeText("HELLO World")).toBe("hello world");
  });

  it("strips a zero-width space injected mid-word so it cannot evade a substring match", () => {
    expect(normalizeText(`s${ZWSP}top taking my meds`)).toBe("stop taking my meds");
  });

  it("strips zero-width non-joiner, zero-width joiner, and BOM/zero-width-no-break-space", () => {
    expect(normalizeText(`a${ZWNJ}b${ZWJ}c${BOM}d`)).toBe("abcd");
  });

  it("unifies the typographic apostrophe (U+2019) to a straight ASCII apostrophe", () => {
    expect(normalizeText(`i can${CURLY_APOSTROPHE}t go on`)).toBe("i can't go on");
  });

  it("leaves a straight apostrophe untouched", () => {
    expect(normalizeText("i can't go on")).toBe("i can't go on");
  });

  it("collapses internal whitespace, including a line break, to a single space", () => {
    expect(normalizeText("you're\nworthless")).toBe("you're worthless");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeText("  hi  ")).toBe("hi");
  });
});
