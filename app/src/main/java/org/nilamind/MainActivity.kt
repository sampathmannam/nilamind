package org.nilamind

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import org.nilamind.ui.CsrsScreenerScreen
import org.nilamind.ui.Destination
import org.nilamind.ui.Gad7Screen
import org.nilamind.ui.HomeScreen
import org.nilamind.ui.Phq9Screen
import org.nilamind.ui.ResearchScreen
import org.nilamind.ui.SafetyPlanScreen
import org.nilamind.ui.theme.NilamindTheme

/**
 * The single Activity that hosts the entire app.
 *
 * Navigation is a small `when` block on a `var current`
 * — Compose state held in the activity. v0.1.0 has six
 * destinations; the if/else/when tree stays readable
 * for that count. When the count grows, swap this for
 * `androidx.navigation.compose.NavHost` and lift the
 * destinations out of the activity.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NilamindTheme {
                AppRoot()
            }
        }
    }
}

@Composable
private fun AppRoot() {
    var current by remember { mutableStateOf(Destination.Home) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars),
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
            ) {
                when (current) {
                    Destination.Home -> HomeScreen(onNavigate = { current = it })
                    Destination.Phq9 -> Phq9Screen(
                        onBack = { current = Destination.Home },
                        onNavigateToCsrs = { current = Destination.CsrsScreener },
                    )
                    Destination.Gad7 -> Gad7Screen(onBack = { current = Destination.Home })
                    Destination.CsrsScreener -> CsrsScreenerScreen(
                        onBack = { current = Destination.Home },
                        onNavigateToSafetyPlan = { current = Destination.SafetyPlan },
                    )
                    Destination.SafetyPlan -> SafetyPlanScreen(onBack = { current = Destination.Home })
                    Destination.Research -> ResearchScreen(onBack = { current = Destination.Home })
                    // `Bangs` is a pseudo-destination — typing a
                    // bang command on Home routes to the actual
                    // destination, never to "Bangs" itself.
                    Destination.Bangs -> HomeScreen(onNavigate = { current = it })
                }
            }
            AppBottomBar(current = current, onNavigate = { current = it })
        }
    }
}

@Composable
private fun AppBottomBar(
    current: Destination,
    onNavigate: (Destination) -> Unit,
) {
    // Four primary items: Home, PHQ-9, GAD-7, Safety plan.
    // C-SSRS and Research are reachable from Home (tile)
    // and via the bang bar. Six items in a 1080dp row left
    // no room for the labels.
    val items = listOf(
        Destination.Home,
        Destination.Phq9,
        Destination.Gad7,
        Destination.SafetyPlan,
    )
    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            items.forEach { dest ->
                BottomItem(
                    label = dest.label(),
                    selected = current == dest,
                    onClick = { onNavigate(dest) },
                )
            }
        }
    }
}

@Composable
private fun BottomItem(label: String, selected: Boolean, onClick: () -> Unit) {
    val container = if (selected) MaterialTheme.colorScheme.primaryContainer
    else MaterialTheme.colorScheme.surface
    val onContainer = if (selected) MaterialTheme.colorScheme.onPrimaryContainer
    else MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        modifier = Modifier
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .background(container)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = onContainer,
        )
    }
}

private fun Destination.label(): String = when (this) {
    Destination.Home -> "Home"
    Destination.Phq9 -> "PHQ-9"
    Destination.Gad7 -> "GAD-7"
    Destination.CsrsScreener -> "C-SSRS"
    Destination.SafetyPlan -> "Safety"
    Destination.Research -> "Refs"
    Destination.Bangs -> "Home"
}
