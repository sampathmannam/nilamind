import { describe, it, expect } from "vitest";
import { Sha256, b64ToBytes } from "./sha256";

function encodeUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("Sha256", () => {
  it("produces known SHA-256 hash for 'hello'", () => {
    const hasher = new Sha256();
    hasher.update(encodeUtf8("hello"));
    const hex = hasher.digestHex();
    expect(hex).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("produces e3b0c442... for empty input", () => {
    const hasher = new Sha256();
    hasher.update(new Uint8Array(0));
    const hex = hasher.digestHex();
    expect(hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("handles incremental updates across multiple chunks", () => {
    const full = new Sha256();
    full.update(encodeUtf8("hel"));
    full.update(encodeUtf8("lo"));
    const fullHex = full.digestHex();

    const single = new Sha256();
    single.update(encodeUtf8("hello"));
    expect(fullHex).toBe(single.digestHex());
  });

  it("produces consistent results for the same input", () => {
    const h1 = new Sha256();
    h1.update(encodeUtf8("test data"));
    const h2 = new Sha256();
    h2.update(encodeUtf8("test data"));
    expect(h1.digestHex()).toBe(h2.digestHex());
  });
});

describe("b64ToBytes", () => {
  it("converts base64 to bytes correctly", () => {
    const b64 = btoa("hello");
    const bytes = b64ToBytes(b64);
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });

  it("handles empty base64 string", () => {
    const bytes = b64ToBytes("");
    expect(bytes.length).toBe(0);
  });

  it("round-trips through btoa", () => {
    const original = "NilaMind";
    const bytes = b64ToBytes(btoa(original));
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toBe(original);
  });
});
