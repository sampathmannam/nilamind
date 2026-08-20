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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.nilamind.data.scoring.Phq9
import org.nilamind.ui.components.InstrumentTopBar

/**
 * The PHQ-9 instrument screen.
 *
 * Renders the 9 items in order, each with the four
 * 0-3 response options as radios, the score button at
 * the bottom (disabled until all 9 answered), and the
 * result block (total, band, item-9 flag).
 */
@Composable
fun Phq9Screen(
    onBack: () -> Unit,
    onNavigateToCsrs: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // mutableStateListOf preserves order and gives us a
    // recomposition trigger per index when we re-assign.
    val responses = remember {
        mutableStateListOf<Phq9.Response?>().apply {
            repeat(Phq9.items.size) { add(null) }
        }
    }
    var result by remember { mutableStateOf<Phq9.Result?>(null) }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                InstrumentTopBar(
                    title = "PHQ-9",
                    paper = Phq9.paper,
                    onBack = onBack,
                )
            }
            item {
                Text(
                    text = "Over the last 2 weeks, how often have you been bothered " +
                        "by any of the following problems?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            itemsIndexed(Phq9.items) { index, prompt ->
                Phq9Item(
                    index = index,
                    prompt = prompt,
                    selected = responses[index],
                    onSelect = { responses[index] = it },
                )
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                Button(
                    onClick = {
                        val completed = responses.filterNotNull()
                        if (completed.size == Phq9.items.size) {
                            result = Phq9.score(completed)
                        }
                    },
                    enabled = responses.all { it != null } && result == null,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Score PHQ-9")
                }
            }
            result?.let { r ->
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item { Phq9ResultBlock(r) }
                if (r.suicideIdeationFlag) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    item {
                        Q9FlagCallout(onRunCsrs = onNavigateToCsrs)
                    }
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item {
                    Button(
                        onClick = {
                            responses.indices.forEach { responses[it] = null }
                            result = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Reset")
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun Phq9Item(
    index: Int,
    prompt: String,
    selected: Phq9.Response?,
    onSelect: (Phq9.Response) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                text = "${index + 1}.",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = prompt,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Phq9.Response.entries.forEach { option ->
            ResponseRow(
                label = option.label,
                value = option.value.toString(),
                selected = selected == option,
                onClick = { onSelect(option) },
            )
        }
    }
}

@Composable
private fun ResponseRow(
    label: String,
    value: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .clickable(onClick = onClick)
            .background(
                if (selected) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surface,
            )
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer
            else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(end = 12.dp),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer
            else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun Phq9ResultBlock(r: Phq9.Result) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
    ) {
        Text(
            text = "Score",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "${r.total} / 27",
            style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = r.band.label,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(modifier = Modifier.height(8.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Spitzer et al. 1999. PHQ-9. J Gen Intern Med 14(9):606-613.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun Q9FlagCallout(onRunCsrs: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.error)
            .padding(16.dp),
    ) {
        Column {
            Text(
                text = "Item 9: positive",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onError,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Any non-zero response on item 9 indicates suicidal ideation. " +
                    "Per the published protocol, this triggers further assessment.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onError,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(onClick = onRunCsrs) {
                Text("Run C-SSRS screener")
            }
        }
    }
}

// Local helper to keep the LazyColumn call-site readable — removed
// (using the standard foundation itemsIndexed extension directly).