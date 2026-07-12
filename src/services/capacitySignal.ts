export type CapacityLevel = "low" | "medium" | "high";

export function getCapacityLevel(userState: "calm" | "anxious" | "low" | "elevated" | "crisis" | null): CapacityLevel {
  if (!userState || userState === "calm") return "high";
  if (userState === "anxious") return "medium";
  return "low";
}

export function capacityAdaptiveTaskLimit(level: CapacityLevel): number {
  switch (level) {
    case "low": return 2;
    case "medium": return 4;
    case "high": return 7;
  }
}
