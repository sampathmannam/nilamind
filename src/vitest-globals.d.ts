/// <reference types="vitest/globals" />

// Vite-injected build constant (see vite.config.ts `define`). Available at
// runtime; declared here so tsc is satisfied without importing package.json.
declare const __APP_VERSION__: string;

declare namespace vi {
  function fn<T extends (...args: unknown[]) => unknown>(implementation?: T): Mock<T>;
  function mock(moduleName: string, factory?: () => unknown, options?: { virtual?: boolean }): void;
  function unmock(moduleName: string): void;
  function resetAllMocks(): void;
  function restoreAllMocks(): void;
  function clearAllMocks(): void;
  function useFakeTimers(): void;
  function useRealTimers(): void;
  function advanceTimersByTime(ms: number): void;
  function runOnlyPendingTimers(): void;
  function spyOn<T extends object, K extends keyof T>(object: T, method: K): Mock<T[K]>;
  const fn: typeof vi.fn;
  const mock: typeof vi.mock;
  const unmock: typeof vi.unmock;
  const resetAllMocks: typeof vi.resetAllMocks;
  const restoreAllMocks: typeof vi.restoreAllMocks;
  const clearAllMocks: typeof vi.clearAllMocks;
  const useFakeTimers: typeof vi.useFakeTimers;
  const useRealTimers: typeof vi.useRealTimers;
  const advanceTimersByTime: typeof vi.advanceTimersByTime;
  const runOnlyPendingTimers: typeof vi.runOnlyPendingTimers;
  const spyOn: typeof vi.spyOn;
}

declare const vi: typeof import("vitest")["vitest"] & {
  fn: typeof vi.fn;
  mock: typeof vi.mock;
  unmock: typeof vi.unmock;
  resetAllMocks: typeof vi.resetAllMocks;
  restoreAllMocks: typeof vi.restoreAllMocks;
  clearAllMocks: typeof vi.clearAllMocks;
  useFakeTimers: typeof vi.useFakeTimers;
  useRealTimers: typeof vi.useRealTimers;
  advanceTimersByTime: typeof vi.advanceTimersByTime;
  runOnlyPendingTimers: typeof vi.runOnlyPendingTimers;
  spyOn: typeof vi.spyOn;
};
