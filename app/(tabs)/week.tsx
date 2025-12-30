import { useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useStore, getWeekStartDate, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { TodoTask, PomodoroSession, WeeklyReflection } from "@/lib/types";

// Get week days
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

const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

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
  const [reflectionForm, setReflectionForm] = useState({
    top3Achievements: ["", "", ""],
    gratitude3: ["", "", ""],
    distractions: [""],
  });

  const weekStartDate = getWeekStartDate();
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const today = getToday();

  const weeklyGoals = useMemo(() => getCurrentWeekGoals(), [state.weeklyGoals]);
  const weekSessions = useMemo(
    () => getWeekSessions(weekStartDate),
    [state.sessions, weekStartDate]
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
      weekStartDate,
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
      weekStartDate,
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
🍅 番茄次数: ${weekStats.pomodoroCount} 个
⏱️ 专注时长: ${weekStats.focusMinutes} 分钟

🏆 本周重要完成事项:
${top3Tasks.length > 0 ? top3Tasks.map((t, i) => `${i + 1}. ${t.title}`).join("\n") : "暂无"}

📅 ${weekStartDate} ~ ${weekDays[6]}`;
  };

  const handleCopySummary = async () => {
    const summary = generateSummary();
    await Clipboard.setStringAsync(summary);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSummary(false);
  };

  if (state.isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载中...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-3xl font-bold text-foreground">本周</Text>
          <Text className="text-muted mt-1">
            {weekStartDate} ~ {weekDays[6]}
          </Text>
        </View>

        {/* Weekly Goals */}
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
                  <IconSymbol name="checkmark" size={16} color="#fff" />
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
                <IconSymbol name="trash.fill" size={20} color={colors.error} />
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
                <IconSymbol name="plus" size={24} color="#fff" />
              </Pressable>
            </View>
          )}

          {weeklyGoals.length === 0 && (
            <View className="items-center py-4 bg-surface/50 rounded-xl">
              <Text className="text-muted">暂无本周目标</Text>
            </View>
          )}
        </View>

        {/* Week Calendar */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            📅 本周日历
          </Text>
          <View className="bg-surface rounded-2xl p-4">
            <View className="flex-row justify-between mb-2">
              {WEEKDAY_NAMES.map((name, index) => (
                <View key={name} className="flex-1 items-center">
                  <Text className="text-muted text-sm">{name}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row justify-between">
              {weekDays.map((date, index) => {
                const stats = getDayStats(date);
                const isToday = date === today;
                const isSelected = date === selectedDate;
                const dayNum = new Date(date).getDate();

                return (
                  <Pressable
                    key={date}
                    onPress={() => setSelectedDate(isSelected ? null : date)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      isToday && { borderColor: colors.primary, borderWidth: 2 },
                      isSelected && { backgroundColor: colors.primary },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      className={`text-base font-medium ${
                        isSelected ? "text-white" : "text-foreground"
                      }`}
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
              })}
            </View>
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

                return (
                  <>
                    <View className="flex-row justify-between mb-3">
                      <Text className="text-muted">完成任务</Text>
                      <Text className="text-foreground font-medium">
                        {tasks.length} 项
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-3">
                      <Text className="text-muted">番茄次数</Text>
                      <Text className="text-foreground font-medium">
                        {sessions.length} 个
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-3">
                      <Text className="text-muted">专注时长</Text>
                      <Text className="text-foreground font-medium">
                        {totalMinutes} 分钟
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-muted">平均精力</Text>
                      <Text className="text-foreground font-medium">{avgEnergy}</Text>
                    </View>
                    {tasks.length > 0 && (
                      <View className="mt-4 pt-3 border-t border-border">
                        <Text className="text-sm text-muted mb-2">完成的任务:</Text>
                        {tasks.map((task) => (
                          <Text key={task.id} className="text-foreground text-sm mb-1">
                            ✓ {task.title}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Generate Summary */}
        <Pressable
          onPress={() => setShowSummary(true)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <IconSymbol name="doc.on.doc" size={20} color="#fff" />
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
          <IconSymbol name="pencil" size={20} color={colors.foreground} />
          <Text className="text-foreground font-semibold ml-2">本周反思</Text>
          <IconSymbol
            name="chevron.right"
            size={20}
            color={colors.muted}
            style={{ marginLeft: "auto" }}
          />
        </Pressable>
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
              <Text className="text-xl font-bold text-foreground mb-2">
                📝 本周反思
              </Text>
              <Text className="text-muted mb-4">
                本周专注时间: {weekStats.focusMinutes} 分钟
              </Text>

              <Text className="text-foreground font-medium mb-2">
                本周完成的最重要三件事
              </Text>
              {reflectionForm.top3Achievements.map((item, index) => (
                <TextInput
                  key={`top3-${index}`}
                  className="bg-surface rounded-xl px-4 py-3 text-foreground mb-2"
                  placeholder={`第 ${index + 1} 件事...`}
                  placeholderTextColor={colors.muted}
                  value={item}
                  onChangeText={(text) => {
                    const newArr = [...reflectionForm.top3Achievements];
                    newArr[index] = text;
                    setReflectionForm({ ...reflectionForm, top3Achievements: newArr });
                  }}
                />
              ))}

              <Text className="text-foreground font-medium mb-2 mt-4">
                本周感恩的三件事
              </Text>
              {reflectionForm.gratitude3.map((item, index) => (
                <TextInput
                  key={`gratitude-${index}`}
                  className="bg-surface rounded-xl px-4 py-3 text-foreground mb-2"
                  placeholder={`感恩 ${index + 1}...`}
                  placeholderTextColor={colors.muted}
                  value={item}
                  onChangeText={(text) => {
                    const newArr = [...reflectionForm.gratitude3];
                    newArr[index] = text;
                    setReflectionForm({ ...reflectionForm, gratitude3: newArr });
                  }}
                />
              ))}

              <Text className="text-foreground font-medium mb-2 mt-4">
                本周干扰因素
              </Text>
              {reflectionForm.distractions.map((item, index) => (
                <View key={`distraction-${index}`} className="flex-row items-center mb-2">
                  <TextInput
                    className="flex-1 bg-surface rounded-xl px-4 py-3 text-foreground"
                    placeholder="干扰因素..."
                    placeholderTextColor={colors.muted}
                    value={item}
                    onChangeText={(text) => {
                      const newArr = [...reflectionForm.distractions];
                      newArr[index] = text;
                      setReflectionForm({ ...reflectionForm, distractions: newArr });
                    }}
                  />
                  {index === reflectionForm.distractions.length - 1 && (
                    <Pressable
                      onPress={() =>
                        setReflectionForm({
                          ...reflectionForm,
                          distractions: [...reflectionForm.distractions, ""],
                        })
                      }
                      style={({ pressed }) => [
                        styles.smallAddButton,
                        { backgroundColor: colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <IconSymbol name="plus" size={20} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>

            <View className="flex-row gap-3 mt-4">
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
  smallAddButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
