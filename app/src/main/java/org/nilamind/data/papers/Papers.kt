package org.nilamind.data.papers

/**
 * Canonical paper list backing nilamind v0.1.0.
 *
 * The list is exhaustive for v0.1.0: every clinical
 * instrument the app can run has exactly one entry here.
 * Adding an instrument means adding a paper here first;
 * the UI reads from this list and the [Paper] objects
 * drive the header and the Research sidebar.
 */
object Papers {

    val PHQ9 = Paper(
        id = "phq9",
        authors = "Spitzer RL, Kroenke K, Williams JBW",
        year = 1999,
        title = "Validation and utility of a self-report version of PRIME-MD: the PHQ primary care study",
        journal = "J Gen Intern Med",
        volume = "14(9)",
        pages = "606-613",
        doi = "10.1046/j.1525-1497.1999.01249.x",
    )

    val GAD7 = Paper(
        id = "gad7",
        authors = "Spitzer RL, Kroenke K, Williams JBW, Lowe B",
        year = 2006,
        title = "A brief measure for assessing generalized anxiety disorder: the GAD-7",
        journal = "Arch Intern Med",
        volume = "166(10)",
        pages = "1092-1097",
        doi = "10.1001/archinte.166.10.1092",
    )

    val CSSRS_SCREENER = Paper(
        id = "cssrs-screener",
        authors = "Posner K, Brown GK, Stanley B, Brent DA, Yershova KV, Shen S, Mann JJ",
        year = 2011,
        title = "The Columbia-Suicide Severity Rating Scale: initial validity and internal consistency findings from three multisite studies with adolescents and adults",
        journal = "Am J Psychiatry",
        volume = "168(12)",
        pages = "1266-1277",
        doi = "10.1176/appi.ajp.2011.10111704",
    )

    val STANLEY_BROWN_SPI = Paper(
        id = "stanley-brown-spi",
        authors = "Stanley B, Brown GK",
        year = 2012,
        title = "Safety planning intervention: a brief intervention to mitigate suicide risk",
        journal = "Cogn Behav Pract",
        volume = "19(2)",
        pages = "256-264",
        doi = "10.1016/j.cbpra.2011.01.001",
    )

    /** All papers in display order for the Research sidebar. */
    val all: List<Paper> = listOf(
        PHQ9,
        GAD7,
        CSSRS_SCREENER,
        STANLEY_BROWN_SPI,
    )

    fun byId(id: String): Paper? = all.firstOrNull { it.id == id }
}
