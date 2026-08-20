package org.nilamind.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.nilamind.data.papers.Paper
import org.nilamind.data.papers.Papers
import org.nilamind.ui.components.CitationChip

/**
 * The Home screen of nilamind.
 *
 * The home screen has three blocks, top to bottom:
 *  1. A "bang bar" — a single text field. Typing
 *     `!phq9`, `!gad7`, `!cssrs`, `!safety`, or `!refs`
 *     routes to that screen. Other inputs stay on Home
 *     and show the help footer.
 *  2. A 4-tile launcher for the four clinical
 *     instruments: PHQ-9, GAD-7, C-SSRS, Stanley-Brown
 *     safety plan. Each tile is a [Paper] reference plus
 *     a one-line description.
 *  3. A help footer listing the six bang commands.
 *
 * The screen is the only one in the app that does NOT
 * carry an instrument citation at the top — instead, the
 * citation chip sits at the very bottom, captioned
 * "Every instrument in this launcher is from a published
 * study. Tap any tile to read the citation."
 */
@Composable
fun HomeScreen(
    onNavigate: (Destination) -> Unit,
    modifier: Modifier = Modifier,
) {
    var bangInput by remember { mutableStateOf("") }
    var bangError by remember { mutableStateOf<String?>(null) }

    val onSubmitBang: () -> Unit = {
        val dest = BangCommandParser.resolve(bangInput)
        if (dest != null) {
            onNavigate(dest)
            bangInput = ""
            bangError = null
        } else if (bangInput.isNotBlank()) {
            bangError = "Unknown command. Try !phq9, !gad7, !cssrs, !safety, !refs."
        }
    }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Column {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Today",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "nilamind",
                        style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.Medium),
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Mental health professional launcher",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                OutlinedTextField(
                    value = bangInput,
                    onValueChange = {
                        bangInput = it
                        bangError = null
                    },
                    label = { Text("Bang command") },
                    placeholder = { Text("Type !phq9, !gad7, !cssrs, !safety, !refs") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    isError = bangError != null,
                    supportingText = bangError?.let { { Text(it) } },
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    androidx.compose.material3.TextButton(
                        onClick = onSubmitBang,
                        enabled = bangInput.isNotBlank(),
                    ) {
                        Text("Go")
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(4.dp)) }
            item {
                Text(
                    text = "Instruments",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            items(launcherTiles) { tile ->
                InstrumentTile(tile = tile, onClick = { onNavigate(tile.destination) })
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            }
            item {
                Text(
                    text = "Bang commands",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    BangCommandParser.helpSummary.forEach { line ->
                        Text(
                            text = line,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(12.dp),
                ) {
                    Text(
                        text = "Every instrument in this launcher is from a published study. " +
                            "Tap any tile to read the citation.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Start,
                    )
                }
            }
        }
    }
}

private data class LauncherTile(
    val paper: Paper,
    val destination: Destination,
    val shortName: String,
    val blurb: String,
)

private val launcherTiles: List<LauncherTile> = listOf(
    LauncherTile(
        paper = Papers.PHQ9,
        destination = Destination.Phq9,
        shortName = "PHQ-9",
        blurb = "Patient Health Questionnaire-9. 9 items, score 0-27.",
    ),
    LauncherTile(
        paper = Papers.GAD7,
        destination = Destination.Gad7,
        shortName = "GAD-7",
        blurb = "Generalized Anxiety Disorder 7-item. Score 0-21.",
    ),
    LauncherTile(
        paper = Papers.CSSRS_SCREENER,
        destination = Destination.CsrsScreener,
        shortName = "C-SSRS",
        blurb = "Columbia-Suicide Severity Rating Scale. Triage: low / moderate / high.",
    ),
    LauncherTile(
        paper = Papers.STANLEY_BROWN_SPI,
        destination = Destination.SafetyPlan,
        shortName = "Safety plan",
        blurb = "Stanley-Brown SPI. 6-step patient-authored plan.",
    ),
)

@Composable
private fun InstrumentTile(
    tile: LauncherTile,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = tile.shortName,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = tile.paper.year.toString(),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = tile.blurb,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
