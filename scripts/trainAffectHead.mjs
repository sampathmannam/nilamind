// Trains the on-device affect (valence/arousal) head for the orb's per-turn accent — bootstrap v1.
// Weak-labeled examples come from personaConfig.ts's EMOTION_KEYWORDS label set (mirrored here, not
// imported — this script runs in plain Node, personaConfig.ts is app TS) mapped to approximate
// valence/arousal coordinates (a manual placement inspired by Russell's 1980 circumplex model of
// affect, not a fitted value — same "engineering judgment call" posture as this codebase's other
// uncalibrated defaults, e.g. crisisClassifier.ts's CRISIS_HIGH_CONFIDENCE_THRESHOLD). Refined against
// a small hand-authored gold set, held out and never trained on, for a directional sanity check.
// Run: node scripts/trainAffectHead.mjs
// Writes: src/services/affectHead.weights.json
import { writeFileSync } from "node:fs";
import { pipeline } from "@huggingface/transformers";

const LABEL_COORDS = {
  happy: { valence: 0.8, arousal: 0.5 },
  neutral: { valence: 0.0, arousal: 0.0 },
  sad: { valence: -0.7, arousal: -0.3 },
  numb: { valence: -0.3, arousal: -0.6 },
  anxious: { valence: -0.5, arousal: 0.7 },
  lonely: { valence: -0.6, arousal: -0.2 },
  angry: { valence: -0.6, arousal: 0.8 },
  overwhelmed: { valence: -0.5, arousal: 0.6 },
  stressed: { valence: -0.4, arousal: 0.6 },
  hopeless: { valence: -0.8, arousal: -0.3 },
  // personaConfig.ts's "crisis" and "distress" labels share one regex — collapsed to one bucket here.
  // Deliberately NOT using explicit self-harm phrasing: a turn that actually trips §9 returns before
  // ModeScreen ever calls this head in production (see ModeScreen.tsx's crisis-blocked early return),
  // so training on severe-but-non-crisis despair language is both sufficient and more representative
  // of what this head will actually see live.
  distress: { valence: -0.9, arousal: 0.2 },
};

const WEAK_EXAMPLES = {
  happy: [
    "I had such a great day today, everything went so well.",
    "I feel so grateful and happy right now, honestly.",
    "Things are going wonderfully and I'm celebrating with friends tonight.",
    "I'm in such a good mood, today felt amazing.",
    "I'm really happy about how things turned out.",
  ],
  neutral: [
    "What time is my appointment tomorrow afternoon?",
    "Can you remind me to take my medication at 8pm?",
    "I need to reschedule my therapy session for next week.",
    "Just checking in, nothing much going on today.",
    "I went grocery shopping and did some laundry earlier.",
  ],
  sad: [
    "I've been feeling really down and sad the past few days.",
    "I keep crying and I don't really know why.",
    "Everything feels heavy and I just feel low today.",
    "I feel so sad, like nothing is going right.",
    "I've been tearful and low energy all week.",
  ],
  numb: [
    "I just feel numb, like nothing really matters right now.",
    "Everything feels empty and hollow lately.",
    "I feel flat, like I can't really feel anything at all.",
    "It's like I'm going through the motions, completely numb inside.",
    "I feel hollow and disconnected from everything around me.",
  ],
  anxious: [
    "I feel so anxious right now, my heart is racing.",
    "I'm panicking about tomorrow, I'm really scared.",
    "I feel terrified and worried something bad is going to happen.",
    "I'm freaking out, I can't calm this anxious feeling down.",
    "I feel really on edge and fearful today.",
  ],
  lonely: [
    "I feel so lonely lately, like nobody understands me.",
    "I've been isolated and alone most of this week.",
    "I feel disconnected from everyone, like no one's really there.",
    "Nobody checks in on me, I feel so alone.",
    "I feel like I don't have anyone, so isolated right now.",
  ],
  angry: [
    "I'm so furious right now, this is really infuriating.",
    "I feel pissed off and irritated at everyone today.",
    "I'm in a rage, I can't believe they did that.",
    "I feel so angry, everything is annoying me right now.",
    "I'm irritated and frustrated, honestly kind of furious.",
  ],
  overwhelmed: [
    "It's all too much right now, I feel so overwhelmed.",
    "I can't handle everything on my plate, it's overwhelming.",
    "I'm overwhelmed with everything going on, it's too much.",
    "There's just too much happening and I can't keep up.",
    "I feel completely overwhelmed and can't handle it anymore.",
  ],
  stressed: [
    "I'm so stressed about this deadline, the pressure is intense.",
    "Work stress is getting to me, I feel the pressure building.",
    "I'm under so much pressure with these deadlines lately.",
    "The stress is really getting to me this week.",
    "I feel stressed out with all this pressure at work.",
  ],
  hopeless: [
    "I feel so hopeless, like nothing I do matters anymore.",
    "What's the point, everything feels pointless right now.",
    "I feel like giving up, nothing seems to matter.",
    "It all feels hopeless, like there's no point trying.",
    "I feel like there's no point in anything anymore.",
  ],
  distress: [
    "I feel utterly broken and in so much pain right now.",
    "This pain is unbearable, I don't know how much more I can take.",
    "I feel completely devastated and shattered inside.",
    "I'm in so much emotional pain, it's overwhelming everything.",
    "I feel like I'm falling apart and can't hold it together anymore.",
  ],
};

// Held out — NEVER trained on, sanity-check only.
const GOLD_SET = [
  { text: "Today was wonderful, I'm smiling so much", valence: 0.8, arousal: 0.4 },
  { text: "I feel calm and content just relaxing at home", valence: 0.5, arousal: -0.3 },
  { text: "I'm buzzing with excitement about the trip next week", valence: 0.7, arousal: 0.6 },
  { text: "Just a normal quiet afternoon, nothing special", valence: 0.0, arousal: -0.1 },
  { text: "My chest feels tight and I can't stop worrying", valence: -0.5, arousal: 0.7 },
  { text: "I'm shaking with rage after that conversation", valence: -0.7, arousal: 0.8 },
  { text: "I feel so drained and empty, like there's nothing left", valence: -0.4, arousal: -0.6 },
  { text: "Everyone keeps leaving, I feel so isolated these days", valence: -0.6, arousal: -0.2 },
  { text: "There's too much on my plate and I'm about to break", valence: -0.5, arousal: 0.6 },
  { text: "I don't see the point in trying anymore, it's all pointless", valence: -0.8, arousal: -0.3 },
  { text: "I can't believe how good things are going for me lately", valence: 0.7, arousal: 0.3 },
  { text: "I feel jittery and can't sit still, my mind is racing", valence: -0.3, arousal: 0.8 },
  { text: "Had a peaceful walk this morning, feeling pretty good", valence: 0.5, arousal: -0.2 },
  { text: "I keep tearing up out of nowhere, I feel so low", valence: -0.7, arousal: -0.3 },
  { text: "This deadline is crushing me, I can barely breathe", valence: -0.5, arousal: 0.7 },
  { text: "I feel so grateful for my friends right now", valence: 0.8, arousal: 0.3 },
  { text: "Nothing feels real, I'm just going through the motions", valence: -0.3, arousal: -0.5 },
  { text: "What time does the pharmacy close today", valence: 0.0, arousal: 0.0 },
  { text: "I'm so annoyed, people keep ignoring what I say", valence: -0.6, arousal: 0.7 },
  { text: "I feel hopeful about the future for the first time in a while", valence: 0.6, arousal: 0.2 },
];

function buildTrainingExamples() {
  const examples = [];
  for (const [label, sentences] of Object.entries(WEAK_EXAMPLES)) {
    const coords = LABEL_COORDS[label];
    for (const text of sentences) examples.push({ text, ...coords });
  }
  return examples;
}

function trainLinearHead(X, y, dim, { epochs = 300, lr = 0.05, l2 = 0.01 } = {}) {
  let coef = new Array(dim).fill(0);
  let bias = 0;
  const n = X.length;
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradCoef = new Array(dim).fill(0);
    let gradBias = 0;
    for (let i = 0; i < n; i++) {
      const emb = X[i];
      let z = bias;
      for (let d = 0; d < dim; d++) z += coef[d] * emb[d];
      const pred = Math.tanh(z);
      // d/dz of 0.5*(tanh(z)-y)^2 = (pred-y)*(1-pred^2)
      const err = (pred - y[i]) * (1 - pred * pred);
      gradBias += err;
      for (let d = 0; d < dim; d++) gradCoef[d] += err * emb[d];
    }
    bias -= lr * (gradBias / n);
    for (let d = 0; d < dim; d++) coef[d] -= lr * (gradCoef[d] / n + l2 * coef[d]);
  }
  return { coef, bias };
}

function predict(coef, bias, emb) {
  let z = bias;
  for (let d = 0; d < coef.length; d++) z += coef[d] * emb[d];
  return Math.tanh(z);
}

async function main() {
  console.log("Loading MiniLM (Xenova/all-MiniLM-L6-v2)...");
  const embed = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
  const vec = async (text) => Array.from((await embed(text, { pooling: "mean", normalize: true })).data);

  const examples = buildTrainingExamples();
  console.log(`Embedding ${examples.length} weak-labeled training examples...`);
  const X = [];
  for (const ex of examples) X.push(await vec(ex.text));
  const dim = X[0].length;
  const yValence = examples.map((e) => e.valence);
  const yArousal = examples.map((e) => e.arousal);

  console.log("Training valence head...");
  const valenceHead = trainLinearHead(X, yValence, dim);
  console.log("Training arousal head...");
  const arousalHead = trainLinearHead(X, yArousal, dim);

  console.log(`Embedding ${GOLD_SET.length} held-out gold examples for sanity check...`);
  let valenceCorrect = 0, valenceTotal = 0, arousalCorrect = 0, arousalTotal = 0;
  for (const g of GOLD_SET) {
    const emb = await vec(g.text);
    const predValence = predict(valenceHead.coef, valenceHead.bias, emb);
    const predArousal = predict(arousalHead.coef, arousalHead.bias, emb);
    if (Math.abs(g.valence) >= 0.1) {
      valenceTotal++;
      if (Math.sign(predValence) === Math.sign(g.valence)) valenceCorrect++;
    }
    if (Math.abs(g.arousal) >= 0.1) {
      arousalTotal++;
      if (Math.sign(predArousal) === Math.sign(g.arousal)) arousalCorrect++;
    }
  }
  const valenceAcc = valenceCorrect / valenceTotal;
  const arousalAcc = arousalCorrect / arousalTotal;
  console.log(`Held-out directional accuracy — valence: ${(valenceAcc * 100).toFixed(1)}%, arousal: ${(arousalAcc * 100).toFixed(1)}%`);

  // v1 bootstrap bar: modest on purpose (small hand-authored dataset, linear head, no real user data
  // yet) — ships OFF by default pending device verification (see affectHead.ts), not held to the
  // crisis classifier's tuned, red-panel-vetted bar. Refine with real data in a later pass.
  const VALENCE_ACC_FLOOR = 0.6;
  const AROUSAL_ACC_FLOOR = 0.55;
  if (valenceAcc < VALENCE_ACC_FLOOR) {
    throw new Error(`Valence directional accuracy ${valenceAcc} below floor ${VALENCE_ACC_FLOOR} — do not ship these weights.`);
  }
  if (arousalAcc < AROUSAL_ACC_FLOOR) {
    throw new Error(`Arousal directional accuracy ${arousalAcc} below floor ${AROUSAL_ACC_FLOOR} — do not ship these weights.`);
  }

  const out = {
    valenceCoef: valenceHead.coef,
    valenceBias: valenceHead.bias,
    arousalCoef: arousalHead.coef,
    arousalBias: arousalHead.bias,
    _meta: {
      trainedOn: examples.length,
      goldSetSize: GOLD_SET.length,
      valenceHeldOutAccuracy: valenceAcc,
      arousalHeldOutAccuracy: arousalAcc,
    },
  };
  writeFileSync("src/services/affectHead.weights.json", JSON.stringify(out, null, 2));
  console.log("Wrote src/services/affectHead.weights.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
