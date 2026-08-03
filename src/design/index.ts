/**
 * Design System Hooks & Utilities
 * Provides typed access to design tokens and theme-aware utilities.
 */

import { useMemo } from 'react';
import {
  spacing,
  radius,
  elevation,
  fontFamily,
  fontSize,
  fontWeight,
  motion,
  touchTarget,
  zIndex,
  colorRoles,
  components,
} from './tokens';

export function useDesignSystem() {
  const tokens = useMemo(() => ({
    spacing,
    radius,
    elevation,
    fontFamily,
    fontSize,
    fontWeight,
    motion,
    touchTarget,
    zIndex,
    colorRoles,
    components,
  }), []);

  return tokens;
}

// ── Color Role Helpers ───────────────────────────────────────────────────────────────────────
/**
 * Get a CSS custom property value for a color role.
 * Use with `style={{ color: color('accent') }}` or in template literals.
 */
export function color(role: keyof typeof colorRoles): string {
  return colorRoles[role];
}

/**
 * Get a spacing value in pixels.
 */
export function space(size: keyof typeof spacing): number {
  return spacing[size];
}

/**
 * Get a spacing value as a CSS string (e.g., "16px").
 */
export function spaceCss(size: keyof typeof spacing): string {
  return `${spacing[size]}px`;
}

/**
 * Get a border radius value as a CSS string.
 */
export function radiusCss(size: keyof typeof radius): string {
  return `${radius[size]}px`;
}

/**
 * Get a motion duration in milliseconds.
 */
export function duration(key: keyof typeof motion.duration): number {
  return motion.duration[key];
}

/**
 * Get a motion duration as a CSS string (e.g., "200ms").
 */
export function durationCss(key: keyof typeof motion.duration): string {
  return `${motion.duration[key]}ms`;
}

/**
 * Get an easing curve by name.
 */
export function easing(key: keyof typeof motion.easing): string {
  return motion.easing[key];
}

/**
 * Get a z-index value.
 */
export function z(key: keyof typeof zIndex): number {
  return zIndex[key];
}

/**
 * Get the minimum touch target size in pixels.
 */
export function minTouchTarget(): number {
  return touchTarget.min;
}

/**
 * Generate a stagger delay for list items.
 * @param index - Item index (0-based)
 * @param maxItems - Maximum items to stagger (caps delay)
 * @returns CSS delay string (e.g., "80ms")
 */
export function staggerDelay(index: number, maxItems = 6): string {
  const delay = Math.min(index * motion.stagger.base, motion.stagger.max);
  return `${delay}ms`;
}

/**
 * Generate a complete transition string for a property.
 * @param property - CSS property to transition (e.g., "transform", "opacity", "all")
 * @param durationKey - Motion duration key
 * @param easingKey - Motion easing key
 */
export function transition(
  property: string,
  durationKey: keyof typeof motion.duration = 'normal',
  easingKey: keyof typeof motion.easing = 'easeOut'
): string {
  return `${property} ${motion.duration[durationKey]}ms ${motion.easing[easingKey]}`;
}

/**
 * Generate a box-shadow string for elevation.
 */
export function shadow(level: keyof typeof elevation): string {
  return elevation[level];
}

/**
 * CSS-in-JS style object for a standard card.
 */
export const cardStyle = {
  backgroundColor: colorRoles.card,
  border: `1px solid ${colorRoles.line}`,
  borderRadius: radiusCss('xl'),
  boxShadow: elevation.card,
  padding: spaceCss(4),
} as const;

/**
 * CSS-in-JS style object for a raised surface.
 */
export const raisedStyle = {
  backgroundColor: colorRoles.raised,
  border: `1px solid ${colorRoles.line}`,
  borderRadius: radiusCss('xl'),
  boxShadow: elevation.raised,
  padding: spaceCss(4),
} as const;

/**
 * CSS-in-JS style object for a glass surface.
 */
export const glassStyle = {
  backgroundColor: `color-mix(in srgb, ${colorRoles.card} 68%, transparent)`,
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: radiusCss('xl'),
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px -18px rgba(0,0,0,0.55)',
  backdropFilter: 'blur(7px) saturate(1.1)',
  WebkitBackdropFilter: 'blur(7px) saturate(1.1)',
  padding: spaceCss(4),
} as const;

/**
 * Focus ring style for interactive elements.
 */
export const focusRingStyle = {
  outline: 'none',
  '&:focus-visible': {
    outline: `2px solid ${colorRoles.accent}`,
    outlineOffset: '2px',
  },
} as const;

/**
 * Tap target style for minimum 44x44 touch targets.
 */
export const tapTargetStyle = {
  minWidth: `${touchTarget.min}px`,
  minHeight: `${touchTarget.min}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/**
 * Screen-reader-only style.
 */
export const srOnlyStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

// ── Re-export tokens for convenience ──────────────────────────────────────────────────────────
export {
  spacing,
  radius,
  elevation,
  fontFamily,
  fontSize,
  fontWeight,
  motion,
  touchTarget,
  zIndex,
  colorRoles,
  components,
};