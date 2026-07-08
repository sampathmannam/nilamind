# NilaMind ProGuard / R8 rules for release builds.
#
# Capacitor uses reflection + annotations for its plugin bridge and JNI for native calls.
# Without these keep rules, R8 strips plugin methods and the app crashes on launch.

# ── Capacitor core ──
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-dontwarn com.getcapacitor.**

# ── Capacitor plugins ──
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep class com.aparajita.capacitor.** { *; }
-keep class com.capgo.capacitor.** { *; }
-keep class ee.forgr.capacitor.** { *; }
-keep class com.dtied.llama.** { *; }

# ── llama.cpp native bridge (JNI) ──
-keep class com.nilamind.app.** { *; }
-keep class llama_cpp_capacitor.** { *; }

# ── Biometric auth ──
-keep class androidx.biometric.** { *; }

# ── AndroidX + Support libraries ──
-keep class androidx.appcompat.** { *; }
-keep class androidx.core.** { *; }
-dontwarn androidx.**

# ── Kotlin reflection ──
-keep class kotlin.Metadata { *; }
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses

# ── WebView JavaScript bridge ──
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Keep line numbers for crash reports ──
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
