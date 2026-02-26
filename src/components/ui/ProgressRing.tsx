import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../../theme';

interface ProgressRingProps {
  /** 0–100 */
  score: number;
  /** Ring diameter */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Show number inside */
  showLabel?: boolean;
  /** Custom color (default = auto from score) */
  color?: string;
}

export function getScoreColor(score: number): string {
  if (score >= 70) return Colors.success;
  if (score >= 40) return Colors.warning;
  return Colors.danger;
}

export function ProgressRing({
  score,
  size = 80,
  strokeWidth = 6,
  showLabel = true,
  color,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const ringColor = color || getScoreColor(progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.gray200}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showLabel && (
        <View style={styles.labelWrap}>
          <Text style={[styles.score, { color: ringColor }]}>{progress}</Text>
          <Text style={styles.percent}>%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 22,
    fontWeight: '800',
  },
  percent: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    marginLeft: 1,
  },
});
