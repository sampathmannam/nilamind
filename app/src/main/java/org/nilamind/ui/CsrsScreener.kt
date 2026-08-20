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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.nilamind.data.scoring.CsrsScreener
import org.nilamind.data.scoring.CsrsScreener.Risk
import org.nilamind.ui.components.InstrumentTopBar

/**
 * The C-SSRS screener screen.
 *
 * Six yes/no items. Triage logic is the published
 * decision tree:
 *  - Low: no "yes" on any of the six items
 *  - Moderate: yes on item 1 (wish to be dead) or
 *    item 2 (non-specific active ideation) only
 *  - High: yes on item 3, 4, 5, or 6 (active ideation
 *    with method/intent/plan, or any recent behaviour)
 *
 * A High result surfaces a callout with a direct link
 * to the Stanley-Brown safety plan — that is the
 * published next step.
 */
@Composable
fun CsrsScreenerScreen(
    onBack: () -> Unit,
    onNavigateToSafetyPlan: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Boolean? because each item can be unanswered, yes,
    // or no. The order matches the items list.
    val answers = remember {
        mutableStateListOf<Boolean?>().apply {
            repeat(CsrsScreener.items.size) { add(null) }
        }
    }
    var result by remember { mutableStateOf<CsrsScreener.Result?>(null) }

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
                    title = "C-SSRS screener",
                    paper = CsrsScreener.paper,
                    onBack = onBack,
                )
            }
            item {
                Text(
                    text = "Ask the patient each prompt. Mark Yes or No for every item.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            itemsIndexed(CsrsScreener.items) { index, item ->
                CsrsItem(
                    index = index,
                    item = item,
                    value = answers[index],
                    onSelect = { answers[index] = it },
                )
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                Button(
                    onClick = {
                        if (answers.all { it != null }) {
                            val a = CsrsScreener.Answers(
                                wishToBeDead = answers[0]!!,
                                nonSpecificActiveThoughts = answers[1]!!,
                                activeIdeationWithMethod = answers[2]!!,
                                activeIdeationWithSomeIntent = answers[3]!!,
                                activeIdeationWithSpecificPlanAndIntent = answers[4]!!,
                                recentBehaviour = answers[5]!!,
                            )
                            result = CsrsScreener.score(a)
                        }
                    },
                    enabled = answers.all { it != null } && result == null,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Triage")
                }
            }
            result?.let { r ->
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item { CsrsResultBlock(r) }
                if (r.risk == Risk.HIGH) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    item { HighRiskCallout(onOpenSafetyPlan = onNavigateToSafetyPlan) }
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item {
                    Button(
                        onClick = {
                            answers.indices.forEach { answers[it] = null }
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
private fun CsrsItem(
    index: Int,
    item: CsrsScreener.Item,
    value: Boolean?,
    onSelect: (Boolean) -> Unit,
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
            Column {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = item.prompt,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            YesNo(value = value, isYes = true, onClick = { onSelect(true) })
            YesNo(value = value, isYes = false, onClick = { onSelect(false) })
        }
    }
}

@Composable
private fun YesNo(value: Boolean?, isYes: Boolean, onClick: () -> Unit) {
    val selected = value == isYes
    val label = if (isYes) "Yes" else "No"
    val container = when {
        selected && isYes -> MaterialTheme.colorScheme.error
        selected -> MaterialTheme.colorScheme.primaryContainer
        else -> MaterialTheme.colorScheme.surface
    }
    val onContainer = when {
        selected && isYes -> MaterialTheme.colorScheme.onError
        selected -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .clickable(onClick = onClick)
            .background(container)
            .padding(horizontal = 24.dp, vertical = 8.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = onContainer,
        )
    }
}

@Composable
private fun CsrsResultBlock(r: CsrsScreener.Result) {
    val (bg, fg) = when (r.risk) {
        Risk.LOW -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        Risk.MODERATE -> Color(0xFFE5C07B) to Color(0xFF3D2E0A)
        Risk.HIGH -> MaterialTheme.colorScheme.error to MaterialTheme.colorScheme.onError
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
    ) {
        Text(
            text = "Triage",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(bg)
                .padding(horizontal = 12.dp, vertical = 6.dp),
        ) {
            Text(
                text = r.risk.label,
                style = MaterialTheme.typography.titleLarge,
                color = fg,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        if (r.positiveItems.isNotEmpty()) {
            Text(
                text = "Positive items: ${r.positiveItems.map { it + 1 }.joinToString(", ")}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Posner et al. 2011. C-SSRS. Am J Psychiatry 168(12):1266-1277.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun HighRiskCallout(onOpenSafetyPlan: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.error)
            .padding(16.dp),
    ) {
        Column {
            Text(
                text = "High risk",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onError,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Per the published protocol, initiate the Stanley-Brown " +
                    "Safety Planning Intervention now.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onError,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(onClick = onOpenSafetyPlan) {
                Text("Open safety plan")
            }
        }
    }
}
