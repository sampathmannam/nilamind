// JNI bridge between Capacitor plugin and upstream llama.cpp (Vulkan GPU)
// Built against llama.cpp b9894 API
#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>

#include "llama.h"
#include "ggml.h"

#define LOG_TAG "LlamaGpu"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static struct llama_model *g_model = nullptr;
static struct llama_context *g_ctx = nullptr;
static const struct llama_vocab *g_vocab = nullptr;
static bool g_ready = false;

extern "C" {

JNIEXPORT jint JNICALL
Java_com_nilamind_app_llamagpu_LlamaGpuPlugin_nativeInit(
    JNIEnv *env, jobject thiz, jstring modelPath, jint nCtx, jint nThreads, jint nGpuLayers) {
    
    const char *path = env->GetStringUTFChars(modelPath, nullptr);
    LOGI("Loading model: %s (ctx=%d, threads=%d, gpu_layers=%d)", path, nCtx, nThreads, nGpuLayers);

    llama_backend_init();

    auto model_params = llama_model_default_params();
    model_params.n_gpu_layers = nGpuLayers;
    
    g_model = llama_model_load_from_file(path, model_params);
    env->ReleaseStringUTFChars(modelPath, path);
    
    if (!g_model) {
        LOGE("Failed to load model");
        return -1;
    }

    g_vocab = llama_model_get_vocab(g_model);

    auto ctx_params = llama_context_default_params();
    ctx_params.n_ctx = nCtx;
    ctx_params.n_threads = nThreads;
    ctx_params.n_threads_batch = nThreads;
    
    g_ctx = llama_init_from_model(g_model, ctx_params);
    if (!g_ctx) {
        LOGE("Failed to create context");
        llama_model_free(g_model);
        g_model = nullptr;
        return -2;
    }

    g_ready = true;
    LOGI("Model loaded (Vulkan GPU layers: %d)", nGpuLayers);
    return 0;
}

JNIEXPORT jstring JNICALL
Java_com_nilamind_app_llamagpu_LlamaGpuPlugin_nativeCompletion(
    JNIEnv *env, jobject thiz, jstring prompt, jint nPredict, jfloat temperature,
    jint topK, jfloat topP, jobjectArray stopSequences) {
    
    if (!g_ctx || !g_model || !g_vocab) {
        return env->NewStringUTF("");
    }

    const char *promptStr = env->GetStringUTFChars(prompt, nullptr);
    std::string promptCpp(promptStr);
    env->ReleaseStringUTFChars(prompt, promptStr);

    // Tokenize
    std::vector<llama_token> tokens(promptCpp.size() + 1);
    int n_tokens = llama_tokenize(
        g_vocab, promptCpp.c_str(), (int)promptCpp.size(),
        tokens.data(), (int)tokens.size(),
        true, true
    );

    if (n_tokens < 0) {
        LOGE("Tokenization failed: %d", n_tokens);
        return env->NewStringUTF("");
    }

    // Create batch using llama_batch_get_one
    llama_batch batch = llama_batch_get_one(tokens.data(), n_tokens);

    // Decode prompt
    int rc = llama_decode(g_ctx, batch);
    if (rc != 0) {
        LOGE("llama_decode failed: %d", rc);
        llama_batch_free(batch);
        return env->NewStringUTF("");
    }

    // Get stop sequences
    int nStop = env->GetArrayLength(stopSequences);
    std::vector<std::string> stops;
    for (int i = 0; i < nStop; i++) {
        jstring jstop = (jstring) env->GetObjectArrayElement(stopSequences, i);
        const char *stopC = env->GetStringUTFChars(jstop, nullptr);
        stops.push_back(stopC);
        env->ReleaseStringUTFChars(jstop, stopC);
    }

    // Initialize sampler chain
    auto sparams = llama_sampler_chain_default_params();
    llama_sampler *sampler = llama_sampler_chain_init(sparams);
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(temperature));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(topK));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(topP, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(0));

    // Generate tokens one at a time
    std::string result;
    for (int i = 0; i < nPredict; i++) {
        llama_token new_token = llama_sampler_sample(sampler, g_ctx, -1);
        
        if (llama_vocab_is_eog(g_vocab, new_token)) break;

        char buf[256];
        int n = llama_token_to_piece(g_vocab, new_token, buf, sizeof(buf), 0, true);
        if (n > 0) {
            result.append(buf, n);
            
            // Check stop sequences
            for (const auto &s : stops) {
                if ((int)result.size() >= (int)s.size() && 
                    result.compare(result.size() - s.size(), s.size(), s) == 0) {
                    result.erase(result.size() - s.size());
                    goto done;
                }
            }
        }
    }

done:
    llama_sampler_free(sampler);
    llama_batch_free(batch);

    return env->NewStringUTF(result.c_str());
}

JNIEXPORT jintArray JNICALL
Java_com_nilamind_app_llamagpu_LlamaGpuPlugin_nativeTokenize(
    JNIEnv *env, jobject thiz, jstring text) {
    
    if (!g_model || !g_vocab) return nullptr;

    const char *textStr = env->GetStringUTFChars(text, nullptr);
    std::string textCpp(textStr);
    env->ReleaseStringUTFChars(text, textStr);

    std::vector<llama_token> tokens(textCpp.size() + 1);
    int n_tokens = llama_tokenize(
        g_vocab, textCpp.c_str(), (int)textCpp.size(),
        tokens.data(), (int)tokens.size(),
        false, true
    );

    jintArray result = env->NewIntArray(n_tokens);
    env->SetIntArrayRegion(result, 0, n_tokens, (const jint *)tokens.data());
    return result;
}

JNIEXPORT jboolean JNICALL
Java_com_nilamind_app_llamagpu_LlamaGpuPlugin_nativeIsReady(
    JNIEnv *env, jobject thiz) {
    return g_ready ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_com_nilamind_app_llamagpu_LlamaGpuPlugin_nativeUnload(
    JNIEnv *env, jobject thiz) {
    if (g_ctx) {
        llama_free(g_ctx);
        g_ctx = nullptr;
    }
    if (g_model) {
        llama_model_free(g_model);
        g_model = nullptr;
    }
    g_vocab = nullptr;
    g_ready = false;
    llama_backend_free();
    LOGI("Model unloaded");
}

} // extern "C"
