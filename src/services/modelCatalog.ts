// The on-device model a user can download IN-APP on first run (no adb side-load).
// IMPORTANT: `filename` MUST match the runtime adapter's DEFAULT_MODEL_PATH name, so a downloaded
// file is found + loaded with no extra wiring. Hosted on a PUBLIC HuggingFace repo (no auth).
//
// The primary model is Qwen2.5-1.5B (2026-07-11 speed swap), which has better instruction following
// and architectural efficiency (GQA, better llama.cpp support) than the older Gemma-3-1B.
// The Gemma entry is preserved below (commented) as a one-line revert for the old speed A/B.
export type ModelRuntime = "task" | "gguf";
export type PromptFormat = "gemma" | "qwen";

export interface CatalogModel {
  id: string;
  label: string; // shown on the setup card
  detail: string; // one-line description
  filename: string; // saved name in the app's external files dir
  url: string; // public HuggingFace resolve URL
  // EXACT byte length of the file at `url`. The integrity check requires an exact match, so a
  // truncated transfer or an HTML/401 error-body is never mistaken for a complete model.
  sizeBytes: number;
  // OPTIONAL expected lowercase 64-hex SHA-256 of the file at `url`. When set to a real hex digest,
  // modelDownload verifies it before installing (defends a same-SIZE poisoned GGUF that would pass the
  // byte-length + magic checks). The literal placeholder "TODO_SHA256" is a NO-OP — the check is skipped
  // until a real hash is filled in, so shipping without the hash never blocks a legitimate download.
  sha256?: string;
  runtime: ModelRuntime;
  promptFormat: PromptFormat; // which prompt template builder to use
}

export const MODELS: CatalogModel[] = [
  {
    id: "fast",
    label: "Nila's brain (fast)",
    detail: "Qwen2.5-1.5B · ~1.1 GB · fast & capable · runs entirely on your phone",
    filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    sizeBytes: 1117320736,
    // SHA-256 from HF LFS pointer (2026-07-11): model Qwen/Qwen2.5-1.5B-Instruct-GGUF
    sha256: "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e",
    runtime: "gguf",
    promptFormat: "qwen",
  },
  // --- Old Gemma-3-1B (revert: uncomment and move above "fast" to restore the previous brain) ------------
  // {
  //   id: "gemma-1b",
  //   label: "Nila's brain (fast)",
  //   detail: "Gemma-3-1B · ~806 MB · much faster load + replies · runs entirely on your phone",
  //   filename: "gemma-3-1b-it-Q4_K_M.gguf",
  //   url: "https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf",
  //   sizeBytes: 806058272,
  //   sha256: "8270790f3ab69fdfe860b7b64008d9a19986d8df7e407bb018184caa08798ebd",
  //   runtime: "gguf",
  //   promptFormat: "gemma",
  // },
  // --- Original fine-tuned 4B specialist (revert: move this above the 1B to restore) --------------------
  // {
  //   id: "best-4b",
  //   label: "Nila's brain",
  //   detail: "NilaMind 4B · the full fine-tuned model · runs entirely on your phone",
  //   filename: "v2-4b-Q4_K_M.gguf",
  //   url: "https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF/resolve/main/v2-4b-Q4_K_M.gguf",
  //   sizeBytes: 2489894016,
  //   sha256: "338e11713fdf23c3b507de2b922fefb772557eb54efffea2e25ab9dd28e86fcf",
  //   runtime: "gguf",
  //   promptFormat: "gemma",
  // },
];

/** Human-readable size for the UI (e.g. "2.5 GB"). */
export function formatSize(bytes: number): string {
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
}
