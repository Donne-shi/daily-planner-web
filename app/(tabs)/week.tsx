import { useState, useMemo, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Image as RNImage,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";

import { ScreenContainer } from "@/components/screen-container";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStore, getWeekStartDate, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { TodoTask, PomodoroSession, WeeklyReflection } from "@/lib/types";

// Get week days
function getWeekDays(weekStartDate: string): string[] {
  const days: string[] = [];
  const [year, month, date] = weekStartDate.split('-').map(Number);
  const start = new Date(year, month - 1, date);
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
  }
  return days;
}

// Format date to local YYYY-MM-DD string (avoids timezone issues)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get month days for calendar view
function getMonthDays(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
  
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];
  
  // Fill empty days before first day
  for (let i = 0; i < startWeekday; i++) {
    currentWeek.push(null);
  }
  
  // Fill days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    currentWeek.push(formatLocalDate(date));
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Fill remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }
  
  return weeks;
}

// Get week start date from any date
function getWeekStartFromDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

type ViewMode = "week" | "month";

export default function WeekScreen() {
  const colors = useColors();
  const {
    state,
    addWeeklyGoal,
    toggleWeeklyGoal,
    deleteWeeklyGoal,
    saveWeeklyReflection,
    getCurrentWeekGoals,
    getCurrentWeekReflection,
    getTasksByDate,
    getSessionsByDate,
    getWeekSessions,
  } = useStore();

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = this week, -1 = last week, etc.
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0); // 0 = this month
  const [reflectionForm, setReflectionForm] = useState({
    top3Achievements: ["", "", ""],
    gratitude3: ["", "", ""],
    distractions: [""],
  });
  const [showShareModal, setShowShareModal] = useState(false);

  const today = getToday();
  const currentWeekStart = getWeekStartDate();

  // Generate share image
  const generateShareImage = async () => {
    if (Platform.OS === "web") {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, 1080, 1920);

      ctx.fillStyle = colors.primary;
      ctx.fillRect(0, 0, 1080, 300);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px sans-serif";
      ctx.fillText(state.settings.userName || "用户", 80, 140);

      ctx.font = "32px sans-serif";
      ctx.fillText("本周成果", 80, 190);

      ctx.fillStyle = colors.foreground;
      ctx.font = "bold 40px sans-serif";
      let y = 400;

      const weekSessions = getWeekSessions(displayedWeekStart);
      const totalMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalSessions = weekSessions.length;

      ctx.fillText("📊 本周数据", 60, y);
      y += 80;

      ctx.font = "32px sans-serif";
      ctx.fillText(`专注次数: ${totalSessions} 次`, 80, y);
      y += 60;
      ctx.fillText(`专注时间: ${totalMinutes} 分钟`, 80, y);
      y += 60;
      const avgEnergy = weekSessions.filter(s => s.energyScore).length > 0 
        ? (weekSessions.filter(s => s.energyScore).reduce((sum, s) => sum + (s.energyScore || 0), 0) / weekSessions.filter(s => s.energyScore).length).toFixed(1)
        : "-";
      ctx.fillText(`平均精力: ${avgEnergy}`, 80, y);
      y += 100;

      ctx.font = "24px sans-serif";
      ctx.fillStyle = colors.muted;
      ctx.fillText("时间好管家 - 专注效率，成就更好的自己", 60, 1850);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `weekly-summary-${displayedWeekStart}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  };
  
  // Calculate displayed week based on offset
  const displayedWeekStart = useMemo(() => {
    const [year, month, date] = currentWeekStart.split('-').map(Number);
    const start = new Date(year, month - 1, date);
    start.setDate(start.getDate() + currentWeekOffset * 7);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentWeekStart, currentWeekOffset]);
  
  const weekDays = useMemo(() => getWeekDays(displayedWeekStart), [displayedWeekStart]);
  
  // Calculate displayed month based on offset
  const displayedMonth = useMemo(() => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() + currentMonthOffset, 1);
    return {
      year: month.getFullYear(),
      month: month.getMonth(),
      name: month.toLocaleDateString("zh-CN", { year: "numeric", month: "long" }),
    };
  }, [currentMonthOffset]);
  
  const monthWeeks = useMemo(
    () => getMonthDays(displayedMonth.year, displayedMonth.month),
    [displayedMonth]
  );

  const weeklyGoals = useMemo(() => {
    // Get goals for the displayed week
    return state.weeklyGoals.filter((g) => g.weekStartDate === displayedWeekStart);
  }, [state.weeklyGoals, displayedWeekStart]);
  
  const weekSessions = useMemo(
    () => getWeekSessions(displayedWeekStart),
    [state.sessions, displayedWeekStart]
  );

  // Calculate week stats
  const weekStats = useMemo(() => {
    const completedTasks = state.tasks.filter(
      (t) => t.isCompleted && weekDays.includes(t.date)
    );
    const totalMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      taskCount: completedTasks.length,
      pomodoroCount: weekSessions.length,
      focusMinutes: totalMinutes,
    };
  }, [state.tasks, weekSessions, weekDays]);

  // Get day stats
  const getDayStats = useCallback(
    (date: string) => {
      const tasks = getTasksByDate(date).filter((t) => t.isCompleted);
      const sessions = getSessionsByDate(date);
      return {
        taskCount: tasks.length,
        pomodoroCount: sessions.length,
      };
    },
    [state.tasks, state.sessions]
  );

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    addWeeklyGoal({
      title: newGoalTitle.trim(),
      isCompleted: false,
      weekStartDate: displayedWeekStart,
    });
    setNewGoalTitle("");
  };

  const handleToggleGoal = (goalId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleWeeklyGoal(goalId);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    deleteWeeklyGoal(goalId);
  };

  const handleSaveReflection = () => {
    saveWeeklyReflection({
      weekStartDate: displayedWeekStart,
      focusMinutesAuto: weekStats.focusMinutes,
      top3Achievements: reflectionForm.top3Achievements.filter((s) => s.trim()),
      gratitude3: reflectionForm.gratitude3.filter((s) => s.trim()),
      distractions: reflectionForm.distractions.filter((s) => s.trim()),
    });
    setShowReflection(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const generateSummary = () => {
    const top3Tasks = state.tasks
      .filter((t) => t.isTop3 && t.isCompleted && weekDays.includes(t.date))
      .slice(0, 3);

    return `📊 本周成果总结

✅ 完成任务: ${weekStats.taskCount} 项
🍏 番茄次数: ${weekStats.pomodoroCount} 个
⏱️ 专注时長: ${weekStats.focusMinutes} 分钟

🏆 本周重要完成事项:
${top3Tasks.length > 0 ? top3Tasks.map((t, i) => `${i + 1}. ${t.title}`).join("\n") : "暂无"}

📅 ${displayedWeekStart} ~ ${weekDays[6]}`;
  };

  const handleCopySummary = async () => {
    const summary = generateSummary();
    await Clipboard.setStringAsync(summary);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSummary(false);
  };

  const handlePrevWeek = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setCurrentWeekOffset((prev) => prev - 1);
    setSelectedDate(null);
  };

  const handleNextWeek = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setCurrentWeekOffset((prev) => prev + 1);
    setSelectedDate(null);
  };

  const handlePrevMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setCurrentMonthOffset((prev) => prev - 1);
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setCurrentMonthOffset((prev) => prev + 1);
    setSelectedDate(null);
  };

  const handleGoToToday = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentWeekOffset(0);
    setCurrentMonthOffset(0);
    setSelectedDate(null);
  };

  const toggleViewMode = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setViewMode((prev) => (prev === "week" ? "month" : "week"));
    setSelectedDate(null);
  };

  const isCurrentPeriod = viewMode === "week" ? currentWeekOffset === 0 : currentMonthOffset === 0;

  if (state.isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载中...</Text>
      </ScreenContainer>
    );
  }

  const renderDayCell = (date: string | null, isMonthView: boolean = false) => {
    if (!date) {
      return <View style={[styles.dayCell, isMonthView && styles.monthDayCell]} />;
    }

    const stats = getDayStats(date);
    const isToday = date === today;
    const isSelected = date === selectedDate;
    const dayNum = new Date(date).getDate();

    return (
      <Pressable
        onPress={() => setSelectedDate(isSelected ? null : date)}
        style={({ pressed }) => [
          styles.dayCell,
          isMonthView && styles.monthDayCell,
          isToday && { borderColor: colors.primary, borderWidth: 2 },
          isSelected && { backgroundColor: colors.primary },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text
          className={`text-base font-medium ${
            isSelected ? "text-white" : "text-foreground"
          }`}
          style={isMonthView && { fontSize: 14 }}
        >
          {dayNum}
        </Text>
        {stats.taskCount > 0 && (
          <View
            style={[
              styles.dayDot,
              { backgroundColor: isSelected ? "#fff" : colors.primary },
            ]}
          />
        )}
      </Pressable>
    );
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
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-foreground">
              {viewMode === "week" ? "本周" : "本月"}
            </Text>
            <View className="flex-row items-center">
              {!isCurrentPeriod && (
                <Pressable
                  onPress={handleGoToToday}
                  style={({ pressed }) => [
                    styles.todayButton,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text className="text-white text-sm font-medium">今天</Text>
                </Pressable>
              )}
              <Pressable
                onPress={toggleViewMode}
                style={({ pressed }) => [
                  styles.viewModeButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-foreground text-sm font-medium">
                  {viewMode === "week" ? "月视图" : "周视图"}
                </Text>
              </Pressable>
            </View>
          </View>
          <Text className="text-muted mt-1">
            {viewMode === "week"
              ? `${displayedWeekStart} ~ ${weekDays[6]}`
              : displayedMonth.name}
          </Text>
        </View>

        {/* Weekly Goals - Only show in week view */}
        {viewMode === "week" && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              🎯 本周核心目标
            </Text>
            {weeklyGoals.map((goal) => (
              <View
                key={goal.id}
                className="flex-row items-center bg-surface rounded-xl px-4 py-3 mb-2"
              >
                <Pressable
                  onPress={() => handleToggleGoal(goal.id)}
                  style={({ pressed }) => [
                    styles.checkbox,
                    { borderColor: colors.primary },
                    goal.isCompleted && { backgroundColor: colors.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {goal.isCompleted && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </Pressable>
                <Text
                  className={`flex-1 ml-3 text-base ${
                    goal.isCompleted ? "text-muted line-through" : "text-foreground"
                  }`}
                >
                  {goal.title}
                </Text>
                <Pressable
                  onPress={() => handleDeleteGoal(goal.id)}
                  style={({ pressed }) => [pressed && { opacity: 0.5 }]}
                >
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}

            {weeklyGoals.length < 10 && (
              <View className="flex-row items-center mt-2">
                <TextInput
                  className="flex-1 bg-surface rounded-xl px-4 py-3 text-foreground"
                  placeholder="添加本周目标..."
                  placeholderTextColor={colors.muted}
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  returnKeyType="done"
                  onSubmitEditing={handleAddGoal}
                />
                <Pressable
                  onPress={handleAddGoal}
                  style={({ pressed }) => [
                    styles.addButton,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              </View>
            )}

            {weeklyGoals.length === 0 && (
              <View className="items-center py-4 bg-surface/50 rounded-xl">
                <Text className="text-muted">暂无本周目标</Text>
              </View>
            )}
          </View>
        )}

        {/* Calendar */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-foreground">
              📅 {viewMode === "week" ? "本周日历" : "月历"}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                onPress={viewMode === "week" ? handlePrevWeek : handlePrevMonth}
                style={({ pressed }) => [
                  styles.navButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={viewMode === "week" ? handleNextWeek : handleNextMonth}
                style={({ pressed }) => [
                  styles.navButton,
                  { backgroundColor: colors.surface, marginLeft: 8 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View className="bg-surface rounded-2xl p-4">
            {/* Weekday headers */}
            <View className="flex-row justify-between mb-2">
              {WEEKDAY_NAMES.map((name) => (
                <View key={name} className="flex-1 items-center">
                  <Text className="text-muted text-sm">{name}</Text>
                </View>
              ))}
            </View>

            {/* Week view */}
            {viewMode === "week" && (
              <View className="flex-row justify-between">
                {weekDays.map((date) => (
                  <View key={date} className="flex-1">
                    {renderDayCell(date)}
                  </View>
                ))}
              </View>
            )}

            {/* Month view */}
            {viewMode === "month" && (
              <View>
                {monthWeeks.map((week, weekIndex) => (
                  <View key={weekIndex} className="flex-row justify-between">
                    {week.map((date, dayIndex) => (
                      <View key={dayIndex} className="flex-1">
                        {renderDayCell(date, true)}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Selected Day Details */}
          {selectedDate && (
            <View className="mt-4 bg-surface rounded-xl p-4">
              <Text className="text-base font-semibold text-foreground mb-3">
                {new Date(selectedDate).toLocaleDateString("zh-CN", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </Text>
              {(() => {
                const tasks = getTasksByDate(selectedDate).filter((t) => t.isCompleted);
                const sessions = getSessionsByDate(selectedDate);
                const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
                const avgEnergy =
                  sessions.filter((s) => s.energyScore).length > 0
                    ? (
                        sessions
                          .filter((s) => s.energyScore)
                          .reduce((sum, s) => sum + (s.energyScore || 0), 0) /
                        sessions.filter((s) => s.energyScore).length
                      ).toFixed(1)
                    : "-";

                // Group sessions by hour
                const sessionsByHour: { [hour: number]: typeof sessions } = {};
                sessions.forEach((s) => {
                  const hour = new Date(s.startAt).getHours();
                  if (!sessionsByHour[hour]) sessionsByHour[hour] = [];
                  sessionsByHour[hour].push(s);
                });
                const sortedHours = Object.keys(sessionsByHour).map(Number).sort((a, b) => a - b);

                return (
                  <>
                    {/* Stats Row - Numbers on top, labels below */}
                    <View className="flex-row justify-around mb-4">
                      <View className="items-center flex-1">
                        <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
                          {tasks.length}
                        </Text>
                        <Text className="text-muted text-xs mt-1">完成任务</Text>
                      </View>
                      <View className="items-center flex-1">
                        <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
                          {sessions.length}
                        </Text>
                        <Text className="text-muted text-xs mt-1">番茄次数</Text>
                      </View>
                      <View className="items-center flex-1">
                        <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
                          {totalMinutes}
                        </Text>
                        <Text className="text-muted text-xs mt-1">专注分钟</Text>
                      </View>
                      <View className="items-center flex-1">
                        <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
                          {avgEnergy}
                        </Text>
                        <Text className="text-muted text-xs mt-1">平均精力</Text>
                      </View>
                    </View>

                    {/* Hourly Timeline */}
                    {sortedHours.length > 0 && (
                      <View className="mt-2 pt-3 border-t border-border">
                        <View className="flex-row items-center mb-3">
                          <RNImage
                            source={require("@/assets/images/icon.png")}
                            style={{ width: 16, height: 16, marginRight: 6, borderRadius: 3 }}
                          />
                          <Text className="text-sm font-medium text-foreground">番茄时间分布</Text>
                        </View>
                        {sortedHours.map((hour) => (
                          <View key={hour} className="flex-row items-center mb-2">
                            <Text className="text-muted text-sm w-12">
                              {String(hour).padStart(2, '0')}:00
                            </Text>
                            <View className="flex-1 flex-row flex-wrap ml-2">
                              {sessionsByHour[hour].map((s, i) => (
                                <View
                                  key={s.id}
                                  className="rounded-full px-2 py-1 mr-1 mb-1"
                                  style={{ backgroundColor: colors.primary + '20' }}
                                >
                                  <Text className="text-xs" style={{ color: colors.primary }}>
                                    {s.durationMinutes}分钟 {s.energyScore ? `· 精力${s.energyScore}` : ''}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Completed Tasks */}
                    {tasks.length > 0 && (
                      <View className="mt-3 pt-3 border-t border-border">
                        <Text className="text-sm font-medium text-foreground mb-2">✅ 完成的任务</Text>
                        {tasks.map((task) => (
                          <Text key={task.id} className="text-muted text-sm mb-1">
                            • {task.title}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Empty State */}
                    {sessions.length === 0 && tasks.length === 0 && (
                      <View className="items-center py-4">
                        <Text className="text-muted text-sm">这一天还没有记录</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Generate Summary - Only show in week view */}
        {viewMode === "week" && (
          <>
            <Pressable
              onPress={() => setShowSummary(true)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text className="text-white font-semibold ml-2">生成本周成果</Text>
            </Pressable>

            {/* Weekly Reflection */}
            <Pressable
              onPress={() => setShowReflection(true)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.surface, marginTop: 12 },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="create-outline" size={20} color={colors.foreground} />
              <Text className="text-foreground font-semibold ml-2">本周反思</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.muted}
                style={{ marginLeft: "auto" }}
              />
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Summary Modal */}
      <Modal
        visible={showSummary}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            <Text className="text-xl font-bold text-foreground mb-4">
              📊 本周成果
            </Text>
            <View className="bg-surface rounded-xl p-4 mb-4">
              <Text className="text-foreground" style={{ lineHeight: 24 }}>
                {generateSummary()}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowSummary(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-foreground font-medium">关闭</Text>
              </Pressable>
              <Pressable
                onPress={handleCopySummary}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.primary, flex: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-white font-semibold">复制</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  generateShareImage();
                  setShowSummary(false);
                }}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.primary, flex: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-white font-semibold">分享</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reflection Modal */}
      <Modal
        visible={showReflection}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReflection(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background, maxHeight: "80%" },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold text-foreground mb-4">
                📝 本周反思
              </Text>

              {/* Top 3 Achievements */}
              <Text className="text-base font-semibold text-foreground mb-2">
                🏆 本周三大成就
              </Text>
              {reflectionForm.top3Achievements.map((item, index) => (
                <TextInput
                  key={`achievement-${index}`}
                  className="bg-surface rounded-xl px-4 py-3 text-foreground mb-2"
                  placeholder={`成就 ${index + 1}`}
                  placeholderTextColor={colors.muted}
                  value={item}
                  onChangeText={(text) => {
                    const newAchievements = [...reflectionForm.top3Achievements];
                    newAchievements[index] = text;
                    setReflectionForm({ ...reflectionForm, top3Achievements: newAchievements });
                  }}
                />
              ))}

              {/* Gratitude */}
              <Text className="text-base font-semibold text-foreground mb-2 mt-4">
                🙏 感恩三件事
              </Text>
              {reflectionForm.gratitude3.map((item, index) => (
                <TextInput
                  key={`gratitude-${index}`}
                  className="bg-surface rounded-xl px-4 py-3 text-foreground mb-2"
                  placeholder={`感恩 ${index + 1}`}
                  placeholderTextColor={colors.muted}
                  value={item}
                  onChangeText={(text) => {
                    const newGratitude = [...reflectionForm.gratitude3];
                    newGratitude[index] = text;
                    setReflectionForm({ ...reflectionForm, gratitude3: newGratitude });
                  }}
                />
              ))}

              {/* Distractions */}
              <Text className="text-base font-semibold text-foreground mb-2 mt-4">
                ⚠️ 主要干扰因素
              </Text>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-foreground mb-4"
                placeholder="什么事情分散了你的注意力？"
                placeholderTextColor={colors.muted}
                value={reflectionForm.distractions[0]}
                onChangeText={(text) => {
                  setReflectionForm({ ...reflectionForm, distractions: [text] });
                }}
                multiline
              />

              {/* Actions */}
              <View className="flex-row gap-3 mt-2">
                <Pressable
                  onPress={() => setShowReflection(false)}
                  style={({ pressed }) => [
                    styles.modalButton,
                    { backgroundColor: colors.surface },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text className="text-foreground font-medium">取消</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveReflection}
                  style={({ pressed }) => [
                    styles.modalButton,
                    { backgroundColor: colors.primary, flex: 1 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text className="text-white font-semibold">保存</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginHorizontal: 2,
  },
  monthDayCell: {
    aspectRatio: 1,
    marginVertical: 2,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
