import { describe, it, expect, vi, beforeEach } from "vitest";

const { MOCK_VEC, mockInference, mockPipeline } = vi.hoisted(() => {
  const MOCK_VEC = [1, 2, 3, 4];
  const mockInference = vi
    .fn()
    .mockResolvedValue({ data: new Float32Array(MOCK_VEC) });
  const mockPipeline = vi.fn().mockResolvedValue(mockInference);
  return { MOCK_VEC, mockInference, mockPipeline };
});

vi.mock("@huggingface/transformers", () => ({
  pipeline: mockPipeline,
  env: {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: "",
    backends: {
      onnx: {
        wasm: { wasmPaths: "", numThreads: 1, proxy: false },
      },
    },
  },
}));

describe("crisisEmbedder", () => {
  beforeEach(() => {
    mockPipeline.mockClear();
    mockInference.mockClear();
    mockPipeline.mockResolvedValue(mockInference);
    mockInference.mockResolvedValue({ data: new Float32Array(MOCK_VEC) });
    vi.resetModules();
  });

  it("lazy loading: pipeline not initialized before first call", async () => {
    const { transformersEmbedder } = await import("./crisisEmbedder");
    expect(mockPipeline).not.toHaveBeenCalled();
    const vec = await transformersEmbedder("hello");
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(mockPipeline).toHaveBeenCalledWith(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "q8", device: "wasm" },
    );
    expect(mockInference).toHaveBeenCalledTimes(1);
    expect(mockInference).toHaveBeenCalledWith("hello", {
      pooling: "mean",
      normalize: true,
    });
    expect(vec).toEqual(MOCK_VEC);
  });

  it("one-entry cache: same text returns cached vector without re-calling inference", async () => {
    const { transformersEmbedder } = await import("./crisisEmbedder");
    const v1 = await transformersEmbedder("hello");
    expect(mockInference).toHaveBeenCalledTimes(1);
    const v2 = await transformersEmbedder("hello");
    expect(mockInference).toHaveBeenCalledTimes(1);
    expect(v2).toEqual(v1);
  });

  it("different text triggers a fresh inference call", async () => {
    const { transformersEmbedder } = await import("./crisisEmbedder");
    await transformersEmbedder("hello");
    await transformersEmbedder("world");
    expect(mockInference).toHaveBeenCalledTimes(2);
    expect(mockInference).toHaveBeenNthCalledWith(1, "hello", {
      pooling: "mean",
      normalize: true,
    });
    expect(mockInference).toHaveBeenNthCalledWith(2, "world", {
      pooling: "mean",
      normalize: true,
    });
  });

  it("warmCrisisEmbedder resolves on a healthy pipeline", async () => {
    const { warmCrisisEmbedder } = await import("./crisisEmbedder");
    await expect(warmCrisisEmbedder()).resolves.toBeUndefined();
  });

  it("warmCrisisEmbedder handles inference errors gracefully", async () => {
    const { transformersEmbedder, warmCrisisEmbedder } =
      await import("./crisisEmbedder");
    await transformersEmbedder("bust");
    mockInference.mockRejectedValueOnce(new Error("inference failed"));
    await expect(warmCrisisEmbedder()).resolves.toBeUndefined();
  });

  it("warmCrisisEmbedder handles load errors gracefully", async () => {
    mockPipeline.mockRejectedValue(new Error("model not found"));
    const { warmCrisisEmbedder } = await import("./crisisEmbedder");
    await expect(warmCrisisEmbedder()).resolves.toBeUndefined();
  });

  it("exports both transformersEmbedder and warmCrisisEmbedder", async () => {
    const mod = await import("./crisisEmbedder");
    expect(mod.transformersEmbedder).toBeInstanceOf(Function);
    expect(mod.warmCrisisEmbedder).toBeInstanceOf(Function);
  });
});
