import { useState, useMemo, useRef } from "react";
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
import Ionicons from "@expo/vector-icons/Ionicons";

import { ScreenContainer } from "@/components/screen-container";
import { useStore, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { TodoTask } from "@/lib/types";

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, addTask, toggleTask, deleteTask, getTodayTasks, getTodaySessions } = useStore();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotInputValue, setSlotInputValue] = useState("");
  const inputRef = useRef<TextInput>(null);

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

  // All tasks for today (no longer separate Top3)
  const allTasks = todayTasks;

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    addTask({
      title: newTaskTitle.trim(),
      isCompleted: false,
      isTop3: false,
      completedAt: null,
      date: getToday(),
    });
    setNewTaskTitle("");
  };

  const handleAddTaskFromSlot = (index: number) => {
    if (!slotInputValue.trim()) {
      setEditingSlotIndex(null);
      return;
    }
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    addTask({
      title: slotInputValue.trim(),
      isCompleted: false,
      isTop3: false,
      completedAt: null,
      date: getToday(),
    });
    setSlotInputValue("");
    setEditingSlotIndex(null);
  };

  const handleSlotPress = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setEditingSlotIndex(index);
    setSlotInputValue("");
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
      className="flex-row items-center bg-surface rounded-2xl px-4 py-4 mb-3"
    >
      <Pressable
        onPress={() => handleToggleTask(task.id)}
        style={({ pressed }) => [
          styles.checkbox,
          { borderColor: task.isCompleted ? colors.primary : colors.border },
          task.isCompleted && { backgroundColor: colors.primary, borderColor: colors.primary },
          pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
        ]}
      >
        {task.isCompleted && (
          <Ionicons name="checkmark" size={14} color="#fff" />
        )}
      </Pressable>
      <Text
        className={`flex-1 ml-3 text-base ${
          task.isCompleted ? "text-muted line-through" : "text-foreground"
        }`}
      >
        {task.title}
      </Text>
      <Pressable
        onPress={() => handleDeleteTask(task.id)}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && { opacity: 0.5, transform: [{ scale: 0.9 }] }
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );

  const renderEmptySlot = (index: number) => {
    const isEditing = editingSlotIndex === index;
    
    if (isEditing) {
      return (
        <View
          key={`empty-${index}`}
          className="flex-row items-center bg-surface rounded-2xl px-4 py-4 mb-3"
        >
          <View style={[styles.checkbox, { borderColor: colors.border }]} />
          <TextInput
            ref={inputRef}
            className="flex-1 ml-3 text-base text-foreground"
            placeholder={`输入第 ${allTasks.length + index + 1} 件事项`}
            placeholderTextColor={colors.muted}
            value={slotInputValue}
            onChangeText={setSlotInputValue}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => handleAddTaskFromSlot(index)}
            onBlur={() => {
              if (!slotInputValue.trim()) {
                setEditingSlotIndex(null);
              }
            }}
          />
          <Pressable
            onPress={() => handleAddTaskFromSlot(index)}
            style={({ pressed }) => [
              styles.slotConfirmButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </Pressable>
        </View>
      );
    }
    
    return (
      <Pressable
        key={`empty-${index}`}
        onPress={() => handleSlotPress(index)}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <View className="flex-row items-center bg-surface/30 rounded-2xl px-4 py-4 mb-3 border border-dashed border-border/50">
          <View style={[styles.checkbox, { borderColor: colors.border, borderStyle: 'dashed' }]} />
          <Text className="flex-1 ml-3 text-base text-muted">
            添加第 {allTasks.length + index + 1} 件事项
          </Text>
        </View>
      </Pressable>
    );
  };

  // Calculate empty slots (show 3 empty slots if less than 3 tasks)
  const emptySlotCount = Math.max(0, 3 - allTasks.length);

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

        {/* Today's Tasks Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
            </View>
            <Text className="text-lg font-semibold text-foreground ml-2">
              今日待办事项
            </Text>
          </View>
          {allTasks.map(renderTaskItem)}
          {Array.from({ length: emptySlotCount }).map((_, i) => renderEmptySlot(i))}
          
          {/* Add Task Input */}
          <View className="flex-row items-center mt-2">
            <TextInput
              className="flex-1 bg-surface rounded-2xl px-4 py-3.5 text-foreground"
              placeholder="添加任务，点击对勾"
              placeholderTextColor={colors.muted}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              returnKeyType="done"
              onSubmitEditing={handleAddTask}
            />
            <Pressable
              onPress={handleAddTask}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons name="checkmark" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Pomodoro Entry */}
        <Pressable
          onPress={navigateToFocus}
          style={({ pressed }) => [
            styles.pomodoroCard,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View className="flex-row items-center">
            <View style={styles.pomodoroIcon}>
              <Ionicons name="timer-outline" size={28} color="#fff" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white text-lg font-semibold">番茄专注</Text>
              <Text className="text-white/70 text-sm">开始专注，提升效率</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </View>
        </Pressable>

        {/* Today's Stats */}
        <View className="mt-6 bg-surface rounded-2xl p-5">
          <View className="flex-row items-center mb-4">
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="analytics-outline" size={18} color={colors.primary} />
            </View>
            <Text className="text-lg font-semibold text-foreground ml-2">
              今日番茄统计
            </Text>
          </View>
          <View className="flex-row justify-around">
            <View className="items-center flex-1">
              <Text className="text-3xl font-bold text-primary">
                {todayStats.pomodoroCount}
              </Text>
              <Text className="text-muted text-sm mt-1">番茄次数</Text>
            </View>
            <View className="w-px bg-border/50 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-3xl font-bold text-primary">
                {todayStats.focusMinutes}
              </Text>
              <Text className="text-muted text-sm mt-1">专注分钟</Text>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {allTasks.length === 0 && todayStats.pomodoroCount === 0 && (
          <View className="items-center py-10 mt-4">
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="sunny-outline" size={40} color={colors.primary} />
            </View>
            <Text className="text-foreground text-lg font-medium mt-4">
              新的一天，新的开始
            </Text>
            <Text className="text-muted text-center mt-2">
              点击上方空白项添加任务{"\n"}开始高效的一天
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  slotConfirmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  pomodoroCard: {
    borderRadius: 20,
    padding: 18,
  },
  pomodoroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
