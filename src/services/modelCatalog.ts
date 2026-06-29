// The on-device model a user can download IN-APP on first run (no adb side-load).
// IMPORTANT: `filename` MUST match the runtime adapter's DEFAULT_MODEL_PATH name, so a downloaded
// file is found + loaded with no extra wiring. Hosted on a PUBLIC HuggingFace repo (no auth).
//
// We ship ONLY the fine-tuned 4B specialist — it's the quality brain NilaMind is built around. (An
// earlier "Fast" 1B entry pointed at a GATED repo that 401s, so its "download" wrote a 137-byte error
// page to disk as the model; it's removed rather than shipped broken. A vetted PUBLIC small model can
// be added back here later — but only with an exact `sizeBytes` so the integrity check can verify it.)
export type ModelRuntime = "task" | "gguf";

export interface CatalogModel {
  id: string;
  label: string; // shown on the setup card
  detail: string; // one-line description
  filename: string; // saved name in the app's external files dir
  url: string; // public HuggingFace resolve URL
  // EXACT byte length of the file at `url`. The integrity check requires an exact match, so a
  // truncated transfer or an HTML/401 error-body is never mistaken for a complete model.
  sizeBytes: number;
  runtime: ModelRuntime;
}

export const MODELS: CatalogModel[] = [
  {
    id: "best-4b",
    label: "Nila's brain",
    detail: "NilaMind 4B · the full fine-tuned model · runs entirely on your phone",
    filename: "v2-4b-Q4_K_M.gguf",
    url: "https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF/resolve/main/v2-4b-Q4_K_M.gguf",
    sizeBytes: 2489894016,
    runtime: "gguf",
  },
];

/** Human-readable size for the UI (e.g. "2.5 GB"). */
export function formatSize(bytes: number): string {
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
}
