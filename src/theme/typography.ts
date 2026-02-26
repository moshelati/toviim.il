import { TextStyle, Platform } from 'react-native';

/**
 * Semantic typography styles — Hebrew-first.
 * Always import from here, never define font styles inline.
 */

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) ?? 'System';

export const Typography = {
  /** 32/38 – Main headings */
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    fontFamily,
  } as TextStyle,

  /** 24/30 – Section headings */
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    fontFamily,
  } as TextStyle,

  /** 20/26 – Sub-headings */
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily,
  } as TextStyle,

  /** 17/24 – Large body, card titles */
  bodyLarge: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily,
  } as TextStyle,

  /** 16/22 – Default body text */
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    fontFamily,
  } as TextStyle,

  /** 15/22 – Chat / medium text */
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    fontFamily,
  } as TextStyle,

  /** 14/20 – Secondary text */
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily,
  } as TextStyle,

  /** 13/18 – Captions, timestamps */
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily,
  } as TextStyle,

  /** 12/16 – Tiny labels */
  tiny: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily,
  } as TextStyle,

  /** 15/20 – Button labels */
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily,
  } as TextStyle,

  /** 16/22 – Large button labels */
  buttonLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily,
  } as TextStyle,
} as const;
