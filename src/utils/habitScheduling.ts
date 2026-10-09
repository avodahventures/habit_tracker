import { Habit } from '../database/database';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

export function isHabitScheduledToday(habit: Habit): boolean {
  if (!habit.frequency || habit.frequency === 'daily') {
    return true;
  }
  if (habit.frequency === 'weekly') {
    if (!habit.weekday || habit.weekday === 'Any weekday') {
      return true;
    }
    const todayName = WEEKDAY_NAMES[new Date().getDay()];
    return todayName === habit.weekday;
  }
  return true;
}

export interface WeeklyToggleInfo {
  frequency: string;
  weekday?: string;
  completedThisWeek: boolean;
  isScheduledToday: boolean;
}

export function canToggleWeeklyHabit(habit: WeeklyToggleInfo): boolean {
  if (habit.frequency !== 'weekly') {
    return true;
  }
  if (!habit.weekday || habit.weekday === 'Any weekday') {
    return !habit.completedThisWeek;
  }
  return habit.isScheduledToday;
}
