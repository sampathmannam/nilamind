package org.nilamind.ui

/**
 * The list of screens in nilamind v0.1.0.
 *
 * `Bangs` is a pseudo-screen — typing a `!` command in
 * the bang bar on the Home screen switches to the
 * destination that the command resolves to. It is a
 * destination only in the type sense; the screen UI
 * never shows a "Bangs" header.
 */
enum class Destination(val route: String) {
    Home("home"),
    Phq9("phq9"),
    Gad7("gad7"),
    CsrsScreener("cssrs"),
    SafetyPlan("safety"),
    Research("research"),
    Bangs("bangs"),
}
