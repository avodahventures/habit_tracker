import { Habit } from '../../../core/models/Habit';
import { DailyHabitLog } from '../../../core/models/DailyHabitLog';
import { habitRepositorySQLite } from './HabitRepositorySQLite';

export class HabitRepository {
  async getAllHabits(): Promise<Habit[]> {
    return await habitRepositorySQLite.getAllHabits();
  }

  async getHabitById(id: string): Promise<Habit | null> {
    return await habitRepositorySQLite.getHabitById(id);
  }

  async saveHabit(habit: Habit): Promise<void> {
    return await habitRepositorySQLite.saveHabit(habit);
  }

  async deleteHabit(id: string): Promise<void> {
    return await habitRepositorySQLite.deleteHabit(id);
  }

  async getDailyLogsForDate(date: string): Promise<DailyHabitLog[]> {
    return await habitRepositorySQLite.getDailyLogsForDate(date);
  }

  async getHabitsByFrequency(frequency: 'daily' | 'weekly' | 'monthly'): Promise<Habit[]> {
    return await habitRepositorySQLite.getHabitsByFrequency(frequency);
  }
}

// Export singleton instance
export const habitRepository = new HabitRepository();