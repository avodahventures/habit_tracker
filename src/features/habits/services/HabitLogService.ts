import { DailyHabitLog } from '../../../core/models/DailyHabitLog';
import { habitRepositorySQLite } from '../repositories/HabitRepositorySQLite';

export class HabitLogService {
  async getAllLogs(): Promise<DailyHabitLog[]> {
    const startDate = '2020-01-01'; // Get all logs from 2020 onwards
    const endDate = new Date().toISOString().split('T')[0];
    return await habitRepositorySQLite.getLogsForDateRange(startDate, endDate);
  }

  async getLogsForDate(date: string): Promise<DailyHabitLog[]> {
    return await habitRepositorySQLite.getDailyLogsForDate(date);
  }

  async logCompletion(habitId: string, date: string): Promise<void> {
    const now = new Date().toISOString();
    
    const log: DailyHabitLog = {
      id: `log_${Date.now()}_${habitId}`,
      habitId,
      date,
      completed: true,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await habitRepositorySQLite.saveLog(log);
  }

  async deleteLog(habitId: string, date: string): Promise<void> {
    await habitRepositorySQLite.deleteLog(habitId, date);
  }

  async getLogsForHabit(habitId: string): Promise<DailyHabitLog[]> {
    return await habitRepositorySQLite.getLogsForHabit(habitId);
  }

  async getLogsForDateRange(
    startDate: string,
    endDate: string
  ): Promise<DailyHabitLog[]> {
    return await habitRepositorySQLite.getLogsForDateRange(startDate, endDate);
  }
}

// Export singleton instance
export const habitLogService = new HabitLogService();