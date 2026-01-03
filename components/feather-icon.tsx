import React from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { SvgProps } from 'react-native-svg';

// Feather Icons SVG paths mapping
const FEATHER_ICONS: Record<string, (props: any) => React.ReactNode> = {
  trophy: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2m-4-3V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v1m4 3s-1 0-1 1v1m0 0a1 1 0 1 0 2 0m-2 0a1 1 0 1 1 2 0" />
      <path d="M9 16h6" />
    </Svg>
  ),
  check: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Svg>
  ),
  clock: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  ),
  target: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="9" />
    </Svg>
  ),
  save: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </Svg>
  ),
  star: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <polygon points="12 2 15.09 10.26 24 10.27 17.18 16.70 20.09 24.97 12 18.54 3.91 24.97 6.82 16.70 0 10.27 8.91 10.26 12 2" />
    </Svg>
  ),
  heart: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </Svg>
  ),
  alert: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  ),
  zap: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  ),
};

interface FeatherIconProps {
  name: keyof typeof FEATHER_ICONS;
  size?: number;
  color?: string;
  style?: any;
}

export function FeatherIcon({ name, size = 24, color = 'currentColor', style }: FeatherIconProps) {
  if (Platform.OS === 'web') {
    // For web, use SVG directly
    const IconComponent = FEATHER_ICONS[name];
    if (!IconComponent) return <Text>?</Text>;
    
    return (
      <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={2}
          style={{ display: 'block' }}
        >
          {IconComponent({ width: size, height: size })}
        </svg>
      </View>
    );
  }

  // For native, render SVG using react-native-svg
  const IconComponent = FEATHER_ICONS[name];
  if (!IconComponent) return <Text>?</Text>;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {IconComponent({ width: size, height: size, color })}
    </View>
  );
}
