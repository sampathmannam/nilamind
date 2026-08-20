package org.nilamind.data.scoring

import org.nilamind.data.papers.Papers

/**
 * Stanley-Brown Safety Planning Intervention (SPI).
 *
 * Reference: Stanley B, Brown GK. 2012. "Safety planning
 * intervention: a brief intervention to mitigate suicide
 * risk." Cogn Behav Pract 19(2):256-264.
 * doi:10.1016/j.cbpra.2011.01.001
 *
 * The SPI is a 6-step written plan completed with the
 * patient, intended to be short, easy to read under
 * distress, and reviewed at every contact. The six steps
 * below are the published step labels, in order, with the
 * published sub-cues. There is no scoring in the
 * published instrument: the output is the plan itself,
 * patient-authored.
 */
object SafetyPlan {

    val paper = Papers.STANLEY_BROWN_SPI

    data class Step(
        val number: Int,
        val title: String,
        val cues: List<String>,
    )

    val steps: List<Step> = listOf(
        Step(
            number = 1,
            title = "Warning signs",
            cues = listOf(
                "Thoughts, images, mood, situations, behaviours",
                "Signs that the crisis may be starting",
            ),
        ),
        Step(
            number = 2,
            title = "Internal coping strategies",
            cues = listOf(
                "Things I can do alone to take my mind off the crisis",
                "Without contacting another person",
                "Examples: relaxation, distraction, physical activity",
            ),
        ),
        Step(
            number = 3,
            title = "Social distractions — people and settings",
            cues = listOf(
                "People I can be around, and places I can go",
                "To take my mind off the crisis without talking about it",
            ),
        ),
        Step(
            number = 4,
            title = "People I can ask for help",
            cues = listOf(
                "Family members or friends",
                "Who I can ask for help during a crisis",
                "Phone numbers and best times to call",
            ),
        ),
        Step(
            number = 5,
            title = "Professionals and agencies to contact",
            cues = listOf(
                "Clinicians, urgent care, crisis line",
                "iCall 9152987821",
                "Vandrevala 1860-2662-362",
                "AASRA 9820466726",
                "Phone numbers, addresses, walk-in hours",
            ),
        ),
        Step(
            number = 6,
            title = "Making the environment safe",
            cues = listOf(
                "Means restriction",
                "Removing or securing lethal means",
                "Steps the patient agrees to take, and a timeline",
            ),
        ),
    )

    /**
     * A patient-authored plan. The text is keyed by step
     * number (1-6) and stored verbatim — there is no
     * "answer key" in the published instrument, so we
     * store whatever the patient wrote.
     */
    data class Plan(
        val entries: Map<Int, String>,
    ) {
        fun entryFor(step: Int): String = entries[step].orEmpty()
        fun isBlank(): Boolean = entries.values.all { it.isBlank() }
    }

    val emptyPlan: Plan = Plan(entries = emptyMap())

    fun newPlan(): Plan = Plan(
        entries = steps.associate { it.number to "" },
    )
}
