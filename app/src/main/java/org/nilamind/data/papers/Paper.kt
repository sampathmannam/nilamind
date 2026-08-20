package org.nilamind.data.papers

/**
 * A published research paper that backs a clinical instrument
 * in nilamind.
 *
 * Every instrument in the app is a faithful implementation of
 * one paper: verbatim items, verbatim response options,
 * verbatim scoring bands, and the original citation visible
 * on the instrument screen. There is no proprietary scoring,
 * no inferred cutoffs, no "we tweaked the wording".
 *
 * The [id] is a short slug used in deep links, log lines, and
 * the `!` bang-command parser (e.g. `!phq9`).
 */
data class Paper(
    val id: String,
    val authors: String,
    val year: Int,
    val title: String,
    val journal: String,
    val volume: String? = null,
    val pages: String? = null,
    val doi: String? = null,
) {
    /**
     * Short citation in the format used on every instrument
     * header:
     *
     *   Spitzer RL, Kroenke K, Williams JBW. 1999. PHQ-9.
     *     J Gen Intern Med 14(9):606-613.
     */
    fun shortCite(): String = buildString {
        append(authors)
        append(". ")
        append(year)
        append(". ")
        append(title)
        append(". ")
        append(journal)
        if (volume != null) {
            if (pages != null) {
                append(" ")
                append(volume)
                append(":")
                append(pages)
            } else {
                append(" ")
                append(volume)
            }
        } else if (pages != null) {
            append(" ")
        }
        if (doi != null) {
            append(". doi:")
            append(doi)
        }
    }
}
