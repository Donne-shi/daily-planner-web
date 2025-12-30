import { useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useStore, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { TodoTask } from "@/lib/types";

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, addTask, toggleTask, deleteTask, getTodayTasks, getTodaySessions } = useStore();
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const todayTasks = useMemo(() => getTodayTasks(), [state.tasks]);
  const todaySessions = useMemo(() => getTodaySessions(), [state.sessions]);

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const completedSessions = todaySessions.filter((s) => s.isCompleted);
    const totalMinutes = completedSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      pomodoroCount: completedSessions.length,
      focusMinutes: totalMinutes,
    };
  }, [todaySessions]);

  // Separate Top3 and other tasks
  const { top3Tasks, otherTasks } = useMemo(() => {
    const top3 = todayTasks.filter((t) => t.isTop3);
    const others = todayTasks.filter((t) => !t.isTop3);
    return { top3Tasks: top3, otherTasks: others };
  }, [todayTasks]);

  // Empty slots for Top3
  const emptyTop3Slots = Math.max(0, 3 - top3Tasks.length);

  const handleAddTask = (isTop3: boolean) => {
    if (!newTaskTitle.trim()) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    addTask({
      title: newTaskTitle.trim(),
      isCompleted: false,
      isTop3,
      completedAt: null,
      date: getToday(),
    });
    setNewTaskTitle("");
  };

  const handleToggleTask = (taskId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleTask(taskId);
  };

  const handleDeleteTask = (taskId: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    deleteTask(taskId);
  };

  const navigateToFocus = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/focus");
  };

  if (state.isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载中...</Text>
      </ScreenContainer>
    );
  }

  const renderTaskItem = (task: TodoTask) => (
    <View
      key={task.id}
      className="flex-row items-center bg-surface rounded-xl px-4 py-3 mb-2"
    >
      <Pressable
        onPress={() => handleToggleTask(task.id)}
        style={({ pressed }) => [
          styles.checkbox,
          { borderColor: colors.primary },
          task.isCompleted && { backgroundColor: colors.primary },
          pressed && { opacity: 0.7 },
        ]}
      >
        {task.isCompleted && (
          <IconSymbol name="checkmark" size={16} color="#fff" />
        )}
      </Pressable>
      <Text
        className={`flex-1 ml-3 text-base ${
          task.isCompleted ? "text-muted line-through" : "text-foreground"
        }`}
      >
        {task.title}
      </Text>
      {task.isTop3 && (
        <View className="bg-primary/20 px-2 py-1 rounded-full mr-2">
          <Text className="text-primary text-xs font-medium">Top3</Text>
        </View>
      )}
      <Pressable
        onPress={() => handleDeleteTask(task.id)}
        style={({ pressed }) => [pressed && { opacity: 0.5 }]}
      >
        <IconSymbol name="trash.fill" size={20} color={colors.error} />
      </Pressable>
    </View>
  );

  const renderEmptySlot = (index: number) => (
    <View
      key={`empty-${index}`}
      className="flex-row items-center bg-surface/50 rounded-xl px-4 py-3 mb-2 border border-dashed border-border"
    >
      <View style={[styles.checkbox, { borderColor: colors.border }]} />
      <Text className="flex-1 ml-3 text-base text-muted">
        添加第 {top3Tasks.length + index + 1} 件重要事项
      </Text>
    </View>
  );

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-3xl font-bold text-foreground">今日</Text>
          <Text className="text-muted mt-1">
            {new Date().toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </Text>
        </View>

        {/* Top 3 Tasks Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🎯 最重要的三件事
          </Text>
          {top3Tasks.map(renderTaskItem)}
          {Array.from({ length: emptyTop3Slots }).map((_, i) => renderEmptySlot(i))}
          
          {/* Add Top3 Task Input */}
          {top3Tasks.length < 3 && (
            <View className="flex-row items-center mt-2">
              <TextInput
                className="flex-1 bg-surface rounded-xl px-4 py-3 text-foreground"
                placeholder="添加重要任务..."
                placeholderTextColor={colors.muted}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                returnKeyType="done"
                onSubmitEditing={() => handleAddTask(true)}
              />
              <Pressable
                onPress={() => handleAddTask(true)}
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
        </View>

        {/* Other Tasks Section */}
        {(otherTasks.length > 0 || top3Tasks.length >= 3) && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              📋 其他任务
            </Text>
            {otherTasks.map(renderTaskItem)}
            
            {/* Add Other Task Input */}
            <View className="flex-row items-center mt-2">
              <TextInput
                className="flex-1 bg-surface rounded-xl px-4 py-3 text-foreground"
                placeholder="添加其他任务..."
                placeholderTextColor={colors.muted}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                returnKeyType="done"
                onSubmitEditing={() => handleAddTask(false)}
              />
              <Pressable
                onPress={() => handleAddTask(false)}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <IconSymbol name="plus" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Pomodoro Entry */}
        <Pressable
          onPress={navigateToFocus}
          style={({ pressed }) => [
            styles.pomodoroCard,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View className="flex-row items-center">
            <Text className="text-4xl mr-3">🍅</Text>
            <View className="flex-1">
              <Text className="text-white text-lg font-semibold">番茄任务</Text>
              <Text className="text-white/80 text-sm">开始专注，提升效率</Text>
            </View>
            <IconSymbol name="chevron.right" size={24} color="#fff" />
          </View>
        </Pressable>

        {/* Today's Stats */}
        <View className="mt-6 bg-surface rounded-2xl p-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            📊 今日番茄统计
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-3xl font-bold text-primary">
                {todayStats.pomodoroCount}
              </Text>
              <Text className="text-muted text-sm mt-1">番茄次数</Text>
            </View>
            <View className="w-px bg-border" />
            <View className="items-center">
              <Text className="text-3xl font-bold text-primary">
                {todayStats.focusMinutes}
              </Text>
              <Text className="text-muted text-sm mt-1">专注分钟</Text>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {todayTasks.length === 0 && todayStats.pomodoroCount === 0 && (
          <View className="items-center py-8">
            <Text className="text-6xl mb-4">🌟</Text>
            <Text className="text-foreground text-lg font-medium">
              新的一天，新的开始
            </Text>
            <Text className="text-muted text-center mt-2">
              添加你今天最重要的三件事{"\n"}开始高效的一天
            </Text>
          </View>
        )}
      </ScrollView>
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
  pomodoroCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
});
