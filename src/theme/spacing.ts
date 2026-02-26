/**
 * Spacing scale — base unit 4px.
 * Every spacing value must come from this scale.
 */
export const Spacing = {
  /** 4 */  xs:   4,
  /** 8 */  sm:   8,
  /** 12 */ md:   12,
  /** 16 */ base: 16,
  /** 20 */ lg:   20,
  /** 24 */ xl:   24,
  /** 32 */ xxl:  32,
  /** 40 */ xxxl: 40,
  /** 48 */ huge: 48,
} as const;

/** Screen horizontal padding */
export const SCREEN_PADDING = 20;

/** Common radii */
export const Radius = {
  /** 8  – small chips, badges */
  sm: 8,
  /** 12 – inputs, small cards */
  md: 12,
  /** 14 – buttons */
  button: 14,
  /** 16 – cards */
  lg: 16,
  /** 24 – hero sections */
  xl: 24,
  /** 9999 – pill / circle */
  full: 9999,
} as const;

/** Section gap between major blocks */
export const SECTION_GAP = 24;

/** Standard card padding */
export const CARD_PADDING = 16;

/** Standard button height */
export const BUTTON_HEIGHT = 52;
