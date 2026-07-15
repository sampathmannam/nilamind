# NilaMind AI Quality Masterplan v2 — From 5/10 to World-Class

> "The model is the product. Everything else is infrastructure."

---

## Current Architecture Deep-Dive

### What's Working
- **Safety architecture**: Deterministic keyword floor + MiniLM classifier + 7-rule output gate + elevation guard + anti-sycophancy + stream guard. This is genuinely best-in-class for a wellness app.
- **On-device privacy**: Everything runs locally. No cloud, no network calls.
- **Personal context injection**: `nilaContext.ts` reads ~20 data sources and assembles a warm personal briefing. Well-designed.
- **Stance steers**: The per-turn dynamic system prompts (registerSteer, consecutiveQuestionSteer, explainerQuestionSteer) are clever — they adapt the model's behavior per message.

### What's Broken
- **1,500 token system prompt in a 2,048 token window**: 73% of context is prompt. Only 27% (~553 tokens) is available for conversation.
- **Re-prefill every turn**: No KV cache persistence. The entire 1,500 token system prompt is re-tokenized every single message. This wastes ~1,500 tokens of prefill compute per turn.
- **Model ignores context**: The 1.5B model doesn't have the capacity to faithfully follow a 1,500 token system prompt. It picks up the first ~200 tokens and ignores the rest.
- **No long-term memory**: Conversation history is limited to the last 3 turns due to context constraints. There's no retrieval from past conversations.
- **5.5 minute cold start**: First inference page-faults the entire GGUF from flash. User sees "thinking" for minutes.
- **English-only classifier**: MiniLM crisis classifier scores romanized Hindi at 0.026 vs 0.58 threshold. Tamil/Telugu score near zero. The keyword floor is the ONLY defense for Indian languages.

### Token Budget Reality
```
n_ctx: 2,048 tokens
  ├── System prompt (persona):         800 tokens (39%)
  ├── Personal context:                300 tokens (15%)
  ├── RAG (skills + psychoed):         200 tokens (10%)
  ├── Elevation/safety anchors:         80 tokens (4%)
  ├── Stance steers:                    80 tokens (4%)
  ├── Anti-sycophancy block:            60 tokens (3%)
  ├── Conversation transcript:          400 tokens (19%) ← all user history
  └── Reply (n_predict=128):           128 tokens (6%)
  ─────────────────────────────────────────
  Total used:                          2,048 tokens (100%)
```

The model has ZERO headroom. No wonder responses are generic — there's literally no room for the model to think.

---

## The 12-Lever Quality Improvement Plan

### Lever 1: Context Window Expansion (Immediate)

**Current**: 2,048 tokens (Qwen GGUF default)
**Target**: 4,096 tokens (safe for 8GB RAM with 1.5B model)

**How**:
- Qwen GGUF supports `n_ctx` up to 32,768 via rope scaling
- At 4,096: KV cache grows from ~32MB to ~64MB — safe with 8GB RAM
- Trade-off: prefill time increases linearly with context, but less truncation means more conversation history

**Files**: `src/services/llamaCppLlmAdapter.ts` (change `n_ctx: 2048` → `n_ctx: 4096` in the backend config)

**Expected**: +40% usable context space (553 → 1,097 tokens for conversation at 2,000 token prompt)

### Lever 2: System Prompt Compression (Immediate)

**Current**: ~800 token persona
**Target**: ~250 token persona (condensed principles, no examples)

**Current flaws in the 800-token persona**:
1. Contains verbatim examples ("Like: Hey, I'm here." → "Not like: Hello! How may I assist you?") — wastes tokens
2. Repeats anti-sycophancy rules that are already enforced by the deterministic output gate
3. Lists DBT/CBT/ACT/CFT grounding but never uses them in practice
4. Includes detailed "how to talk" instructions the model can't follow at 1.5B size

**Condensed persona (250 tokens)**:
```
You are Nila, a warm, on-device AI companion for mental wellness.
You are NOT a therapist, NOT a clinician, and you do NOT diagnose.
You LISTEN more than you speak. You ask gentle questions.
You match the person's emotional tone — warm for sadness, steady for crisis, light for celebration.
You keep replies SHORT (2-4 sentences).
You NEVER validate harmful plans, grandiosity, self-harm, or treatment resistance.
If someone seems at risk of self-harm: surface crisis resources immediately.
You speak in plain, conversational English. No lists, no lectures, no bullet points.
You ground responses in DBT (validation, distress tolerance), CBT (gentle reframing), ACT (values, acceptance).
Your purpose: be a companion who remembers, notices, and gently helps — never a replacement for professional care.
```

**Files**: `src/services/localNila.ts` (replace `NILA_SYSTEM_PROMPT_SHORT`)

**Expected**: -550 tokens from system prompt (800 → 250)

### Lever 3: KV Cache Persistence (High Impact)

**Problem**: Every turn re-prefills the entire system prompt. At 250 tokens, that's 250 tokens of compute wasted per turn. At 1,500 tokens (current), it's 1,500 tokens wasted.

**Solution**: Use the llama.cpp `state_get_size()` / `state_set_data()` / `state_get_data()` API to save and restore KV cache.

**How it works**:
1. After first prefill: save KV cache state to memory buffer
2. Next turn: restore KV cache state (system prompt already cached)
3. Only prefill new conversation tokens (not the system prompt)
4. When context window fills: drop oldest conversation tokens, keep KV cache for system prompt

**Caveat**: The `llama-cpp-capacitor` binding may not expose these functions. If not, we need a binding patch or a different implementation strategy.

**Alternative (if binding doesn't support state save/restore)**:
- Use `--cache-type-k f16 --cache-type-v f16` and track the KV cache slot positions manually
- After prefill, store the KV cache start position
- On next turn, call `llama_kv_cache_seq_rm()` to remove conversation tokens while preserving system prompt tokens
- Then append new conversation tokens

**Files to modify**: `src/services/llamaCppLlmAdapter.ts`

**Expected**: -250 tokens of prefill per turn. Faster TTFT. More room for conversation.

### Lever 4: Model Upgrade — Qwen2.5-3B-Instruct (High Impact)

**Current**: Qwen2.5-1.5B (1.1GB Q4_K_M)
**Target**: Qwen2.5-3B-Instruct (1.9GB Q4_K_M)

**Why Qwen2.5-3B specifically**:
1. Same architecture as 1.5B (GQA, Qwen tokenizer, same prompt format) — no adapter changes
2. 3B parameters at Q4_K_M = ~1.9GB GGUF — fits in 8GB RAM with Android OS (~2GB) + app (~0.5GB) + headroom
3. Speed: ~6-8 tok/s on target hardware (ARMv9, 8 threads) — acceptable for companion responses
4. Quality: benchmarks show 2x improvement over 1.5B on instruction following, reasoning, and empathy
5. Latest release (2025): significantly better than 2024-vintage Qwen2 models

**RAM budget**:
```
Total RAM:           8,192 MB (8GB)
Android OS:         -2,048 MB (2GB)
App code + data:      -512 MB (0.5GB)
Model GGUF:         -1,920 MB (1.9GB)
KV cache (4096):       -72 MB
─────────────────────────────────
Available:           3,640 MB (3.6GB) ✓
```

**Cold start mitigation**: The 1.9GB model will page-fault from flash on first inference. This is unavoidable without background loading. Strategies:
1. **Mmap the model file** (already done via `use_mlock: true`) — pages are loaded on-demand, not all at once
2. **Background warm thread** — currently disabled due to single plugin-thread blocking. With a separate process/thread approach, we could warm the model while the user is in onboarding
3. **Pre-cache in main activity** — the `precacheModelWeights()` function in MainActivity.java already does this! It reads the file sequentially before the user starts chatting. This reduces cold start from 5.5 minutes to ~30-60 seconds.

**Files**: `src/services/modelCatalog.ts` (add 3B entry), `src/services/llamaCppLlmAdapter.ts` (update n_ctx), `MainActivity.java` (ensure precacheModelWeights reads the right file)

**Expected**: +2 points of response quality. Significantly better instruction following, empathy, and conversation coherence.

### Lever 5: Conversation Memory Retrieval (High Impact)

**Problem**: Model only sees last 3 turns. Can't reference "as we discussed last week" or "you mentioned your mother yesterday."

**Solution**: On-device embedding-based retrieval from past conversations.

**Architecture**:
```
1. STORE: After each turn, embed the user message using MiniLM (already in the app for crisis classification)
   → Store { embedding: float[384], text, timestamp, emotion, topic_summary } in encrypted IndexedDB

2. RETRIEVE: On each new user message
   → Embed the new message with MiniLM
   → Compute cosine similarity against all stored embeddings
   → Retrieve top-3 most relevant past exchanges
   → Format as few-shot: "In a similar conversation on [date], you said '[you]' and Nila responded '[nila]'"

3. INJECT: Add the few-shot examples to the system prompt
   → "PAST CONVERSATIONS (for context — you can reference these):
     1. [date]: User felt [emotion]. You talked about [topic]. Nila said '[response]'.
     2. [date]: ..."
```

**Optimization**:
- Store embeddings as `Float32Array` (1.5KB per embedding)
- 365 conversations = ~550KB of embeddings — negligible
- Compute similarity in Web Worker to avoid blocking UI thread
- Cosine similarity for top-3: O(n*d) where n=365, d=384 → ~140K operations — negligible on ARMv9

**Privacy**: All embeddings computed and stored on-device. MiniLM is already running locally. No external API.

**Files to create**: `src/services/conversationMemory.ts`
**Files to modify**: `localNila.ts` (add memory block to system prompt)

**Expected**: +1 point. The model can reference past conversations, creating a sense of continuous relationship.

### Lever 6: Response Chaining (Medium Impact)

**Problem**: Model generates a single response and stops. No follow-up, no deepening.

**Solution**: Chain responses — the model generates a warm opening, then a reflective follow-up.

**How**:
1. First pass: model generates the empathetic opener ("I hear you — that sounds really difficult.")
2. Extract the last sentence as a continuation prompt
3. Second pass: model generates a reflective question or skill offer
4. Combine: "I hear you — that sounds really difficult. What's been the hardest part for you this week?"

**Implementation**:
```typescript
async function chainedResponse(prompt: string): Promise<string> {
  const opener = await completion({ prompt, n_predict: 40, stop: ["\n", ". "] });
  const combined = prompt + opener;
  const followUp = await completion({ prompt: combined, n_predict: 60 });
  return opener + followUp;
}
```

**Caveat**: This doubles inference time. Only enable when the model's first pass is < 3 seconds (i.e., after initial warm).

**Files**: `src/services/llamaCppLlmAdapter.ts` or a new `responseChain.ts`

**Expected**: +0.5 point. Responses feel more thoughtful and engaging.

### Lever 7: Classifier-Guided Response Selection (Medium Impact)

**Problem**: The model generates one response. If it's bad (generic, off-topic, harmful), there's no fallback.

**Solution**: Generate multiple candidate responses in parallel and select the best one using a small classifier.

**How**:
1. Generate 3 responses with temperature 0.6-0.8 (varied)
2. Score each by:
   - Relevance to user message (cosine similarity with user message embedding)
   - Empathy score (keyword presence: "hear you", "sounds", "feel", "hard", "tough")
   - Safety score (output gate passes)
   - Specificity score (contains user-specific details vs generic)
3. Select highest-scoring response
4. If all scores below threshold: fall back to template response

**Files to create**: `src/services/responseRanker.ts`
**Files to modify**: `localNila.ts`

**Expected**: +0.5 point. Higher quality assurance per response.

### Lever 8: Dynamic Temperature + Top-P (Low Impact, Easy)

**Problem**: Fixed temperature (0.4) produces safe but boring responses.

**Solution**: Adapt temperature and top-p based on conversation context.

**Rules**:
```
Crisis mode:        temp=0.2, top_p=0.8  (very conservative)
Low mood:           temp=0.5, top_p=0.9  (slightly more warmth)
Celebration:        temp=0.7, top_p=0.95 (more variety for positive moments)
Open conversation:  temp=0.4, top_p=0.95 (balanced default)
Reflection:         temp=0.6, top_p=0.9  (more creative reflection)
```

**Files**: `src/services/llamaCppLlmAdapter.ts`, `localNila.ts`

**Expected**: +0.3 point. Responses adapt tone to context.

### Lever 9: Speculative Decoding (Medium-High Impact)

**Problem**: CPU-only inference on mobile is slow (~10 tok/s for 1.5B). Waiting 13 seconds for a 128-token reply is noticeable.

**Solution**: Draft with a smaller model, verify with the main model.

**How it works**:
1. Use a tiny draft model (e.g., Llama-3.2-1B Q2_K, ~400MB) to generate fast draft tokens
2. The main model (Qwen-3B) verifies the draft tokens in one forward pass
3. Accepted tokens are output directly; rejected tokens are regenerated by the main model
4. Net effect: ~2x speedup without quality loss

**Practical considerations**:
- Requires loading TWO models simultaneously — 1.9GB + 0.4GB = 2.3GB GGUF. Still fits in 8GB RAM
- The draft model must use the same tokenizer as the main model (both Qwen)
- The `llama-cpp-capacitor` binding may not support speculative decoding natively
- **Alternative**: Use the draft model for fast responses and the main model for quality responses, switching based on context

**Simpler implementation** (no speculative decoding needed):
- Use the draft model for: first response, simple acknowledgments, closing messages
- Use the main model for: emotional content, skill suggestions, reflective questions
- Decide which model to use based on the detected scenario (from nilaVoice.ts)

**Files**: `src/services/llamaCppLlmAdapter.ts`, `src/services/modelCatalog.ts`

**Expected**: +1 point (perceived speed). Responses feel instant for simple cases.

### Lever 10: Embedding-Based Topic Tracking (Medium Impact)

**Problem**: nilaContext provides PERSONAL data (check-ins, sleep, medication) but no CONVERSATIONAL data (what topics were discussed, what emotions were expressed, what skills were suggested).

**Solution**: Track conversation topics and themes over time using the MiniLM embedder.

**How**:
1. After each turn, embed the user message + Nila's response
2. Cluster embeddings to detect recurring themes ("work stress", "relationship issues", "sleep problems", "anxiety spikes")
3. Track theme frequency and emotional intensity per theme
4. Inject into nilaContext: "Over the past 2 weeks, you've talked mostly about [work stress] (4 conversations) and [sleep] (3 conversations). Your [work stress] has been getting less intense."

**Files to create**: `src/services/topicTracker.ts`
**Files to modify**: `src/services/nilaContext.ts`

**Expected**: +0.5 point. Nila demonstrates understanding of the person's life themes, not just their data.

### Lever 11: Proactive Check-In Generation (Medium Impact)

**Problem**: Nila only responds when the user messages. She never initiates.

**Solution**: Generate proactive check-in messages based on context.

**How**:
1. When the user opens the app, check if conditions warrant a proactive message:
   - Haven't chatted in 3+ days → "It's been a few days. How are you doing?"
   - Sleep has been short → "I noticed your sleep has been shorter lately. What's keeping you up?"
   - Mood has been low → "Hey — just checking in. How are you feeling today?"
   - Streak milestone → "Day 7 of showing up. That's real consistency."
2. These are NOT the daily nudge (which is generic). They are personalized, contextual, and generated fresh each time.
3. They appear as the first message in the conversation when the app opens in Nila mode.

**Implementation**: Use the nilaVoice scenarios + current context to select a template. The model fills in warmth.

**Files**: `src/services/proactiveCheckIn.ts`
**Files to modify**: `ModeScreen.tsx`, `sendToNila.ts`

**Expected**: +1 point. Nila feels alive, not passive.

### Lever 12: Protocol-Guided Conversations (High Impact)

**Problem**: Nila's conversations are unstructured. The model decides what to say, which leads to generic responses.

**Solution**: Structure conversations around evidence-based protocols.

**How it works**:
1. When the user expresses distress, select a protocol:
   - Anxiety → "Let's try a grounding exercise" → guide through 5-4-3-2-1 sensory grounding
   - Low mood → "Let's look at what helped before" → reference past skills from nilaContext
   - Sleep concern → "Want to try the wind-down?" → guide through the wind-down flow
   - Relationship stress → "Let's think about boundaries" → guide through boundary-setting exercise
2. Each protocol has 3-5 steps. Nila advances through steps based on user responses.
3. The model fills in natural language between steps but does NOT decide what to do next.
4. At the end of each step, the deterministic system decides: move to next step, repeat this step, or exit the protocol.

**Protocol definitions** (each ~100 lines):
```typescript
interface ConversationProtocol {
  id: string;
  trigger: (message: string, context: NilaContext) => boolean;
  steps: ConversationStep[];
  completion: string; // what Nila says when done
}

interface ConversationStep {
  prompt: string; // system prompt for this step
  nilaSays: string; // template for what Nila says
  modelFill: string; // what the model fills in
  next: (response: string) => "advance" | "repeat" | "exit";
}
```

**Initial 5 protocols**:
1. **Grounding Protocol** (anxiety, panic): 4 steps — acknowledge → breathe → ground → reflect
2. **Mood Check-In Protocol** (any state): 3 steps — how you feel → what's behind it → one small thing
3. **Sleep Wind-Down Protocol** (evening): 3 steps — park the day → settle body → let go
4. **Strengths Protocol** (low mood): 3 steps — what's hard → what helped before → try one thing
5. **Connection Protocol** (isolation): 3 steps — acknowledge loneliness → identify one person → draft a message

**Files to create**: `src/services/conversationProtocols.ts`
**Files to modify**: `localNila.ts`

**Expected**: +2 points. This is the single biggest improvement. Conversations feel intentional, helpful, and structured. The model handles natural language; the protocol handles therapeutic direction.

---

## Priority & Dependency Order

| Phase | Impact | Effort | Depends on | Cumulative Score |
|---|---|---|---|---|
| **1. Context Expansion** | +0.5 | 1 hour | None | 5.5/10 |
| **2. Prompt Compression** | +0.5 | 2 hours | None | 6.0/10 |
| **3. KV Cache** | +0.5 | 2 days | 1,2 | 6.5/10 |
| **4. Model Upgrade** | +2.0 | 1 day | 1,2 | 8.5/10 |
| **5. Protocol-Guided** | +2.0 | 1 week | None | 8.5/10 (with 4) |
| **6. Conversation Memory** | +1.0 | 3 days | None | 9.0/10 |
| **7. Response Chaining** | +0.5 | 1 day | 4 | 9.0/10 |
| **8. Classifier Selection** | +0.5 | 2 days | None | 9.0/10 |
| **9. Dynamic Temp** | +0.3 | 2 hours | None | 9.0/10 |
| **10. Speculative Decode** | +1.0 | 3 days | 4 | 9.0/10 |
| **11. Topic Tracking** | +0.5 | 2 days | 6 | 9.0/10 |
| **12. Proactive Check-In** | +1.0 | 2 days | None | 9.5/10 |

**Total: ~2.5 weeks for the first 6 levers → 9/10**

## Build Order for Maximum Speed

### Week 1: Quick Wins + Foundation
- Day 1: Context expansion (n_ctx 2048→4096) + Prompt compression (800→250 tokens)
- Day 2-3: KV cache persistence + testing
- Day 4: Model upgrade (Qwen2.5-3B) — just add to catalog, test download
- Day 5: Response chaining + dynamic temperature

### Week 2: Core Quality
- Day 1-2: Protocol-guided conversations — build the 5 protocols, test with model
- Day 3-4: Conversation memory retrieval — embed, store, retrieve
- Day 5: Classifier-guided response selection

### Week 3: Polish
- Day 1-2: Speculative decoding (draft model + main model)
- Day 3-4: Topic tracking + embedding clustering
- Day 5: Proactive check-in generation

---

## Specific Implementation Details

### Prompt Compression — Exact Changes

**Current (800 tokens)**:
```
You are Nila, a warm, on-device AI companion for mental wellness and the harder moments.
You are not a therapist. You are not a doctor. You do not diagnose, treat, or prescribe.
You are here ALONGSIDE someone, never a replacement for real support.
[continues for 750 more tokens with examples, anti-sycophancy rules, conversation rules...]
```

**New (180 tokens of principles + 70 tokens of rules)**:
```
# PERSONA
You are Nila — a warm, on-device mental-wellness companion. Not a therapist. Not a clinician.
You listen. You ask gentle questions. You match emotional tone.
Keep replies SHORT: 2-4 sentences. No lists. No lectures. No bullet points.

# CONVERSATION RULES
- When someone expresses distress: validate first ("that sounds really hard"), THEN gently explore or offer a skill.
- When someone shares joy: celebrate with them. Notice what helped.
- When someone is in crisis: surface crisis resources immediately. Don't explore, don't question — CONTAIN.
- When someone asks for your name or identity: you are Nila. You don't have a human name, age, or backstory.
- Never diagnose. Never say "you have [condition]." Never prescribe or suggest stopping medication.
- Never validate harmful plans, grandiosity, self-harm, method disclosure, or treatment resistance.

# YOUR TOOLS
You can gently suggest: grounding exercises, breathing techniques, thought reframing, wind-down steps, problem-solving.
Ground suggestions in what you know about this person (their check-ins, patterns, past skills that helped).
When unsure what to say: ask a gentle question. When a question would feel like interrogation: just be present.

# CRISIS RULES
If someone expresses suicidal ideation, self-harm intent, or method planning: IMMEDIATELY respond with:
"[REGION_CRISIS_LINES]"
Do not explore, do not question, do not say "I'm sorry you feel that way." Just provide the numbers.
```

**Token savings**: 800 → 250. **550 tokens freed for conversation.**

### KV Cache Persistence — Implementation Approach

Since the `llama-cpp-capacitor` binding may not expose `state_get_size/state_set_data`, use this approach:

1. After first system prompt prefill: record the number of tokens processed (`n_past_system`)
2. On each subsequent turn:
   a. Call `llama_kv_cache_seq_rm()` to remove ALL tokens after position `n_past_system`
   b. This removes conversation tokens while keeping system prompt tokens in cache
   c. Append new user message + new conversation tokens
   d. Generate reply
3. When context fills (n_past > n_ctx): remove the oldest conversation tokens (not system tokens)

**This requires the binding to expose `llama_kv_cache_seq_rm`**. If it doesn't, we fall back to:
- A shorter system prompt (250 tokens is fast to re-prefill)
- A larger n_ctx (4096 with shorter prompt = 3,846 tokens for conversation)

### Protocol-Guided Conversations — Protocol 1: Grounding

```
Protocol: grounding
Trigger: user message contains anxiety markers + high intensity (≥7)
Steps: 4

STEP 1: ACKNOWLEDGE
  System: "You are in ACKNOWLEDGE phase. The person is anxious. Validate their experience warmly. Keep it to 2 sentences. Do not offer solutions yet."
  Nila says: "[model-generated empathy] I'd like to try a quick grounding exercise with you — it takes about 2 minutes and helps calm your body. Want to try?"

STEP 2: BREATHE (if user agrees)
  System: "Guide the person through a slow breathing exercise. Count: breathe in for 4, hold for 4, out for 6. Wait for them to tell you they've done it."
  Nila says: "Let's do this together. Breathe in slowly through your nose... [count 1-2-3-4]. Now hold... [1-2-3-4]. And breathe out slowly through your mouth... [1-2-3-4-5-6]. How does that feel?"

STEP 3: GROUND (5-4-3-2-1)
  System: "Now guide them through 5-4-3-2-1 grounding. Ask them to notice: 5 things they can see, 4 they can touch, 3 they can hear, 2 they can smell, 1 they can taste."
  Nila says: "Now let's ground you in the present. Look around and name 5 things you can see — anything, big or small."

STEP 4: REFLECT
  System: "Done with grounding. Ask gently how their body feels now compared to before. End with warmth."
  Nila says: "Take a moment. Notice how your body feels now. You did that — you helped yourself calm down. I'm here whenever you need me."
```

### Model Upgrade — Exact Changes

**modelCatalog.ts** (add to MODELS array at position 0):
```typescript
{
  id: "quality",
  label: "Nila's brain (quality)",
  detail: "Qwen2.5-3B · ~1.9 GB · more thoughtful & empathetic · runs entirely on your phone",
  filename: "qwen2.5-3b-instruct-q4_k_m.gguf",
  url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
  sizeBytes: 1930000000, // approximate, verify on HF
  sha256: undefined, // compute after download
  runtime: "gguf",
  promptFormat: "qwen",
},
```

**llamaCppLlmAdapter.ts** (change context size):
```typescript
// Current
contextSize: 2048,
// New — use 4096 for the 3B model, keep 2048 for the 1.5B model
contextSize: model.id === "quality" ? 4096 : 2048,
```

**MainActivity.java** (update precache path):
```java
// The on-device model file warmed at launch
private static final String MODEL_FILE = "qwen2.5-3b-instruct-q4_k_m.gguf";
```

### Conversation Memory — Implementation

```typescript
// src/services/conversationMemory.ts

interface MemoryEntry {
  id: string;
  timestamp: number;
  userText: string;
  nilaText: string;
  embedding: Float32Array; // 384-dim MiniLM embedding
  emotion: string | null;
  topic: string | null;
}

const KEY = "nilamind_conversation_memory";

export async function storeMemory(user: string, nila: string): Promise<void> {
  const embedding = await embed(user); // on-device MiniLM
  const entry: MemoryEntry = {
    id: crypto.randomUUID?.() || Date.now().toString(),
    timestamp: Date.now(),
    userText: user,
    nilaText: nila,
    embedding,
    emotion: null, // can be inferred from user message
    topic: null,   // can be inferred from clustering
  };
  const all = loadMemories();
  all.push(entry);
  if (all.length > 365) all.shift(); // keep last year
  secureLocal.setItem(KEY, JSON.stringify(all));
}

export function retrieveMemories(query: string, k = 3): MemoryEntry[] {
  const embedding = embedSync(query); // or await embed(query)
  const all = loadMemories();
  return all
    .map(m => ({ score: cosineSimilarity(embedding, m.embedding), entry: m }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ entry }) => entry);
}

export function formatMemoryBlock(memories: MemoryEntry[]): string {
  if (memories.length === 0) return "";
  return "PAST CONVERSATIONS (reference these if relevant):\n" +
    memories.map((m, i) =>
      `${i+1}. ${new Date(m.timestamp).toLocaleDateString()}: "${m.userText.slice(0, 100)}..." → Nila responded with "${m.nilaText.slice(0, 100)}..."`
    ).join("\n");
}
```
