export function ls(): Storage | null {
  try {
    return (globalThis as any).localStorage ?? null;
  } catch {
    return null;
  }
}

export const DAY_MS = 86400000;
