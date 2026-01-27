import { Habit } from '../../../core/models/Habit';
import { habitRepositorySQLite } from '../repositories/HabitRepositorySQLite';

export interface DailyStats {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface MonthlyStats {
  date: string;
  month: string;
  year: number;
  completed: number;
  total: number;
  percentage: number;
}

export class AnalyticsService {
  /**
   * Get daily completion stats for the last N days
   */
  async getDailyStats(days: number): Promise<DailyStats[]> {
    const stats: DailyStats[] = [];
    const habits = await habitRepositorySQLite.getHabitsByFrequency('daily');
    const totalDailyHabits = habits.length;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const logs = await habitRepositorySQLite.getDailyLogsForDate(dateStr);
      const dailyLogs = logs.filter(log => 
        habits.some(habit => habit.id === log.habitId)
      );

      const completed = dailyLogs.filter(l => l.completed).length;
      const percentage = totalDailyHabits > 0 
        ? Math.round((completed / totalDailyHabits) * 100) 
        : 0;

      stats.push({
        date: dateStr,
        completed,
        total: totalDailyHabits,
        percentage,
      });
    }

    return stats;
  }

  /**
   * Get weekly completion stats using SQL aggregation
   */
  async getWeeklyStats(weeks: number): Promise<WeeklyStats[]> {
    const habits = await habitRepositorySQLite.getHabitsByFrequency('weekly');
    const totalWeeklyHabits = habits.length;
    const stats: WeeklyStats[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const logs = await habitRepositorySQLite.getLogsForDateRange(weekStartStr, weekEndStr);
      const weeklyLogs = logs.filter(l => 
        habits.some(h => h.id === l.habitId)
      );

      const totalCompleted = weeklyLogs.filter(l => l.completed).length;
      const totalPossible = 7 * totalWeeklyHabits;
      const percentage = totalPossible > 0 
        ? Math.round((totalCompleted / totalPossible) * 100) 
        : 0;

      stats.push({
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        completed: totalCompleted,
        total: totalPossible,
        percentage,
      });
    }

    return stats;
  }

  /**
   * Get monthly completion stats
   */
  async getMonthlyStats(months: number): Promise<MonthlyStats[]> {
    const habits = await habitRepositorySQLite.getHabitsByFrequency('monthly');
    const totalMonthlyHabits = habits.length;
    const stats: MonthlyStats[] = [];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, daysInMonth).toISOString().split('T')[0];

      const logs = await habitRepositorySQLite.getLogsForDateRange(startDate, endDate);
      
      // For monthly habits, count unique habit completions (not per day)
      const completedHabitIds = new Set<string>();
      logs.forEach(log => {
        if (log.completed && habits.some(h => h.id === log.habitId)) {
          completedHabitIds.add(log.habitId);
        }
      });

      const totalCompleted = completedHabitIds.size;
      const totalPossible = totalMonthlyHabits;
      const percentage = totalPossible > 0 
        ? Math.round((totalCompleted / totalPossible) * 100) 
        : 0;

      const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];

      stats.push({
        date: firstDayOfMonth,
        month: monthNames[month],
        year,
        completed: totalCompleted,
        total: totalPossible,
        percentage,
      });
    }

    return stats;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();