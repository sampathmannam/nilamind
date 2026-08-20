package org.nilamind.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import org.nilamind.data.papers.Paper

/**
 * The small inline citation chip that appears at the top
 * of every instrument screen and at the bottom of the
 * Research sidebar.
 *
 * The chip is the *only* UI surface that mentions a
 * paper's year and journal — the rest of the screen
 * uses the instrument name (PHQ-9, GAD-7, C-SSRS,
 * SPI). The chip exists to make it impossible for a
 * clinician to use the screen without seeing where the
 * instrument came from.
 */
@Composable
fun CitationChip(
    paper: Paper,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = paper.shortCite(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
    Spacer(modifier = Modifier.height(4.dp))
}
