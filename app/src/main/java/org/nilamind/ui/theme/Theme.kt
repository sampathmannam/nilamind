package org.nilamind.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * nilamind visual theme.
 *
 * The visual direction is intentionally clinical: calm
 * slate background, deep teal primary, monospace for
 * clinical data, serif for emphasis, and no animations
 * on score surfaces. The mental-health-first-launcher
 * constraint from MindAnchor does not apply here — the
 * audience is the clinician, not the patient — so the
 * mood is information-dense and quiet, not slow and
 * journal-like.
 *
 * Colour palette is derived from the Stanley-Brown
 * safety-plan cover-page aesthetic (deep teal, warm
 * parchment) so a clinician who prints the safety plan
 * from the app gets something that looks consistent
 * with the rest of the case file.
 */

private val DeepTeal = Color(0xFF0F766E)
private val DeepTealDark = Color(0xFF0D5C56)
private val SoftSlate = Color(0xFFF5F4F0)
private val SoftSlateDark = Color(0xFF1B1F22)
private val Ink = Color(0xFF1B1F22)
private val InkOnDark = Color(0xFFE6E4DF)
private val Muted = Color(0xFF6B6F76)
private val Rust = Color(0xFF8B4A4A) // deep rust for risk callouts; not a red alert

private val LightColors = lightColorScheme(
    primary = DeepTeal,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFB2DFD8),
    onPrimaryContainer = Color(0xFF003733),
    secondary = Color(0xFF3730A3),
    onSecondary = Color.White,
    background = SoftSlate,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Color(0xFFEFEDE7),
    onSurfaceVariant = Muted,
    outline = Color(0xFFC8C5BD),
    error = Rust,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7CCFC4),
    onPrimary = Color(0xFF003733),
    primaryContainer = DeepTealDark,
    onPrimaryContainer = Color(0xFFB2DFD8),
    secondary = Color(0xFFC7D2FE),
    onSecondary = Color(0xFF1B1F4D),
    background = SoftSlateDark,
    onBackground = InkOnDark,
    surface = Color(0xFF25292D),
    onSurface = InkOnDark,
    surfaceVariant = Color(0xFF2E3338),
    onSurfaceVariant = Color(0xFFB8B5AE),
    outline = Color(0xFF4A4F55),
    error = Color(0xFFD4A09A),
    onError = Color(0xFF3D1414),
)

private val NilamindTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Medium,
        fontSize = 30.sp,
        lineHeight = 38.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Medium,
        fontSize = 24.sp,
        lineHeight = 32.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Medium,
        fontSize = 20.sp,
        lineHeight = 28.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 18.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
)

@Composable
fun NilamindTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = NilamindTypography,
        content = content,
    )
}
