package com.nilamind.app.llamagpu

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "LlamaGpu")
class LlamaGpuPlugin : Plugin() {
    private val TAG = "LlamaGpu"

    override fun load() {
        try {
            System.loadLibrary("ggml-base")
            System.loadLibrary("ggml")
            System.loadLibrary("ggml-cpu")
            System.loadLibrary("ggml-vulkan")
            System.loadLibrary("llama")
            Log.i(TAG, "Vulkan llama.cpp libraries loaded")
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "Failed to load llama.cpp libs: ${e.message}")
        }
    }

    @PluginMethod
    fun init(call: PluginCall) {
        val model = call.getString("model") ?: return call.reject("model path required")
        val nCtx = call.getInt("n_ctx", 2048)!!
        val nThreads = call.getInt("n_threads", 6)!!
        val nGpuLayers = call.getInt("n_gpu_layers", 99)!!

        try {
            val result = nativeInit(model, nCtx, nThreads, nGpuLayers)
            val ret = JSObject()
            ret.put("ok", result == 0)
            if (result != 0) ret.put("error", "nativeInit returned $result")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("init failed: ${e.message}")
        }
    }

    @PluginMethod
    fun completion(call: PluginCall) {
        val prompt = call.getString("prompt") ?: return call.reject("prompt required")
        val nPredict = call.getInt("n_predict", 80)!!
        val temperature = call.getDouble("temperature", 0.4)!!
        val topK = call.getInt("top_k", 40)!!
        val topP = call.getDouble("top_p", 0.95)!!
        val stopArr = call.getArray("stop")

        try {
            val stop = stopArr?.let {
                val arr = arrayOfNulls<String>(it.length())
                for (i in 0 until it.length()) arr[i] = it.getString(i)
                arr.filterNotNull().toTypedArray()
            } ?: arrayOf("<end_of_turn>", "<start_of_turn>")

            val result = nativeCompletion(prompt, nPredict, temperature.toFloat(), topK, topP.toFloat(), stop)
            val ret = JSObject()
            ret.put("text", result ?: "")
            ret.put("tokens", 0) // counted internally
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("completion failed: ${e.message}")
        }
    }

    @PluginMethod
    fun tokenize(call: PluginCall) {
        val text = call.getString("text") ?: return call.reject("text required")
        try {
            val tokens = nativeTokenize(text)
            val ret = JSObject()
            val arr = com.getcapacitor.JSArray()
            tokens?.forEach { arr.put(it) }
            ret.put("tokens", arr)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("tokenize failed: ${e.message}")
        }
    }

    @PluginMethod
    fun isReady(call: PluginCall) {
        val ret = JSObject()
        ret.put("ready", nativeIsReady())
        call.resolve(ret)
    }

    @PluginMethod
    fun unload(call: PluginCall) {
        nativeUnload()
        val ret = JSObject()
        ret.put("ok", true)
        call.resolve(ret)
    }

    companion object {
        init {
            // already loaded in load()
        }
    }

    private external fun nativeInit(model: String, nCtx: Int, nThreads: Int, nGpuLayers: Int): Int
    private external fun nativeCompletion(prompt: String, nPredict: Int, temperature: Float, topK: Int, topP: Float, stop: Array<String>): String?
    private external fun nativeTokenize(text: String): IntArray?
    private external fun nativeIsReady(): Boolean
    private external fun nativeUnload()
}
