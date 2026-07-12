import type { SafetyPlan } from "../types";

export interface MeansCategory {
  id: string;
  label: string;
  description: string;
  examples: string[];
  collaborativePrompt: string;
  strategies: string[];
}

export type CoachingPhase = "intro" | "explore" | "strategize" | "commit" | "connect";

export interface CoachingStep {
  id: string;
  phase: CoachingPhase;
  title: string;
  content: string;
  prompt: string;
}

export interface MeansCoachingProgress {
  startedAt: number;
  completedCategories: string[];
  selectedStrategies: Record<string, string[]>;
  commitmentText: string;
  completed: boolean;
}

export function getMeansSafetyCategories(): MeansCategory[] {
  return [
    {
      id: "medications",
      label: "Medications",
      description:
        "A calm look at how medications are stored and managed. During tough moments, having easy access to a large supply can feel risky. This is about small adjustments — not stopping any medication.",
      examples: [
        "mood stabilisers kept in one place",
        "sleep aids near the bedside",
        "pain relief tablets in the bag",
      ],
      collaborativePrompt:
        "Are there any medications in your home that could feel unsafe to have easy access to during a really hard moment? No right or wrong answers.",
      strategies: [
        "Ask a trusted person to hold a weekly supply and dispense daily doses",
        "Use a timed-lock safe or lockable medicine box",
        "Keep only a few days' supply at home and store the rest with a trusted person",
        "Set up a blister-pack service through your pharmacy",
      ],
    },
    {
      id: "sharp-objects",
      label: "Sharp objects",
      description:
        "A gentle look at objects around the home that could be used to harm. This isn't about getting rid of things you need — just noticing them and making a small plan for tough moments.",
      examples: [
        "kitchen knives in a block",
        "razor blades or shaving tools",
        "scissors, craft blades, box cutters",
      ],
      collaborativePrompt:
        "Are there any sharp objects in your home that you'd like to have a simple plan for during really hard moments?",
      strategies: [
        "Store sharp objects in a locked drawer or cupboard and give the key to a trusted person",
        "Use a lockable tool box for all sharp items",
        "Keep only blunt/rounded alternatives available during difficult weeks (e.g., electric razor instead of blades)",
        "Ask a neighbour or friend to hold specific items for a set time",
      ],
    },
    {
      id: "ligature-points",
      label: "Ligature points",
      description:
        "Some spaces in the home can feel risky during intense distress. Noticing them ahead of time — calmly — makes it easier to avoid them in a crisis. This is about awareness, not alarm.",
      examples: [
        "robe hooks on the back of a door",
        "ceiling beams or exposed pipes",
        "scarf rack or belt hooks in a wardrobe",
        "balcony railing or stairwell bannister",
      ],
      collaborativePrompt:
        "Are there places or fixtures in your home that you'd like to make a small plan around — just for tough moments?",
      strategies: [
        "Remove or cover hooks and ligature points in bathrooms and bedrooms",
        "Use breakaway or magnetic hooks that release under weight",
        "Keep doors to high-risk areas (garage, balcony) locked during difficult periods",
        "Rearrange furniture to block access to risky fixtures",
      ],
    },
    {
      id: "vehicles",
      label: "Vehicles & keys",
      description:
        "Access to a vehicle — even just the keys — can feel overwhelming during intense distress. A small temporary step can create space to pause.",
      examples: [
        "car keys on a hook by the door",
        "motorbike or scooter keys in a bag",
        "bicycle or e-bike in the hallway",
      ],
      collaborativePrompt:
        "Would it feel helpful to have a simple arrangement for vehicle access during hard moments — even temporarily?",
      strategies: [
        "Give car keys to a trusted person for a set period",
        "Store keys in a timed-lock safe",
        "Remove the battery or spark plug cable when not driving",
        "Park the vehicle at a trusted person's home for a few days",
      ],
    },
    // Pesticides & household poisons: a leading suicide method in India, and means restriction for
    // pesticides is among the best-evidenced population-level suicide interventions. Per the
    // 2026-07-12 clinical research synthesis (crisis-safety §2): Gunnell et al. (2017), Lancet Global
    // Health; Bonvoisin et al. (2020), BMC Public Health.
    {
      id: "pesticides-poisons",
      label: "Pesticides & household poisons",
      description:
        "A calm look at pesticides and other household poisons stored around the home. During tough moments, having easy access can feel risky. This is about small adjustments — not judgment about how or why they're kept.",
      examples: [
        "pesticides or weedkiller in a shed or storeroom",
        "rat poison or insecticide under a sink",
        "industrial cleaning chemicals in the kitchen or bathroom",
      ],
      collaborativePrompt:
        "Are there any pesticides or household chemicals in your home that could feel unsafe to have easy access to during a really hard moment? No right or wrong answers.",
      strategies: [
        "Ask a trusted person to hold pesticides or chemicals for a set period",
        "Use a locked shed, cupboard, or storage box for pesticides and give the key to a trusted person",
        "Keep only what's needed for the current task and safely dispose of the rest",
        "Store pesticides at a neighbour's or trusted person's home during difficult periods",
      ],
    },
    {
      id: "alcohol-substances",
      label: "Alcohol & other substances",
      description:
        "Alcohol and recreational substances can lower inhibitions and make impulsive actions harder to resist. This is a non-judgmental look at what's in the home and a small plan for tough moments.",
      examples: [
        "beer, wine, or spirits in the cabinet",
        "cannabis or other recreational substances",
        "prescribed sedatives or benzodiazepines",
      ],
      collaborativePrompt:
        "Are there any substances in your home that you'd like a simple plan for during hard moments? No judgment either way.",
      strategies: [
        "Ask a trusted person to hold alcohol and other substances for a set period",
        "Keep only small quantities at home (e.g., one drink at a time)",
        "Pour out or safely dispose of any substance that feels risky",
        "Set a personal no-use agreement during difficult periods and share it with someone you trust",
      ],
    },
  ];
}

export function getCoachingSteps(): CoachingStep[] {
  const cats = getMeansSafetyCategories();
  const steps: CoachingStep[] = [
    {
      id: "intro",
      phase: "intro",
      title: "Gentle check-in on home safety",
      // "Time and distance" framing: collaborative, autonomy-respecting wording validated as acceptable
      // to suicidal adults. Per the 2026-07-12 clinical research synthesis (crisis-safety §3):
      // Betz et al. (2020), JMIR; VA lethal-means-safety guidance; Harvard Means Matter.
      content:
        "This is a calm, no-pressure look at your home environment. The idea is simple: in a really tough moment, having easy access to things that could cause harm can make things harder. By noticing them now — when you're calm — you can make a small plan that could help later.\n\nPutting a little time and distance between a hard moment and anything that could cause harm is one of the simplest, most well-supported things you can do — it gives an intense feeling a chance to pass.\n\nThis isn't about getting rid of things you need or use every day. It's about small adjustments that create a little more space between a tough feeling and a permanent action.\n\nYou can explore the categories below, one at a time. Skip any that don't apply. There's no right or wrong way to do this.",
      prompt:
        "Would you like to explore some areas of home safety together? You can go through as many or as few as you like.",
    },
  ];

  for (const cat of cats) {
    steps.push({
      id: `explore-${cat.id}`,
      phase: "explore",
      title: `Explore: ${cat.label}`,
      content: `${cat.description}\n\nExamples: ${cat.examples.join(", ")}`,
      prompt: cat.collaborativePrompt,
    });
    steps.push({
      id: `strategize-${cat.id}`,
      phase: "strategize",
      title: `Strategies: ${cat.label}`,
      content: `Some ideas that have helped others:\n\n${cat.strategies.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      prompt: "Do any of these feel worth trying? Or is there another approach that fits your situation better?",
    });
  }

  steps.push(
    {
      id: "commit",
      phase: "commit",
      title: "Your safety commitment",
      content:
        "Based on what you've explored, is there one small step you'd like to take? It doesn't have to be big or permanent — just one thing that feels doable.\n\nYou can write it in your own words. This isn't a legal promise — it's a note to your future self from a calm moment.",
      prompt:
        "What's one small step you'd like to take to make your space feel safer?",
    },
    {
      id: "connect",
      phase: "connect",
      title: "Update your safety plan",
      content:
        "What you've thought through here can be added to section 6 of your safety plan ('Making my space safer'). That way it's waiting there if you ever need it.\n\nYour safety plan lives only on your phone — nothing leaves the device.",
      prompt:
        "Would you like to add this to your safety plan's 'Making my space safer' section?",
    },
  );

  return steps;
}

export function generateSafeEnvironmentBlock(progress: MeansCoachingProgress): string {
  const parts: string[] = [];

  if (progress.completedCategories.length === 0) {
    parts.push(
      "A calm look at home safety — noticing small adjustments that create space between distress and action."
    );
    return parts.join("\n\n");
  }

  parts.push("Areas I've explored:");

  for (const catId of progress.completedCategories) {
    const cat = getMeansSafetyCategories().find((c) => c.id === catId);
    if (!cat) continue;
    parts.push(`- ${cat.label}`);
    const strategies = progress.selectedStrategies[catId];
    if (strategies && strategies.length > 0) {
      for (const s of strategies) {
        parts.push(`  → ${s}`);
      }
    }
  }

  if (progress.commitmentText) {
    parts.push(`\nOne step I'm taking: ${progress.commitmentText}`);
  }

  return parts.join("\n");
}

export function generateMeansSafetyContextBlock(
  progress: MeansCoachingProgress | null | undefined
): string {
  if (!progress || progress.startedAt === 0) return "";

  const parts: string[] = [];
  parts.push(
      "MEANS SAFETY: The user has explored means safety coaching. This is a gentle, collaborative area of their safety plan. If they bring it up, respond calmly and without alarm. Do not ask 'do you have means' or 'what did you plan' — let them lead. If they mention specific means, acknowledge their honesty and redirect to the safety plan section 6 (safe environment)."
  );

  return parts.join("\n");
}
