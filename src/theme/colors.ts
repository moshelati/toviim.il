/**
 * Design-system color palette.
 * Single source of truth — never hardcode hex elsewhere.
 */
export const Colors = {
  /* ── Core ─────────────────────────────────────── */
  background: '#FFFFFF',
  surface:    '#F7F7FB',
  text:       '#12131A',
  muted:      '#6B6F7B',
  border:     '#E6E7EF',

  /* ── Brand purple ─────────────────────────────── */
  primary:      '#6D28D9',
  primaryLight: '#EDE9FE',
  primaryMid:   '#A78BFA',
  primaryDark:  '#4C1D95',

  /* ── Semantic ─────────────────────────────────── */
  success:      '#16A34A',
  successLight: '#DCFCE7',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',
  warning:      '#D97706',
  warningLight: '#FEF3C7',

  /* ── Neutrals (gray scale) ────────────────────── */
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  /* ── Fixed ────────────────────────────────────── */
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  /* ── Gradients (use with LinearGradient) ───────── */
  gradientPurple: ['#6D28D9', '#4C1D95'] as [string, string],
  gradientHero:   ['#7C3AED', '#6D28D9', '#4C1D95'] as [string, string, string],
} as const;

export type ColorKey = keyof typeof Colors;
