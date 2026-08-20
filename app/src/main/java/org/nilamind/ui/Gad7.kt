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
import androidx.compose.ui.unit.dp
import org.nilamind.data.scoring.Gad7
import org.nilamind.ui.components.InstrumentTopBar

/**
 * The GAD-7 instrument screen.
 *
 * Same shape as the PHQ-9 screen: 7 items, 4-point
 * response, score button, result block. The result
 * block adds the published "warrants evaluation" flag
 * (score >= 10) so the clinician can see the cutoff
 * without remembering it.
 */
@Composable
fun Gad7Screen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val responses = remember {
        mutableStateListOf<Gad7.Response?>().apply {
            repeat(Gad7.items.size) { add(null) }
        }
    }
    var result by remember { mutableStateOf<Gad7.Result?>(null) }

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
                    title = "GAD-7",
                    paper = Gad7.paper,
                    onBack = onBack,
                )
            }
            item {
                Text(
                    text = "Over the last 2 weeks, how often have you been bothered " +
                        "by the following problems?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            itemsIndexed(Gad7.items) { index, prompt ->
                Gad7Item(
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
                        if (completed.size == Gad7.items.size) {
                            result = Gad7.score(completed)
                        }
                    },
                    enabled = responses.all { it != null } && result == null,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Score GAD-7")
                }
            }
            result?.let { r ->
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item { Gad7ResultBlock(r) }
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
private fun Gad7Item(
    index: Int,
    prompt: String,
    selected: Gad7.Response?,
    onSelect: (Gad7.Response) -> Unit,
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
        Gad7.Response.entries.forEach { option ->
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
private fun Gad7ResultBlock(r: Gad7.Result) {
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
            text = "${r.total} / 21",
            style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = r.band.label,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        if (r.warrantsEvaluation) {
            Spacer(modifier = Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .padding(12.dp),
            ) {
                Text(
                    text = "Score ≥ 10. The published cutoff for further evaluation.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Spitzer et al. 2006. GAD-7. Arch Intern Med 166(10):1092-1097.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
