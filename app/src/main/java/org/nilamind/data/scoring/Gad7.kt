package org.nilamind.data.scoring

import org.nilamind.data.papers.Papers

/**
 * GAD-7 — Generalized Anxiety Disorder 7-item scale.
 *
 * Reference: Spitzer RL, Kroenke K, Williams JBW, Lowe B.
 * 2006. "A brief measure for assessing generalized anxiety
 * disorder: the GAD-7." Arch Intern Med 166(10):1092-1097.
 * doi:10.1001/archinte.166.10.1092
 *
 * The seven items below are the verbatim GAD-7 items, in
 * canonical order, with the same 0-3 response scale as
 * PHQ-9. The published cutoffs (0-4 minimal, 5-9 mild,
 * 10-14 moderate, 15-21 severe) are the standard triage
 * bands; a score of 10 or higher is the published
 * threshold that warrants further evaluation.
 */
object Gad7 {

    val paper = Papers.GAD7

    enum class Response(val label: String, val value: Int) {
        NOT_AT_ALL("Not at all", 0),
        SEVERAL_DAYS("Several days", 1),
        MORE_THAN_HALF_THE_DAYS("More than half the days", 2),
        NEARLY_EVERY_DAY("Nearly every day", 3),
    }

    /**
     * "Over the last 2 weeks, how often have you been
     * bothered by the following problems?"
     */
    val items: List<String> = listOf(
        "Feeling nervous, anxious, or on edge",
        "Not being able to stop or control worrying",
        "Worrying too much about different things",
        "Trouble relaxing",
        "Being so restless that it is hard to sit still",
        "Becoming easily annoyed or irritable",
        "Feeling afraid as if something awful might happen",
    )

    data class Result(
        val total: Int,
        val band: Band,
        val warrantsEvaluation: Boolean,
    )

    enum class Band(val label: String, val lo: Int, val hi: Int) {
        MINIMAL("Minimal anxiety", 0, 4),
        MILD("Mild anxiety", 5, 9),
        MODERATE("Moderate anxiety", 10, 14),
        SEVERE("Severe anxiety", 15, 21),
        ;

        companion object {
            fun of(score: Int): Band = entries.first { score in it.lo..it.hi }
        }
    }

    fun score(responses: List<Response>): Result {
        require(responses.size == items.size) {
            "GAD-7 needs ${items.size} responses, got ${responses.size}"
        }
        val total = responses.sumOf { it.value }
        return Result(
            total = total,
            band = Band.of(total),
            // The 10-point cutoff is the published
            // "warrants further evaluation" threshold
            // from Spitzer et al. 2006.
            warrantsEvaluation = total >= 10,
        )
    }
}
