export interface DailyHabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateDailyHabitLogInput = {
  habitId: string;
  date: string;
  completed: boolean;
};