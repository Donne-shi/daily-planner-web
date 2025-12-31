import { useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { useStore, getWeekStartDate, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { PomodoroSession } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 200;

type TimeRange = "today" | "week" | "month";

// Helper functions
function getWeekDays(weekStartDate: string): string[] {
  const days: string[] = [];
  const start = new Date(weekStartDate);
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day.toISOString().split("T")[0]);
  }
  return days;
}

function getMonthDays(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    days.push(day.toISOString().split("T")[0]);
  }
  return days;
}

// Get hour from completedAt timestamp
function getHourFromTimestamp(timestamp: string): number {
  const date = new Date(timestamp);
  return date.getHours();
}

export default function StatsScreen() {
  const colors = useColors();
  const { state } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("today");

  const weekStartDate = getWeekStartDate();
  const today = getToday();

  // Calculate stats based on time range
  const stats = useMemo(() => {
    let sessions: PomodoroSession[] = [];
    let labels: string[] = [];
    let energyData: (number | null)[] = [];
    let peakHour: { hour: string; value: number } | null = null;
    let lowHour: { hour: string; value: number } | null = null;
    let avgEnergy: number | null = null;
    let dataPointCount = 0;

    if (timeRange === "today") {
      // Today view: show hourly energy curve
      // Hours from 6:00 to 23:00
      const hours = Array.from({ length: 18 }, (_, i) => i + 6);
      labels = hours.map((h) => `${h}:00`);

      sessions = state.sessions.filter(
        (s) => s.isCompleted && s.date === today
      );

      // Group sessions by hour and calculate average energy
      const hourlyEnergy: { [hour: number]: number[] } = {};
      sessions.forEach((s) => {
        if (s.energyScore && s.endAt) {
          const hour = getHourFromTimestamp(s.endAt);
          if (hour >= 6 && hour <= 23) {
            if (!hourlyEnergy[hour]) hourlyEnergy[hour] = [];
            hourlyEnergy[hour].push(s.energyScore);
          }
        }
      });

      energyData = hours.map((hour) => {
        const scores = hourlyEnergy[hour];
        if (!scores || scores.length === 0) return null;
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        return Math.round(avg * 10) / 10;
      });

      // Find peak and low hours
      let maxVal = 0, minVal = 6, maxIdx = -1, minIdx = -1;
      energyData.forEach((val, idx) => {
        if (val !== null) {
          dataPointCount++;
          if (val > maxVal) { maxVal = val; maxIdx = idx; }
          if (val < minVal) { minVal = val; minIdx = idx; }
        }
      });

      if (maxIdx >= 0) peakHour = { hour: labels[maxIdx], value: maxVal };
      if (minIdx >= 0 && minVal < 6) lowHour = { hour: labels[minIdx], value: minVal };

      // Calculate average energy
      const validScores = energyData.filter((v) => v !== null) as number[];
      if (validScores.length > 0) {
        avgEnergy = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10;
      }

    } else if (timeRange === "week") {
      // Week view: show daily average energy
      const weekDays = getWeekDays(weekStartDate);
      labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

      sessions = state.sessions.filter(
        (s) => s.isCompleted && weekDays.includes(s.date)
      );

      energyData = weekDays.map((date) => {
        const daySessions = state.sessions.filter(
          (s) => s.date === date && s.isCompleted && s.energyScore
        );
        if (daySessions.length === 0) return null;
        const avg =
          daySessions.reduce((sum, s) => sum + (s.energyScore || 0), 0) /
          daySessions.length;
        return Math.round(avg * 10) / 10;
      });

      // Find peak and low days
      let maxVal = 0, minVal = 6, maxIdx = -1, minIdx = -1;
      energyData.forEach((val, idx) => {
        if (val !== null) {
          dataPointCount++;
          if (val > maxVal) { maxVal = val; maxIdx = idx; }
          if (val < minVal) { minVal = val; minIdx = idx; }
        }
      });

      if (maxIdx >= 0) peakHour = { hour: labels[maxIdx], value: maxVal };
      if (minIdx >= 0 && minVal < 6) lowHour = { hour: labels[minIdx], value: minVal };

      const validScores = energyData.filter((v) => v !== null) as number[];
      if (validScores.length > 0) {
        avgEnergy = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10;
      }

    } else {
      // Month view: show daily average energy for last 30 days
      const monthDays = getMonthDays();
      labels = monthDays.map((d) => {
        const date = new Date(d);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });

      sessions = state.sessions.filter(
        (s) => s.isCompleted && monthDays.includes(s.date)
      );

      energyData = monthDays.map((date) => {
        const daySessions = state.sessions.filter(
          (s) => s.date === date && s.isCompleted && s.energyScore
        );
        if (daySessions.length === 0) return null;
        const avg =
          daySessions.reduce((sum, s) => sum + (s.energyScore || 0), 0) /
          daySessions.length;
        return Math.round(avg * 10) / 10;
      });

      // Find peak and low days
      let maxVal = 0, minVal = 6, maxIdx = -1, minIdx = -1;
      energyData.forEach((val, idx) => {
        if (val !== null) {
          dataPointCount++;
          if (val > maxVal) { maxVal = val; maxIdx = idx; }
          if (val < minVal) { minVal = val; minIdx = idx; }
        }
      });

      if (maxIdx >= 0) peakHour = { hour: labels[maxIdx], value: maxVal };
      if (minIdx >= 0 && minVal < 6) lowHour = { hour: labels[minIdx], value: minVal };

      const validScores = energyData.filter((v) => v !== null) as number[];
      if (validScores.length > 0) {
        avgEnergy = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10;
      }
    }

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    return {
      pomodoroCount: sessions.length,
      focusMinutes: totalMinutes,
      labels,
      energyData,
      peakHour,
      lowHour,
      avgEnergy,
      dataPointCount,
    };
  }, [state.sessions, timeRange, weekStartDate, today]);

  const handleTimeRangeChange = (range: TimeRange) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setTimeRange(range);
  };

  if (state.isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载中...</Text>
      </ScreenContainer>
    );
  }

  // Calculate chart dimensions
  const chartPadding = { top: 20, right: 15, bottom: 35, left: 35 };
  const chartInnerWidth = CHART_WIDTH - chartPadding.left - chartPadding.right;
  const chartInnerHeight = CHART_HEIGHT - chartPadding.top - chartPadding.bottom;

  // Filter valid data points for the line
  const validPoints = stats.energyData
    .map((value, index) => ({ value, index }))
    .filter((p) => p.value !== null) as { value: number; index: number }[];

  // Generate SVG path for the line chart
  const generateLinePath = () => {
    if (validPoints.length < 2) return "";
    
    const points = validPoints.map((p) => {
      const x = chartPadding.left + (p.index / (stats.labels.length - 1)) * chartInnerWidth;
      const y = chartPadding.top + chartInnerHeight - ((p.value - 1) / 4) * chartInnerHeight;
      return { x, y };
    });

    // Create smooth curve using bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return path;
  };

  // Generate area path for gradient fill
  const generateAreaPath = () => {
    if (validPoints.length < 2) return "";
    
    const points = validPoints.map((p) => {
      const x = chartPadding.left + (p.index / (stats.labels.length - 1)) * chartInnerWidth;
      const y = chartPadding.top + chartInnerHeight - ((p.value - 1) / 4) * chartInnerHeight;
      return { x, y };
    });

    const bottomY = chartPadding.top + chartInnerHeight;
    let path = `M ${points[0].x} ${bottomY}`;
    path += ` L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    
    path += ` L ${points[points.length - 1].x} ${bottomY}`;
    path += " Z";
    return path;
  };

  // Get label display interval based on time range
  const getLabelInterval = () => {
    if (timeRange === "today") return 3; // Show every 3 hours
    if (timeRange === "week") return 1; // Show all days
    return 5; // Show every 5 days for month
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-3xl font-bold text-foreground">统计</Text>
          <Text className="text-muted mt-1">查看你的专注数据</Text>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row bg-surface rounded-xl p-1 mb-6">
          {(["today", "week", "month"] as TimeRange[]).map((range) => (
            <Pressable
              key={range}
              onPress={() => handleTimeRangeChange(range)}
              style={({ pressed }) => [
                styles.rangeButton,
                timeRange === range && { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                className={`font-medium ${
                  timeRange === range ? "text-white" : "text-foreground"
                }`}
              >
                {range === "today" ? "今日" : range === "week" ? "本周" : "本月"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
            <Text className="text-4xl mb-2">🍅</Text>
            <Text className="text-3xl font-bold text-primary">
              {stats.pomodoroCount}
            </Text>
            <Text className="text-muted text-sm mt-1">番茄次数</Text>
          </View>
          <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
            <Text className="text-4xl mb-2">⏱️</Text>
            <Text className="text-3xl font-bold text-primary">
              {stats.focusMinutes}
            </Text>
            <Text className="text-muted text-sm mt-1">专注分钟</Text>
          </View>
        </View>

        {/* Energy Insights */}
        {stats.dataPointCount > 0 && (
          <View className="flex-row gap-3 mb-4">
            {stats.peakHour && (
              <View className="flex-1 bg-success/10 rounded-xl p-3">
                <Text className="text-success text-xs font-medium">🔥 精力峰值</Text>
                <Text className="text-foreground font-bold mt-1">{stats.peakHour.hour}</Text>
                <Text className="text-muted text-xs">{stats.peakHour.value} 分</Text>
              </View>
            )}
            {stats.lowHour && (
              <View className="flex-1 bg-warning/10 rounded-xl p-3">
                <Text className="text-warning text-xs font-medium">😴 精力低谷</Text>
                <Text className="text-foreground font-bold mt-1">{stats.lowHour.hour}</Text>
                <Text className="text-muted text-xs">{stats.lowHour.value} 分</Text>
              </View>
            )}
            {stats.avgEnergy && (
              <View className="flex-1 bg-primary/10 rounded-xl p-3">
                <Text className="text-primary text-xs font-medium">📊 平均精力</Text>
                <Text className="text-foreground font-bold mt-1">{stats.avgEnergy} 分</Text>
                <Text className="text-muted text-xs">基于 {stats.dataPointCount} 个数据</Text>
              </View>
            )}
          </View>
        )}

        {/* Energy Chart */}
        <View className="bg-surface rounded-2xl p-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            ⚡ 精力曲线
            {timeRange === "today" && " (按小时)"}
            {timeRange === "week" && " (按天)"}
            {timeRange === "month" && " (近30天)"}
          </Text>

          {validPoints.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-muted">暂无精力数据</Text>
              <Text className="text-muted text-sm mt-2">
                完成番茄并记录精力评分后显示
              </Text>
            </View>
          ) : (
            <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                <Defs>
                  <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                    <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
                  </LinearGradient>
                </Defs>

                {/* Grid lines */}
                {[1, 2, 3, 4, 5].map((value) => {
                  const y = chartPadding.top + chartInnerHeight - ((value - 1) / 4) * chartInnerHeight;
                  return (
                    <Line
                      key={value}
                      x1={chartPadding.left}
                      y1={y}
                      x2={chartPadding.left + chartInnerWidth}
                      y2={y}
                      stroke={colors.border}
                      strokeWidth={1}
                      strokeDasharray={value === 3 ? "0" : "4,4"}
                      opacity={value === 3 ? 0.5 : 0.3}
                    />
                  );
                })}

                {/* Reference line at 3 (middle energy) */}
                <Line
                  x1={chartPadding.left}
                  y1={chartPadding.top + chartInnerHeight / 2}
                  x2={chartPadding.left + chartInnerWidth}
                  y2={chartPadding.top + chartInnerHeight / 2}
                  stroke={colors.muted}
                  strokeWidth={1}
                  strokeDasharray="6,3"
                  opacity={0.5}
                />

                {/* Area fill */}
                {validPoints.length >= 2 && (
                  <Path
                    d={generateAreaPath()}
                    fill="url(#areaGradient)"
                  />
                )}

                {/* Line */}
                {validPoints.length >= 2 && (
                  <Path
                    d={generateLinePath()}
                    stroke={colors.primary}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points */}
                {validPoints.map((point, idx) => {
                  const x = chartPadding.left + (point.index / (stats.labels.length - 1)) * chartInnerWidth;
                  const y = chartPadding.top + chartInnerHeight - ((point.value - 1) / 4) * chartInnerHeight;
                  return (
                    <Circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={5}
                      fill={colors.primary}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                })}

                {/* Y-axis labels */}
                {[1, 2, 3, 4, 5].map((value) => {
                  const y = chartPadding.top + chartInnerHeight - ((value - 1) / 4) * chartInnerHeight;
                  return (
                    <SvgText
                      key={value}
                      x={chartPadding.left - 8}
                      y={y + 4}
                      fontSize={11}
                      fill={colors.muted}
                      textAnchor="end"
                    >
                      {value}
                    </SvgText>
                  );
                })}
              </Svg>

              {/* X-axis labels (rendered outside SVG for better text rendering) */}
              <View
                style={[
                  styles.xAxisLabels,
                  {
                    left: chartPadding.left,
                    bottom: 5,
                    width: chartInnerWidth,
                  },
                ]}
              >
                {stats.labels.map((label, index) => {
                  const interval = getLabelInterval();
                  const showLabel = index % interval === 0 || index === stats.labels.length - 1;
                  const x = (index / (stats.labels.length - 1)) * chartInnerWidth;
                  
                  return showLabel ? (
                    <Text
                      key={index}
                      className="text-muted"
                      style={[
                        styles.xLabel,
                        { left: x - 20 },
                      ]}
                    >
                      {label}
                    </Text>
                  ) : null;
                })}
              </View>
            </View>
          )}
        </View>

        {/* Energy Legend */}
        <View className="mt-4 bg-surface rounded-xl p-4">
          <Text className="text-sm text-muted mb-2">精力评分说明</Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="flex-row items-center">
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text className="text-foreground text-xs">1 低能</Text>
            </View>
            <View className="flex-row items-center">
              <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
              <Text className="text-foreground text-xs">2 疲惫</Text>
            </View>
            <View className="flex-row items-center">
              <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
              <Text className="text-foreground text-xs">3 平稳</Text>
            </View>
            <View className="flex-row items-center">
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text className="text-foreground text-xs">4 高能</Text>
            </View>
            <View className="flex-row items-center">
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text className="text-foreground text-xs">5 心流</Text>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {stats.pomodoroCount === 0 && (
          <View className="items-center py-8 mt-4">
            <Text className="text-6xl mb-4">📊</Text>
            <Text className="text-foreground text-lg font-medium">
              暂无统计数据
            </Text>
            <Text className="text-muted text-center mt-2">
              完成番茄任务后{"\n"}这里会显示你的专注统计
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  xAxisLabels: {
    position: "absolute",
    height: 20,
  },
  xLabel: {
    position: "absolute",
    width: 40,
    textAlign: "center",
    fontSize: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
});
