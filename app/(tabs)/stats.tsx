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

import { ScreenContainer } from "@/components/screen-container";
import { useStore, getWeekStartDate } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { PomodoroSession } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 180;

type TimeRange = "week" | "month" | "year";

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

function getYearMonths(): string[] {
  const months: string[] = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default function StatsScreen() {
  const colors = useColors();
  const { state } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const weekStartDate = getWeekStartDate();

  // Calculate stats based on time range
  const stats = useMemo(() => {
    let sessions: PomodoroSession[] = [];
    let labels: string[] = [];
    let energyData: (number | null)[] = [];

    if (timeRange === "week") {
      const weekDays = getWeekDays(weekStartDate);
      labels = ["一", "二", "三", "四", "五", "六", "日"];
      
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
    } else if (timeRange === "month") {
      const monthDays = getMonthDays();
      labels = monthDays.map((d) => new Date(d).getDate().toString());
      
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
    } else {
      const yearMonths = getYearMonths();
      labels = yearMonths.map((m) => {
        const [year, month] = m.split("-");
        return `${month}月`;
      });

      sessions = state.sessions.filter((s) => {
        if (!s.isCompleted) return false;
        const sessionMonth = s.date.substring(0, 7);
        return yearMonths.includes(sessionMonth);
      });

      energyData = yearMonths.map((month) => {
        const monthSessions = state.sessions.filter(
          (s) =>
            s.isCompleted &&
            s.date.startsWith(month) &&
            s.energyScore
        );
        if (monthSessions.length === 0) return null;
        const avg =
          monthSessions.reduce((sum, s) => sum + (s.energyScore || 0), 0) /
          monthSessions.length;
        return Math.round(avg * 10) / 10;
      });
    }

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    return {
      pomodoroCount: sessions.length,
      focusMinutes: totalMinutes,
      labels,
      energyData,
    };
  }, [state.sessions, timeRange, weekStartDate]);

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
  const maxEnergy = 5;
  const chartPadding = { top: 20, right: 10, bottom: 30, left: 30 };
  const chartInnerWidth = CHART_WIDTH - chartPadding.left - chartPadding.right;
  const chartInnerHeight = CHART_HEIGHT - chartPadding.top - chartPadding.bottom;

  // Filter valid data points for the line
  const validPoints = stats.energyData
    .map((value, index) => ({ value, index }))
    .filter((p) => p.value !== null) as { value: number; index: number }[];

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
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
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
                {range === "week" ? "本周" : range === "month" ? "本月" : "本年度"}
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

        {/* Energy Chart */}
        <View className="bg-surface rounded-2xl p-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            ⚡ 精力曲线
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
              {/* Y-axis labels */}
              <View
                style={[
                  styles.yAxisLabels,
                  { height: chartInnerHeight, top: chartPadding.top },
                ]}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <Text key={value} className="text-muted text-xs">
                    {value}
                  </Text>
                ))}
              </View>

              {/* Chart area */}
              <View
                style={[
                  styles.chartArea,
                  {
                    left: chartPadding.left,
                    top: chartPadding.top,
                    width: chartInnerWidth,
                    height: chartInnerHeight,
                  },
                ]}
              >
                {/* Grid lines */}
                {[1, 2, 3, 4, 5].map((value) => (
                  <View
                    key={value}
                    style={[
                      styles.gridLine,
                      {
                        bottom: ((value - 1) / 4) * chartInnerHeight,
                        backgroundColor: colors.border,
                      },
                    ]}
                  />
                ))}

                {/* Data points and lines */}
                {validPoints.map((point, idx) => {
                  const x = (point.index / (stats.labels.length - 1)) * chartInnerWidth;
                  const y = chartInnerHeight - ((point.value - 1) / 4) * chartInnerHeight;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.dataPoint,
                        {
                          left: x - 5,
                          top: y - 5,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  );
                })}

                {/* Connect points with lines */}
                {validPoints.length > 1 &&
                  validPoints.slice(0, -1).map((point, idx) => {
                    const nextPoint = validPoints[idx + 1];
                    const x1 = (point.index / (stats.labels.length - 1)) * chartInnerWidth;
                    const y1 = chartInnerHeight - ((point.value - 1) / 4) * chartInnerHeight;
                    const x2 = (nextPoint.index / (stats.labels.length - 1)) * chartInnerWidth;
                    const y2 = chartInnerHeight - ((nextPoint.value - 1) / 4) * chartInnerHeight;

                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

                    return (
                      <View
                        key={`line-${idx}`}
                        style={[
                          styles.line,
                          {
                            left: x1,
                            top: y1,
                            width: length,
                            backgroundColor: colors.primary,
                            transform: [{ rotate: `${angle}deg` }],
                          },
                        ]}
                      />
                    );
                  })}
              </View>

              {/* X-axis labels */}
              <View
                style={[
                  styles.xAxisLabels,
                  {
                    left: chartPadding.left,
                    bottom: 0,
                    width: chartInnerWidth,
                  },
                ]}
              >
                {stats.labels.map((label, index) => {
                  // Show fewer labels for month/year view
                  const showLabel =
                    timeRange === "week" ||
                    (timeRange === "month" && index % 5 === 0) ||
                    (timeRange === "year" && index % 2 === 0);
                  
                  return (
                    <Text
                      key={index}
                      className="text-muted text-xs"
                      style={{
                        position: "absolute",
                        left: (index / (stats.labels.length - 1)) * chartInnerWidth - 10,
                        width: 20,
                        textAlign: "center",
                      }}
                    >
                      {showLabel ? label : ""}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Energy Legend */}
        <View className="mt-4 bg-surface rounded-xl p-4">
          <Text className="text-sm text-muted mb-2">精力评分说明</Text>
          <View className="flex-row flex-wrap">
            <Text className="text-foreground text-sm mr-4">1 = 低能</Text>
            <Text className="text-foreground text-sm mr-4">2 = 疲惫</Text>
            <Text className="text-foreground text-sm mr-4">3 = 平稳</Text>
            <Text className="text-foreground text-sm mr-4">4 = 高能</Text>
            <Text className="text-foreground text-sm">5 = 心流</Text>
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
  yAxisLabels: {
    position: "absolute",
    left: 0,
    width: 25,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 5,
  },
  chartArea: {
    position: "absolute",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  dataPoint: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    position: "absolute",
    height: 2,
    transformOrigin: "left center",
  },
  xAxisLabels: {
    position: "absolute",
    height: 20,
    flexDirection: "row",
  },
});
