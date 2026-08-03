/**
 * NilaMind Design System Tokens
 * Single source of truth for colors, spacing, typography, motion, and semantic roles.
 * These map to CSS custom properties in index.css — keep them in sync.
 */

// ── Spacing Scale (4px base) ─────────────────────────────────────────────────────────────────
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────────────────────
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// ── Shadows / Elevation ───────────────────────────────────────────────────────────────────────
export const elevation = {
  none: 'none',
  subtle: '0 1px 2px rgba(0,0,0,0.14), 0 10px 24px -14px rgba(0,0,0,0.28)',
  card: '0 1px 2px rgba(0,0,0,0.14), 0 10px 24px -14px rgba(0,0,0,0.28)',
  raised: '0 1px 2px rgba(0,0,0,0.16), 0 12px 28px -14px rgba(0,0,0,0.32)',
  modal: '0 4px 16px rgba(0,0,0,0.2), 0 20px 40px -12px rgba(0,0,0,0.4)',
} as const;

// ── Typography ────────────────────────────────────────────────────────────────────────────────
export const fontFamily = {
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  display: '"Lora", ui-serif, Georgia, serif',
  serif: '"Lora", ui-serif, Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
} as const;

export const fontSize = {
  xs: ['11px', { lineHeight: '1.4', letterSpacing: '0' }],
  sm: ['12px', { lineHeight: '1.4', letterSpacing: '0' }],
  base: ['13px', { lineHeight: '1.5', letterSpacing: '0' }],
  md: ['14px', { lineHeight: '1.5', letterSpacing: '0' }],
  lg: ['15px', { lineHeight: '1.5', letterSpacing: '0' }],
  xl: ['17px', { lineHeight: '1.4', letterSpacing: '0' }],
  '2xl': ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
  '3xl': ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
  '4xl': ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
  '5xl': ['32px', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
  hero: ['clamp(3.5rem, 18vw, 6.5rem)', { lineHeight: '1', letterSpacing: '-0.02em' }],
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ── Motion / Animation ────────────────────────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant: 0,
    fastest: 80,
    fast: 150,
    normal: 200,
    medium: 280,
    slow: 350,
    slower: 400,
    slowest: 500,
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
    easeOutCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springGentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    pageEnter: 'cubic-bezier(0.22, 1, 0.36, 1)',
    pageExit: 'ease-in',
  },

  stagger: {
    base: 40,
    max: 240,
  },
} as const;

// ── Touch Targets ─────────────────────────────────────────────────────────────────────────────
export const touchTarget = {
  min: 44,
  comfortable: 48,
  spacious: 56,
} as const;

// ── Z-Index Scale ─────────────────────────────────────────────────────────────────────────────
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  sheet: 30,
  modalBackdrop: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
  crisis: 100,
} as const;

// ── Semantic Color Roles (mirror CSS custom properties) ───────────────────────────────────────
export const colorRoles = {
  ink: 'var(--color-ink)',
  ink2: 'var(--color-ink-2)',
  inkMuted: 'var(--color-ink-muted)',
  inkFaint: 'var(--color-ink-faint)',
  line: 'var(--color-line)',
  lineStrong: 'var(--color-line-strong)',
  fill: 'var(--color-fill)',
  accent: 'var(--color-accent)',
  accentHi: 'var(--color-accent-hi)',
  danger: 'var(--color-danger)',
  success: 'var(--color-success)',
  warn: 'var(--color-warn)',
  hero: 'var(--color-hero)',
  page: 'var(--color-page)',
  card: 'var(--color-card)',
  raised: 'var(--color-raised)',
} as const;

// ── Breakpoints (match Tailwind) ──────────────────────────────────────────────────────────────
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ── Component Token Shorthands ────────────────────────────────────────────────────────────────
export const components = {
  button: {
    height: { sm: 36, md: 44, lg: 52 },
    padding: { sm: '8px 16px', md: '12px 20px', lg: '16px 24px' },
    radius: radius.xl,
  },
  card: {
    padding: spacing[4],
    radius: radius.xl,
    shadow: elevation.card,
  },
  sheet: {
    padding: spacing[5],
    radius: radius.xxl,
    shadow: elevation.modal,
  },
  input: {
    height: 44,
    padding: '10px 14px',
    radius: radius.xl,
  },
} as const;

// ── Export all as a single design system object ───────────────────────────────────────────────
export const designSystem = {
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
  breakpoints,
  components,
} as const;

export type DesignSystem = typeof designSystem;
export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type MotionDuration = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;