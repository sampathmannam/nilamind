import { registerPlugin } from "@capacitor/core";

export interface LlamaGpuInitParams {
  model: string;
  n_ctx?: number;
  n_threads?: number;
  n_gpu_layers?: number;
}

export interface LlamaGpuCompletionParams {
  prompt: string;
  n_predict?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  stop?: string[];
}

export interface LlamaGpuCompletionResult {
  text: string;
  tokens: number;
}

export interface LlamaGpuPlugin {
  init(params: LlamaGpuInitParams): Promise<{ ok: boolean; error?: string }>;
  completion(params: LlamaGpuCompletionParams): Promise<LlamaGpuCompletionResult>;
  tokenize(params: { text: string }): Promise<{ tokens: number[] }>;
  isReady(): Promise<{ ready: boolean }>;
  unload(): Promise<{ ok: boolean }>;
}

const LlamaGpu = registerPlugin<LlamaGpuPlugin>("LlamaGpu");

export default LlamaGpu;
