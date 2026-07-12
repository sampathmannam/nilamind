import { getActiveProgress, advanceProtocol, startProtocol } from "./protocolProgress";
import { getProtocol } from "./protocols";
import { upsertActivity, loadActivities, type BAActivityLog, type BACategory, BA_CATEGORIES } from "./behaviouralActivation";
import { ACTIVITY_MENU, type ActivityIdea } from "./behaviouralActivation";

export type BAStepSignal =
  | { kind: "menu"; stepId: string; categories: { category: BACategory; activities: { title: string; tiny: string }[] }[] }
  | { kind: "rating"; stepId: string; activityId: string; title: string };

export type BAAction =
  | { type: "pick_activity"; activity: { id: string; title: string; category: BACategory; tiny: string } }
  | { type: "rate_activity"; activityId: string; mastery: number; pleasure: number }
  | { type: "skip_rating"; activityId: string }
  | { type: "advance_step" };

/**
 * Check if the current BA protocol step should surface a BA engine interaction.
 * Returns the signal for the UI, or null if no BA interaction needed at this step.
 */
export function getBAStepSignal(): BAStepSignal | null {
  const active = getActiveProgress();
  if (!active || active.protocol.id !== "behavioral-activation") return null;

  const step = active.step;

  // Plan step (ba-3): show activity menu grouped by category
  if (step.id === "ba-3") {
    const categories = BA_CATEGORIES.map((cat) => ({
      category: cat.id,
      activities: ACTIVITY_MENU
        .filter((a) => a.category === cat.id)
        .map((a) => ({ title: a.title, tiny: a.tiny })),
    })).filter((g) => g.activities.length > 0);
    return { kind: "menu", stepId: step.id, categories };
  }

  // Exercise step (ba-4): could show scheduling prompt
  // Reflect step (ba-5): rating will be handled by user response

  return null;
}

/**
 * Get activity ideas for a category, filtered for BA protocol use.
 */
export function getBAActivityIdeas(category: BACategory): ActivityIdea[] {
  return ACTIVITY_MENU.filter((a) => a.category === category);
}

/**
 * Pick an activity from the menu - logs it as planned and advances to next step.
 */
export function pickBAActivity(title: string, category: BACategory): BAActivityLog {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const activityId = `ba_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const activity: BAActivityLog = {
    id: activityId,
    date,
    timestamp,
    title,
    category,
    status: "planned",
  };

  upsertActivity(activity);
  advanceProtocol(); // Move to exercise step
  return activity;
}

/**
 * Handle a BA action from the user (picking activity, rating, advancing step).
 * Returns the next step signal or null if done.
 */
export function handleBAAction(action: BAAction): BAStepSignal | { done: true } | null {
  const active = getActiveProgress();
  if (!active || active.protocol.id !== "behavioral-activation") return null;

  const step = active.step;

  switch (action.type) {
    case "pick_activity": {
      // User picked an activity at plan step (ba-3)
      if (step.id !== "ba-3") return null;

      const activityId = `ba_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const timestamp = now.toTimeString().slice(0, 5);

      upsertActivity({
        id: activityId,
        date,
        timestamp,
        title: action.activity.title,
        category: action.activity.category,
        status: "planned",
        note: `Tiny version: ${action.activity.tiny}`,
      });

      // Advance to exercise step
      const next = advanceProtocol();
      if (next && "step" in next) {
        return { kind: "rating", stepId: next.step.id, activityId, title: action.activity.title };
      }
      return null;
    }

    case "rate_activity": {
      // User rated an activity at reflect step (ba-5)
      if (step.id !== "ba-5") return null;

      // Find and update the activity with ratings
      const activities = loadActivities();
      const activity = activities.find((a) => a.id === action.activityId);
      if (activity) {
        upsertActivity({
          ...activity,
          status: "done",
          mastery: action.mastery,
          pleasure: action.pleasure,
        });
      }
      return null;
    }

    case "skip_rating": {
      if (step.id !== "ba-5") return null;
      // Just advance without rating
      advanceProtocol();
      return null;
    }

    case "advance_step": {
      const next = advanceProtocol();
      if (next && "done" in next && next.done) {
        return { done: true };
      }
      if (next && "step" in next) {
        return getBAStepSignal();
      }
      return null;
    }
  }

  return null;
}

/**
 * Start BA protocol and return first step + signal if any.
 */
export function startBAProtocol() {
  const result = startProtocol("behavioral-activation");
  if (!result) return null;
  return {
    ...result,
    signal: getBAStepSignal(),
  };
}

/**
 * Get all activities for the current BA protocol (planned + done).
 */
export function getBAActivities(): BAActivityLog[] {
  return loadActivities().filter((a) => a.id.startsWith("ba_"));
}

/**
 * Get BA insight for the current protocol run.
 */
export function getBAInsight() {
  return computeInsight(getBAActivities());
}

// Re-export computeInsight for external use
import { computeInsight } from "./behaviouralActivation";