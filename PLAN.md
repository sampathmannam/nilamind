# Plan: Write 5 Test Files for NilaMind Services

## Context
The user needs 5 new test files for services that currently lack dedicated unit tests. These tests follow the existing vitest patterns (describe/it/expect, vi.mock for dependencies, beforeEach for cleanup).

## Files to Create

### 1. `src/services/identity.test.ts`
- **Dependencies to mock**: `secureLocal` (in-memory store), `@scure/bip39` (real — runs in node)
- **Tests**:
  - `newMnemonic` returns a 12-word string
  - `isValidMnemonic` returns true for a valid mnemonic, false for invalid
  - `deriveUserId` returns consistent string for same mnemonic
  - `loadIdentity` returns null when empty
  - `saveIdentity`/`loadIdentity` round-trip
- **Pattern**: Mock `secureLocal` with in-memory `Record<string, string>` (like `identity.backup.test.ts`). Use real `@scure/bip39` since it runs in node. Use a known BIP39 test vector mnemonic for determinism.
- **Key consideration**: `deriveUserId` uses `crypto.subtle` (available in node). The mnemonic `legal winner thank year wave sausage worth useful legal winner thank yellow` is a valid BIP39 vector.

### 2. `src/services/localLlm.test.ts`
- **Dependencies to mock**: None (module has no external deps beyond `modelLock` and `cloudLlmAdapter` — both imported but the key functions are pure state accessors)
- **Tests**:
  - `registerLocalLlmBackend`/`getLocalLlmBackend` round-trip
  - `isLocalLlmReady` returns false when no backend
  - `localLlmLoadState` returns "none" initially
  - `localLlmId` returns null when no backend
  - `warmLocalLlm` is a function
- **Pattern**: The module uses module-level `let backend` state. After each test, call `registerLocalLlmBackend(null)` to clean up. Mock the `cloudLlmAdapter` to prevent real cloud init. Mock `modelLock` to avoid native deps.
- **Key consideration**: `isLocalLlmReady` checks `activeBackend()` which first checks `cloudBackend.isReady()`. Must mock `createCloudBackend` to return a non-ready backend so tests exercise the native path.

### 3. `src/services/nila.test.ts`
- **Dependencies to mock**: None for pure functions. `buildNilaSystem` has many deps but we only test the simple exports.
- **Tests**:
  - `NILA_SYSTEM_PROMPT` is a non-empty string
  - `NILA_SYSTEM_PROMPT_SHORT` is non-empty and shorter than full
  - `USE_SHORT_PERSONA` is boolean
  - `partOfDay` returns "morning" for 8, "afternoon" for 14, "evening" for 19, "night" for 23
  - `explainerQuestionSteer` returns a string for a why-question, empty for non-explainer
  - `registerSteer` returns a string for a greeting, empty for normal text
- **Pattern**: Direct imports of pure functions. No mocking needed. The module imports many other modules though — will need to mock them or use `vi.mock` for the heavy deps.
- **Key consideration**: `nila.ts` imports `crisisResources`, `personaConfig`, `skillRetrieval`, `nilaContext`, `asyncReflection`, `distortionSpotter`, `protocolIntegration`, `conversationMemory`, `emotionalIntelligence`, `personalRag`, `ragWarmth`, `psychoed`, `secureLocal`. The pure functions (`partOfDay`, `explainerQuestionSteer`, `registerSteer`) don't use any of these, but the module-level code might execute imports. Use `vi.mock` for the heavy deps to keep tests focused.

### 4. `src/services/nilaMemory.test.ts`
- **Dependencies to mock**: `secureLocal` (storage), `generateOnDevice` (LLM), `checkResponse` (safety gate)
- **Tests**:
  - `loadNilaMemories` returns an array (empty or populated)
  - `recentMemoryLines` returns a string (empty or formatted)
  - `rememberSession` is a function (async, verify it can be called)
- **Pattern**: Mock `secureLocal` with in-memory store. Mock `generateOnDevice` to return a canned note. Mock `checkResponse` to return true. Test the `loadNilaMemories`/`recentMemoryLines` with stored data, test `rememberSession` with a short transcript.
- **Key consideration**: `rememberSession` calls `generateOnDevice` and `checkResponse`. Mock both. Verify that short sessions (< MIN_USER_TURNS) are skipped.

### 5. `src/services/openAiChatStream.test.ts`
- **Dependencies to mock**: `fetch` (global)
- **Tests**:
  - `streamOpenAiChat` is a function that returns a Promise
- **Pattern**: Mock `globalThis.fetch` to return a fake response. Verify the function returns a promise. Since the user only asks for basic checks ("is a function that returns Promise"), we keep it minimal.
- **Key consideration**: The function does real fetch streaming. For the minimal test, mock fetch to resolve with a simple non-streaming response.

## Approach
1. Write all 5 files using the Write tool
2. Follow the established pattern: `import { describe, it, expect, beforeEach, vi } from "vitest"` at the top
3. Use `vi.mock` for external dependencies
4. Use `beforeEach` with `for (const k of Object.keys(store)) delete store[k]` for storage cleanup
5. Each file is self-contained and runnable via `npx vitest run src/services/<name>.test.ts`

## Verification
- Run `npx vitest run src/services/identity.test.ts src/services/localLlm.test.ts src/services/nila.test.ts src/services/nilaMemory.test.ts src/services/openAiChatStream.test.ts` to verify all pass
- Run `npx tsc --noEmit` to ensure no type errors
