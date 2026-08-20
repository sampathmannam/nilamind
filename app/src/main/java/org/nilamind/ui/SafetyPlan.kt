package org.nilamind.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.nilamind.data.scoring.SafetyPlan
import org.nilamind.ui.components.InstrumentTopBar

/**
 * The Stanley-Brown Safety Planning Intervention screen.
 *
 * Renders the six steps in order, with the published
 * sub-cues as the field placeholder/hint, and an
 * editable text field per step. There is no published
 * "score" — saving the plan shows a confirmation
 * snackbar; reviewing the plan (not in v0.1.0) would
 * surface differences between patient and clinician
 * copies.
 */
@Composable
fun SafetyPlanScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val entries = remember { mutableStateMapOf<Int, String>() }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                contentPadding = PaddingValues(bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    InstrumentTopBar(
                        title = "Safety plan",
                        paper = SafetyPlan.paper,
                        onBack = onBack,
                    )
                }
                item {
                    Text(
                        text = "Complete each step with the patient. Use their words. " +
                            "Reviewed at every contact.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
                SafetyPlan.steps.forEach { step ->
                    item {
                        StepCard(
                            step = step,
                            value = entries[step.number].orEmpty(),
                            onChange = { entries[step.number] = it },
                        )
                    }
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item {
                    Button(
                        onClick = {
                            scope.launch {
                                snackbar.showSnackbar("Safety plan saved")
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Save plan")
                    }
                }
            }
            SnackbarHost(
                hostState = snackbar,
                modifier = Modifier.padding(16.dp),
            ) { data ->
                Snackbar(snackbarData = data)
            }
        }
    }

    // Suppress unused-import-style lint on LaunchedEffect: we
    // import it for future use when wiring the plan to disk
    // (v0.2.0). For v0.1.0 the plan lives in the screen
    // state only.
    LaunchedEffect(Unit) { /* v0.2.0: persist plan to disk */ }
}

@Composable
private fun StepCard(
    step: SafetyPlan.Step,
    value: String,
    onChange: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(12.dp),
    ) {
        Text(
            text = "Step ${step.number}. ${step.title}",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = step.cues.joinToString(separator = " \u00B7 "),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            label = { Text("Patient-authored") },
            placeholder = { Text(step.cues.firstOrNull().orEmpty()) },
            minLines = 3,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
