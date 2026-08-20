// Root build file.
//
// The project is intentionally small: a single :app module
// that holds the launcher. No native code, no NDK, no
// vendored engines, no detekt baseline. Everything in the
// project either is a Compose screen, the data behind that
// screen, or the manifest.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.compose.compiler) apply false
}
