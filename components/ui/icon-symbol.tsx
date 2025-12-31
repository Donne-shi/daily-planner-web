// Modern icon component using Ionicons for a cleaner, more contemporary look

import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof Ionicons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Modern icon mappings using Ionicons
 * Ionicons provides a cleaner, more contemporary design language
 */
const MAPPING: IconMapping = {
  // Tab icons - using outline style for unselected, filled for selected
  "house.fill": "home",
  "sun.max.fill": "today",
  "calendar": "calendar-outline",
  "chart.bar.fill": "stats-chart",
  "flag.fill": "flag",
  "gearshape.fill": "settings",
  // Navigation icons
  "chevron.right": "chevron-forward",
  "chevron.left": "chevron-back",
  // Action icons
  "plus": "add",
  "checkmark": "checkmark",
  "checkmark.circle.fill": "checkmark-circle",
  "circle": "ellipse-outline",
  "xmark": "close",
  // Timer/Focus icons
  "timer": "timer-outline",
  "play.fill": "play",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "arrow.clockwise": "refresh",
  // Task icons
  "trash.fill": "trash-outline",
  "pencil": "pencil-outline",
  "doc.on.doc": "copy-outline",
  // Info icons
  "info.circle": "information-circle-outline",
  "exclamationmark.triangle": "warning-outline",
  // Additional modern icons
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code-slash",
};

/**
 * A modern icon component using Ionicons
 * Provides a cleaner, more contemporary look compared to Material Icons
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || "help-circle-outline";
  return <Ionicons color={color} size={size} name={iconName as any} style={style} />;
}
