package org.nilamind.data.scoring

import org.nilamind.data.papers.Papers

/**
 * Columbia-Suicide Severity Rating Scale — Screener.
 *
 * Reference: Posner K, Brown GK, Stanley B, Brent DA,
 * Yershova KV, Shen S, Mann JJ. 2011. "The Columbia-
 * Suicide Severity Rating Scale: initial validity and
 * internal consistency findings from three multisite
 * studies with adolescents and adults." Am J Psychiatry
 * 168(12):1266-1277. doi:10.1176/appi.ajp.2011.10111704
 *
 * The screener is the brief triage version of the full
 * C-SSRS, used at first contact. The six items below are
 * the verbatim "Ask Questions" prompts from the published
 * screener. The triage logic is the published decision
 * tree:
 *
 *  - Low risk:        no "yes" on any of items 1-5
 *  - Moderate risk:   yes on item 1 (wish to be dead) or
 *                     item 2 (non-specific active suicidal
 *                     thoughts) ONLY
 *  - High risk:       yes on item 3 (active suicidal
 *                     ideation with any method), item 4
 *                     (active ideation with some intent),
 *                     item 5 (active ideation with
 *                     specific plan and intent), or item 6
 *                     (any recent behaviour)
 *
 * The "behaviour" item (6) is the only one that can
 * drive a High-risk result on its own; a recent attempt
 * or preparatory behaviour is High regardless of the
 * ideation answers. The 2011 validation paper documents
 * this as the intended triage structure.
 */
object CsrsScreener {

    val paper = Papers.CSSRS_SCREENER

    data class Answers(
        // Ideation
        val wishToBeDead: Boolean,
        val nonSpecificActiveThoughts: Boolean,
        val activeIdeationWithMethod: Boolean,
        val activeIdeationWithSomeIntent: Boolean,
        val activeIdeationWithSpecificPlanAndIntent: Boolean,
        // Behaviour
        val recentBehaviour: Boolean,
    ) {
        operator fun get(index: Int): Boolean = when (index) {
            0 -> wishToBeDead
            1 -> nonSpecificActiveThoughts
            2 -> activeIdeationWithMethod
            3 -> activeIdeationWithSomeIntent
            4 -> activeIdeationWithSpecificPlanAndIntent
            5 -> recentBehaviour
            else -> error("CsrsScreener: invalid item index $index")
        }
    }

    /**
     * The six screener items, with their published
     * time-frame cue. The first five cover ideation
     * (the "Ask Questions" prompts); the sixth covers
     * behaviour.
     */
    val items: List<Item> = listOf(
        Item(
            "Wish to be dead",
            "Have you wished you were dead or wished you could go to sleep and not wake up?",
            ItemDomain.IDEATION,
        ),
        Item(
            "Non-specific active suicidal thoughts",
            "Have you actually had any thoughts of killing yourself?",
            ItemDomain.IDEATION,
        ),
        Item(
            "Active suicidal ideation with any methods (not plan) without intent to act",
            "Have you been thinking about how you might do this?",
            ItemDomain.IDEATION,
        ),
        Item(
            "Active suicidal ideation with some intent, without specific plan",
            "Have you had these thoughts and had some intention of acting on them?",
            ItemDomain.IDEATION,
        ),
        Item(
            "Active suicidal ideation with specific plan and intent",
            "Have you started to work out, or worked out, the details of how to kill yourself? " +
                "Do you intend to carry out this plan?",
            ItemDomain.IDEATION,
        ),
        Item(
            "Recent suicidal behaviour",
            "In the last 3 months, have you done anything, started to do anything, or prepared to " +
                "do anything to end your life?",
            ItemDomain.BEHAVIOUR,
        ),
    )

    enum class ItemDomain { IDEATION, BEHAVIOUR }

    data class Item(
        val name: String,
        val prompt: String,
        val domain: ItemDomain,
    )

    data class Result(
        val risk: Risk,
        val positiveItems: List<Int>,
    )

    enum class Risk(val label: String) {
        LOW("Low risk"),
        MODERATE("Moderate risk"),
        HIGH("High risk"),
    }

    fun score(answers: Answers): Result {
        val positiveItems = (0 until items.size).filter { answers[it] }
        // High: any of 3, 4, 5 (active ideation with
        // method/intent/plan), or 6 (any recent behaviour)
        val high = positiveItems.any { it in 3..5 } || answers.recentBehaviour
        // Moderate: yes on 1 or 2 only, no high
        val moderate = !high && positiveItems.any { it == 0 || it == 1 }
        val risk = when {
            high -> Risk.HIGH
            moderate -> Risk.MODERATE
            else -> Risk.LOW
        }
        return Result(risk = risk, positiveItems = positiveItems)
    }
}
