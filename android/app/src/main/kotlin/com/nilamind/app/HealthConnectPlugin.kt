package com.nilamind.app

import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

/**
 * Minimal Health Connect Capacitor plugin — read-only sleep seam for NilaMind.
 *
 * Contract fulfilled (matches src/services/healthConnect.ts HealthConnectPlugin interface):
 *   - isAvailable()   -> { available: boolean }
 *   - requestPermissions({ read: string[] }) -> { granted: boolean }
 *   - readSleep({ startISO, endISO }) -> { sessions: Array<{ startTime, endTime }> }
 *
 * Privacy invariant: all reads are on-device; data never leaves the phone.
 *
 * Threading: Capacitor resolves the WebView->native message on the main thread, so the Health
 * Connect suspend call runs on a dedicated background thread (never blocks the UI) and
 * call.resolve/reject post back to the bridge from there.
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private companion object {
        const val TAG = "HCPlugin"
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        try {
            val status = HealthConnectClient.getSdkStatus(context)
            ret.put("available", status == HealthConnectClient.SDK_AVAILABLE)
        } catch (t: Throwable) {
            Log.w(TAG, "isAvailable failed: ${t.message}")
            ret.put("available", false)
        }
        call.resolve(ret)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect not available")
            return
        }

        val perms = mutableSetOf<String>()
        try {
            val readPerms = call.getArray("read")
            if (readPerms != null) {
                for (i in 0 until readPerms.length()) {
                    if (readPerms.getString(i) == "SleepSession") {
                        perms.add(HealthPermission.getReadPermission(SleepSessionRecord::class))
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to parse read permissions: ${t.message}")
        }

        if (perms.isEmpty()) {
            call.reject("No read permissions requested")
            return
        }

        // Capacitor cannot do an activity-result on the plugin thread. Resolve { granted: false } —
        // the TS side re-checks via getSdkStatus + the user grants in Health Connect system settings.
        // The degrade path is [] (no signal, never a crash).
        val ret = JSObject()
        ret.put("granted", false)
        call.resolve(ret)
    }

    @PluginMethod
    fun readSleep(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect not available")
            return
        }

        val startISO = call.getString("startISO")
        val endISO = call.getString("endISO")
        if (startISO == null || endISO == null) {
            call.reject("startISO and endISO required")
            return
        }

        Thread {
            try {
                val startInstant = Instant.parse(startISO)
                val endInstant = Instant.parse(endISO)
                val timeRange = TimeRangeFilter.between(startInstant, endInstant)

                val client = HealthConnectClient.getOrCreate(context)
                val request = ReadRecordsRequest(SleepSessionRecord::class, timeRange)
                val response = runBlocking { client.readRecords(request) }

                val sessions = JSONArray()
                for (rec in response.records) {
                    val s = JSONObject()
                    s.put("startTime", rec.startTime.toString())
                    s.put("endTime", rec.endTime.toString())
                    sessions.put(s)
                }

                val ret = JSObject()
                ret.put("sessions", sessions)
                call.resolve(ret)
            } catch (t: Throwable) {
                Log.w(TAG, "readSleep failed: ${t.message}")
                call.reject("Sleep read failed: ${t.message}")
            }
        }.start()
    }
}
