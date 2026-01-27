import { useState, useCallback } from 'react';
import { habitRepositorySQLite } from '../repositories/HabitRepositorySQLite';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';

interface DayProgress {
  date: string;
  label: string;
  completed: number;
  total: number;
  percentage: number;
}

interface WeekProgress {
  week: string;
  label: string;
  completed: number;
  total: number;
  percentage: number;
}

export const useAnalytics = () => {
  const [dailyProgress, setDailyProgress] = useState<DayProgress[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<DayProgress[]>([]);
  const [monthlyProgress, setMonthlyProgress] = useState<WeekProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      console.log('useAnalytics: Loading analytics...');
      setLoading(true);

      const today = new Date();

      // Calculate Daily Progress (last 7 days)
      const last7Days = eachDayOfInterval({
        start: subDays(today, 6),
        end: today,
      });

      const dailyData: DayProgress[] = [];
      for (const day of last7Days) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const stats = await habitRepositorySQLite.getDailyStatsForDateRange(
          dateStr,
          dateStr,
          'daily'
        );

        const dayData = stats.length > 0 ? stats[0] : { completed: 0, total: 0 };
        
        dailyData.push({
          date: dateStr,
          label: format(day, 'EEE'),
          completed: dayData.completed || 0,
          total: dayData.total || 0,
          percentage: dayData.total > 0 
            ? Math.round((dayData.completed / dayData.total) * 100) 
            : 0,
        });
      }

      console.log('useAnalytics: Daily progress:', dailyData);
      setDailyProgress(dailyData);
      setWeeklyProgress(dailyData);

      // Calculate Monthly Progress (weeks in current month)
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      
      const weeks = eachWeekOfInterval(
        { start: monthStart, end: monthEnd },
        { weekStartsOn: 0 }
      );

      const monthlyData: WeekProgress[] = [];
      for (let i = 0; i < weeks.length; i++) {
        const weekStart = weeks[i];
        const weekEnd = i < weeks.length - 1 ? subDays(weeks[i + 1], 1) : monthEnd;
        
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        const stats = await habitRepositorySQLite.getDailyStatsForDateRange(
          weekStartStr,
          weekEndStr,
          'daily'
        );

        let totalCompleted = 0;
        let totalPossible = 0;

        stats.forEach(day => {
          totalCompleted += day.completed || 0;
          totalPossible += day.total || 0;
        });

        monthlyData.push({
          week: `Week ${i + 1}`,
          label: `W${i + 1}`,
          completed: totalCompleted,
          total: totalPossible,
          percentage: totalPossible > 0 
            ? Math.round((totalCompleted / totalPossible) * 100) 
            : 0,
        });
      }

      console.log('useAnalytics: Monthly progress:', monthlyData);
      setMonthlyProgress(monthlyData);

    } catch (error) {
      console.error('useAnalytics: Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dailyProgress,
    weeklyProgress,
    monthlyProgress,
    loading,
    loadAnalytics,
  };
};