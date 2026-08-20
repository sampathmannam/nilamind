package org.nilamind.ui

/**
 * Bang-command parser.
 *
 * nilamind follows the same `!`-prefix command pattern
 * as MindAnchor, but the command set is the clinical
 * instrument set. Typing `!phq9` in the bang bar
 * routes to the PHQ-9 instrument; `!refs` routes to
 * the Research sidebar. Unrecognised commands return
 * null and the bar shows an inline error.
 *
 * The parser is intentionally lenient: leading
 * whitespace is trimmed, case is ignored, and a single
 * command is allowed either as the entire input or
 * followed by free text. The free text is dropped — v0.1.0
 * does not pass arguments to clinical instruments.
 */
object BangCommandParser {

    /**
     * Parse [input] and return the destination it
     * resolves to, or null if the input does not start
     * with `!` or the command is not recognised.
     */
    fun resolve(input: String): Destination? {
        val trimmed = input.trim()
        if (!trimmed.startsWith("!")) return null
        val token = trimmed.substring(1).split(" ", "\t").firstOrNull()?.lowercase()
            ?: return null
        return when (token) {
            "phq9" -> Destination.Phq9
            "gad7" -> Destination.Gad7
            "cssrs", "csrss", "cssrs-screener" -> Destination.CsrsScreener
            "safety", "spi", "stanley-brown" -> Destination.SafetyPlan
            "refs", "research", "papers" -> Destination.Research
            "home" -> Destination.Home
            "help", "?" -> Destination.Home // help is shown on Home in v0.1.0
            else -> null
        }
    }

    /**
     * The list of commands shown in the Home screen's
     * help footer, for the user who hasn't learned the
     * bang grammar yet. Kept short — six commands, the
     * count clinicians can recall without a cheat-sheet.
     */
    val helpSummary: List<String> = listOf(
        "!phq9      PHQ-9 (depression)",
        "!gad7      GAD-7 (anxiety)",
        "!cssrs     C-SSRS screener (suicide risk)",
        "!safety    Stanley-Brown safety plan",
        "!refs      Research citations",
        "!home      Back to home",
    )
}
