import { Platform, ViewStyle } from 'react-native';

/**
 * Consistent shadows — use instead of ad-hoc shadow props.
 */
export const Shadows = {
  /** Barely visible lift – input focus, small cards */
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }) ?? {},

  /** Cards, tiles */
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }) ?? {},

  /** Modals, bottom sheets */
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }) ?? {},

  /** Floating action buttons */
  xl: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
    default: {},
  }) ?? {},
} as const;
