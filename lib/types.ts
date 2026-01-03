// 数据模型类型定义 - 固定结构，不可重构

export interface TodoTask {
  id: string;
  title: string;
  isCompleted: boolean;
  isTop3: boolean;
  createdAt: string;
  completedAt: string | null;
  date: string; // YYYY-MM-DD
}

export interface PomodoroSession {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  energyScore: number | null; // 1-5
  energyTag: string | null; // 高能/平稳/低能/疲惫/心流
}

export interface WeeklyGoal {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  weekStartDate: string;
  notes?: string;
}

export interface WeeklyReflection {
  id: string;
  weekStartDate: string;
  focusMinutesAuto: number;
  top3Achievements: string[];
  gratitude3: string[];
  distractions: string[];
  createdAt: string;
}

export interface YearGoal {
  id: string;
  title: string;
  category?: string;
  progress: number; // 0-100
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface AppSettings {
  defaultPomodoroMinutes: number;
  maxPomodoroMinutes: number;
  voiceEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  mission?: string;
  vision?: string;
  userName?: string;
  userAvatar?: string; // Base64 or image URI
}

export const ENERGY_TAGS = ['高能', '平稳', '低能', '疲惫', '心流'] as const;
export type EnergyTag = typeof ENERGY_TAGS[number];

// 默认设置
export const DEFAULT_SETTINGS: AppSettings = {
  defaultPomodoroMinutes: 25,
  maxPomodoroMinutes: 60,
  voiceEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
};
