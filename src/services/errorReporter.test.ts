import { describe, it, expect, vi, beforeEach } from "vitest";
import { onError, reportError, reportSilentError } from "./errorReporter";

let handler: ((error: unknown, context: string) => void) | null = null;

beforeEach(() => {
  handler = null;
  onError(null as any);
});

describe("onError", () => {
  it("registers a handler", () => {
    const cb = vi.fn();
    onError(cb);
    reportError("test error", "test");
    expect(cb).toHaveBeenCalledOnce();
  });
});

describe("reportError", () => {
  it("calls registered handler with error and context", () => {
    const cb = vi.fn();
    onError(cb);
    reportError(new Error("boom"), "myContext");
    expect(cb).toHaveBeenCalledWith(expect.any(Error), "myContext");
    expect((cb.mock.calls[0][0] as Error).message).toBe("boom");
  });

  it("does not throw when no handler is registered", () => {
    expect(() => reportError("error", "ctx")).not.toThrow();
  });
});

describe("reportSilentError", () => {
  it("calls handler with Error and context", () => {
    const cb = vi.fn();
    onError(cb);
    reportSilentError("silentCtx");
    expect(cb).toHaveBeenCalledOnce();
    const [error, ctx] = cb.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Silent catch hit");
    expect(ctx).toBe("silentCtx");
  });
});

describe("multiple handlers", () => {
  it("supports replacing the handler (last one wins)", () => {
    const first = vi.fn();
    const second = vi.fn();
    onError(first);
    onError(second);
    reportError("err", "ctx");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
