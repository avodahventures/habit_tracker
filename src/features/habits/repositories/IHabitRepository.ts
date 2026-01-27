import { Habit, CreateHabitInput, UpdateHabitInput } from '../../../core/models/Habit';
import { DailyHabitLog } from '../../../core/models/DailyHabitLog';

export interface IHabitRepository {
  getAllHabits(): Promise<Habit[]>;
  getHabitById(id: string): Promise<Habit | null>;
  createHabit(input: CreateHabitInput): Promise<Habit>;
  updateHabit(id: string, input: UpdateHabitInput): Promise<Habit>;
  deleteHabit(id: string): Promise<void>;
  getDailyLog(habitId: string, date: string): Promise<DailyHabitLog | null>;
  getDailyLogsForDate(date: string): Promise<DailyHabitLog[]>;
  toggleHabitCompletion(habitId: string, date: string): Promise<DailyHabitLog>;
}