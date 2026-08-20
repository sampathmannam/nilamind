package org.nilamind.data.scoring

import org.nilamind.data.papers.Papers

/**
 * PHQ-9 — Patient Health Questionnaire-9.
 *
 * Reference: Spitzer RL, Kroenke K, Williams JBW. 1999.
 * "Validation and utility of a self-report version of
 * PRIME-MD: the PHQ primary care study." J Gen Intern Med
 * 14(9):606-613. doi:10.1046/j.1525-1497.1999.01249.x
 *
 * The 9 items below are the verbatim DSM-IV criteria for
 * major depressive episode, phrased as the patient-report
 * items Spitzer et al. validated. The response options
 * and the scoring bands (0-4 minimal, 5-9 mild, 10-14
 * moderate, 15-19 moderately severe, 20-27 severe) are
 * the published cutoffs. There is no "we tweaked the
 * wording" — a clinician who is used to the original
 * paper reads the same items in the same order.
 *
 * The 9th item is the suicide-ideation probe. In the
 * published protocol, a non-zero response on item 9
 * triggers further assessment; this is the only item
 * where the score is interpreted qualitatively rather
 * than as part of the running total. The app surfaces
 * this as a non-zero [result.suicideIdeationFlag]
 * regardless of the chosen option.
 */
object Phq9 {

    val paper = Papers.PHQ9

    enum class Response(val label: String, val value: Int) {
        NOT_AT_ALL("Not at all", 0),
        SEVERAL_DAYS("Several days", 1),
        MORE_THAN_HALF_THE_DAYS("More than half the days", 2),
        NEARLY_EVERY_DAY("Nearly every day", 3),
    }

    /**
     * The nine PHQ-9 items in their canonical order.
     * "Over the last 2 weeks, how often have you been
     * bothered by any of the following problems?"
     */
    val items: List<String> = listOf(
        "Little interest or pleasure in doing things",
        "Feeling down, depressed, or hopeless",
        "Trouble falling or staying asleep, or sleeping too much",
        "Feeling tired or having little energy",
        "Poor appetite or overeating",
        "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
        "Trouble concentrating on things, such as reading the newspaper or watching television",
        "Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual",
        "Thoughts that you would be better off dead, or of hurting yourself in some way",
    )

    /**
     * Score and the resulting severity band for a fully
     * completed PHQ-9. [responses] must have exactly nine
     * entries (one per item, in order). The 9th response
     * also drives the [suicideIdeationFlag].
     */
    data class Result(
        val total: Int,
        val band: Band,
        val suicideIdeationFlag: Boolean,
    )

    enum class Band(val label: String, val lo: Int, val hi: Int) {
        MINIMAL("Minimal depression", 0, 4),
        MILD("Mild depression", 5, 9),
        MODERATE("Moderate depression", 10, 14),
        MODERATELY_SEVERE("Moderately severe depression", 15, 19),
        SEVERE("Severe depression", 20, 27),
        ;

        companion object {
            fun of(score: Int): Band = entries.first { score in it.lo..it.hi }
        }
    }

    fun score(responses: List<Response>): Result {
        require(responses.size == items.size) {
            "PHQ-9 needs ${items.size} responses, got ${responses.size}"
        }
        val total = responses.sumOf { it.value }
        return Result(
            total = total,
            band = Band.of(total),
            suicideIdeationFlag = responses.last().value > Response.NOT_AT_ALL.value,
        )
    }
}
