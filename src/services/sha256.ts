// Incremental SHA-256 (FIPS 180-4), pure and dependency-free. Extracted from modelDownload.ts so it can
// be shared with other on-device asset downloaders (onDeviceAssets.ts) without duplicating the ~100-line
// implementation. We can't use WebCrypto (crypto.subtle.digest) for large files: it's a ONE-SHOT API that
// needs the whole buffer in memory at once, which OOMs the WebView for a multi-GB model. This hasher reads
// input in bounded CHUNKS instead.
export class Sha256 {
  private static readonly K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  private h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  private readonly buf = new Uint8Array(64); // one 512-bit block awaiting a full 64 bytes
  private bufLen = 0;
  private lenBytes = 0; // total message length (for the length padding)
  private readonly w = new Uint32Array(64);

  update(chunk: Uint8Array): void {
    this.lenBytes += chunk.length;
    let i = 0;
    // Top up a partial block first.
    if (this.bufLen > 0) {
      const need = 64 - this.bufLen;
      const take = Math.min(need, chunk.length);
      this.buf.set(chunk.subarray(0, take), this.bufLen);
      this.bufLen += take;
      i = take;
      if (this.bufLen === 64) {
        this.block(this.buf, 0);
        this.bufLen = 0;
      }
    }
    // Consume whole 64-byte blocks straight from the chunk.
    for (; i + 64 <= chunk.length; i += 64) this.block(chunk, i);
    // Stash the remainder.
    if (i < chunk.length) {
      this.buf.set(chunk.subarray(i), this.bufLen);
      this.bufLen += chunk.length - i;
    }
  }

  digestHex(): string {
    // Pad: 0x80, then zeros, then the 64-bit big-endian bit length.
    const bitLen = this.lenBytes * 8;
    const pad = new Uint8Array((this.bufLen < 56 ? 56 : 120) - this.bufLen + 8);
    pad[0] = 0x80;
    // JS bit ops are 32-bit; write the length as two 32-bit halves (hi is ~0 for any realistic file).
    const hi = Math.floor(bitLen / 0x100000000);
    const lo = bitLen >>> 0;
    const dv = new DataView(pad.buffer);
    dv.setUint32(pad.length - 8, hi);
    dv.setUint32(pad.length - 4, lo);
    this.update(pad);
    let out = "";
    for (let j = 0; j < 8; j++) out += this.h[j].toString(16).padStart(8, "0");
    return out;
  }

  private block(p: Uint8Array, off: number): void {
    const w = this.w;
    for (let t = 0; t < 16; t++) {
      w[t] = (p[off + t * 4] << 24) | (p[off + t * 4 + 1] << 16) | (p[off + t * 4 + 2] << 8) | p[off + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = this.h[0], b = this.h[1], c = this.h[2], d = this.h[3];
    let e = this.h[4], f = this.h[5], g = this.h[6], hh = this.h[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + Sha256.K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    this.h[0] = (this.h[0] + a) | 0; this.h[1] = (this.h[1] + b) | 0;
    this.h[2] = (this.h[2] + c) | 0; this.h[3] = (this.h[3] + d) | 0;
    this.h[4] = (this.h[4] + e) | 0; this.h[5] = (this.h[5] + f) | 0;
    this.h[6] = (this.h[6] + g) | 0; this.h[7] = (this.h[7] + hh) | 0;
  }
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** Decode a base64 string (Filesystem.readFile's binary form) into bytes. */
export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
