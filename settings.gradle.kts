// Settings for the nilamind launcher.
//
// nilamind is a mental-health professional launcher. Every
// feature is backed by a published research paper. The
// launcher is intentionally lean: one Kotlin/Compose
// module, no native build, no vendored engines.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "nilamind"
include(":app")
