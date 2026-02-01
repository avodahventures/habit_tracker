import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { db, Habit } from '../database/database';
import { useTheme } from '../context/ThemeContext';

interface HabitWithStats extends Habit {
  streak: number;
  totalCompleted: number;
  completedToday: boolean;
}

interface Stats {
  total: number;
  completed: number;
  percentage: number;
}

interface WeekData {
  habitId: number;
  habitName: string;
  days: boolean[]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
}

type TimeFrame = '7days' | '30days' | '12months';

export function DashboardScreen() {
  const { currentTheme } = useTheme();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [todayStats, setTodayStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('7days');
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getLastSunday(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [monthData, setMonthData] = useState<Map<number, boolean[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to get last Sunday
  function getLastSunday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Helper function to format date
  function formatDate(date: Date, format: 'short' | 'full' = 'short'): string {
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Helper function to check if two dates are the same week
  function isSameWeek(date1: Date, date2: Date): boolean {
    const sunday1 = getLastSunday(date1);
    const sunday2 = getLastSunday(date2);
    return sunday1.toDateString() === sunday2.toDateString();
  }

  // Helper function to get first day of month
  function getFirstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  // Helper function to get last day of month
  function getLastDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  // Helper function to get days in month
  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  // Helper function to get month name
  function getMonthName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const allHabits = await db.getHabits();
      const logs = await db.getTodayLogs();

      const logsMap: Record<number, number> = {};
      logs.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

      const habitsWithStats = await Promise.all(
        allHabits.map(async (habit) => {
          const stats = await db.getHabitStats(habit.id);
          return {
            ...habit,
            streak: stats.currentStreak,
            totalCompleted: stats.totalCompleted,
            completedToday: logsMap[habit.id] === 1,
          };
        })
      );

      setHabits(habitsWithStats);

      const total = habitsWithStats.length;
      const completed = habitsWithStats.filter(h => h.completedToday).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      setTodayStats({ total, completed, percentage });

      // Load week data for grid view
      await loadWeekData(habitsWithStats, selectedWeekStart);
      
      // Load month data for calendar view
      await loadMonthData(habitsWithStats, selectedMonth);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async (habits: HabitWithStats[], weekStart: Date) => {
    const weekDataArray: WeekData[] = [];

    for (const habit of habits) {
      const days = [false, false, false, false, false, false, false];

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
        if (logs.length > 0 && logs[0].completed) {
          days[i] = true;
        }
      }

      weekDataArray.push({
        habitId: habit.id,
        habitName: habit.name,
        days,
      });
    }

    setWeekData(weekDataArray);
  };

  const loadMonthData = async (habits: HabitWithStats[], monthDate: Date) => {
    const monthDataMap = new Map<number, boolean[]>();
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDay = getFirstDayOfMonth(monthDate);

    for (const habit of habits) {
      const days = new Array(daysInMonth).fill(false);

      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(firstDay);
        date.setDate(i + 1);
        const dateStr = date.toISOString().split('T')[0];

        const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
        if (logs.length > 0 && logs[0].completed) {
          days[i] = true;
        }
      }

      monthDataMap.set(habit.id, days);
    }

    setMonthData(monthDataMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [selectedWeekStart, selectedMonth])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(selectedWeekStart);
    if (direction === 'prev') {
      newWeekStart.setDate(selectedWeekStart.getDate() - 7);
    } else {
      newWeekStart.setDate(selectedWeekStart.getDate() + 7);
    }
    setSelectedWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    setSelectedWeekStart(getLastSunday(new Date()));
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(selectedMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(selectedMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const renderWeekSelector = () => {
    const weekEnd = new Date(selectedWeekStart);
    weekEnd.setDate(selectedWeekStart.getDate() + 6);
    const isCurrentWeek = isSameWeek(selectedWeekStart, new Date());

    return (
      <View style={styles.weekSelectorContainer}>
        <TouchableOpacity
          style={[styles.weekButton, { backgroundColor: currentTheme.cardBackground }]}
          onPress={() => changeWeek('prev')}
        >
          <Text style={[styles.weekButtonText, { color: currentTheme.textPrimary }]}>←</Text>
        </TouchableOpacity>

        <View style={[styles.weekDisplay, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.weekText, { color: currentTheme.textPrimary }]}>
            {formatDate(selectedWeekStart)} - {formatDate(weekEnd)}
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity onPress={goToCurrentWeek}>
              <Text style={[styles.todayButton, { color: currentTheme.accent }]}>
                Today
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.weekButton, { backgroundColor: currentTheme.cardBackground }]}
          onPress={() => changeWeek('next')}
        >
          <Text style={[styles.weekButtonText, { color: currentTheme.textPrimary }]}>→</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWeekGrid = () => {
    if (habits.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No habits to track yet.{'\n'}Add some habits in Settings to get started!
          </Text>
        </View>
      );
    }

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dayDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(selectedWeekStart);
      date.setDate(selectedWeekStart.getDate() + i);
      return date.getDate();
    });

    return (
      <View style={styles.gridContainer}>
        {/* Header Row */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCell, styles.headerCell, styles.habitNameCell]}>
            <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>
              Habit
            </Text>
          </View>
          {dayLabels.map((day, index) => {
            const date = new Date(selectedWeekStart);
            date.setDate(selectedWeekStart.getDate() + index);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <View key={index} style={[styles.gridCell, styles.headerCell, styles.dayCell]}>
                <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>
                  {day}
                </Text>
                <Text 
                  style={[
                    styles.dateText, 
                    { color: currentTheme.textSecondary },
                    isToday && { 
                      color: currentTheme.accent, 
                      fontWeight: 'bold',
                      backgroundColor: currentTheme.cardBackground,
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }
                  ]}
                >
                  {dayDates[index]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Data Rows */}
        {weekData.map((habit, habitIndex) => (
          <View 
            key={habit.habitId} 
            style={[
              styles.gridRow,
              habitIndex % 2 === 0 && { backgroundColor: currentTheme.cardBackground }
            ]}
          >
            <View style={[styles.gridCell, styles.habitNameCell]}>
              <Text 
                style={[styles.habitText, { color: currentTheme.textPrimary }]}
                numberOfLines={2}
              >
                {habit.habitName}
              </Text>
            </View>
            {habit.days.map((completed, dayIndex) => (
              <View key={dayIndex} style={[styles.gridCell, styles.dayCell]}>
                <View style={[
                  styles.checkbox,
                  { borderColor: currentTheme.accent },
                  completed && { backgroundColor: currentTheme.accent }
                ]}>
                  {completed && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const render30DaysView = () => {
    if (habits.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No habits to track yet.{'\n'}Add some habits in Settings to get started!
          </Text>
        </View>
      );
    }

    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const isCurrentMonth = selectedMonth.getMonth() === new Date().getMonth() && 
                          selectedMonth.getFullYear() === new Date().getFullYear();

    // Create array of day numbers
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Add empty cells for days before month starts
    const leadingEmptyCells = Array.from({ length: startingDayOfWeek }, () => null);
    const fullCalendar = [...leadingEmptyCells, ...calendarDays];

    return (
      <View>
        {/* Month Selector */}
        <View style={styles.monthSelectorContainer}>
          <TouchableOpacity
            style={[styles.monthButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => changeMonth('prev')}
          >
            <Text style={[styles.monthButtonText, { color: currentTheme.textPrimary }]}>←</Text>
          </TouchableOpacity>

          <View style={[styles.monthDisplay, { backgroundColor: currentTheme.cardBackground }]}>
            <Text style={[styles.monthText, { color: currentTheme.textPrimary }]}>
              {getMonthName(selectedMonth)}
            </Text>
            {!isCurrentMonth && (
              <TouchableOpacity onPress={goToCurrentMonth}>
                <Text style={[styles.todayButton, { color: currentTheme.accent }]}>
                  This Month
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.monthButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => changeMonth('next')}
          >
            <Text style={[styles.monthButtonText, { color: currentTheme.textPrimary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid for Each Habit */}
        {habits.map((habit, habitIndex) => {
          const habitDays = monthData.get(habit.id) || [];
          const completedCount = habitDays.filter(Boolean).length;
          const completionRate = daysInMonth > 0 ? Math.round((completedCount / daysInMonth) * 100) : 0;

          return (
            <View 
              key={habit.id} 
              style={[
                styles.habitCalendarCard, 
                { backgroundColor: currentTheme.cardBackground }
              ]}
            >
              {/* Habit Header */}
              <View style={styles.habitCalendarHeader}>
                <Text style={[styles.habitCalendarTitle, { color: currentTheme.textPrimary }]}>
                  {habit.name}
                </Text>
                <View style={styles.habitStats}>
                  <Text style={[styles.habitStatsText, { color: currentTheme.accent }]}>
                    {completedCount}/{daysInMonth} days
                  </Text>
                  <Text style={[styles.habitStatsText, { color: currentTheme.textSecondary }]}>
                    {completionRate}%
                  </Text>
                </View>
              </View>

              {/* Day Labels */}
              <View style={styles.calendarDayLabels}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <View key={index} style={styles.calendarDayLabelCell}>
                    <Text style={[styles.calendarDayLabel, { color: currentTheme.textSecondary }]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {fullCalendar.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.calendarCell} />;
                  }

                  const isCompleted = habitDays[day - 1];
                  const cellDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
                  const isToday = cellDate.toDateString() === new Date().toDateString();
                  const isFuture = cellDate > new Date();

                  return (
                    <View key={day} style={styles.calendarCell}>
                      <View 
                        style={[
                          styles.calendarDay,
                          { borderColor: currentTheme.cardBorder },
                          isCompleted && { 
                            backgroundColor: currentTheme.accent,
                            borderColor: currentTheme.accent 
                          },
                          isToday && !isCompleted && { 
                            borderColor: currentTheme.accent,
                            borderWidth: 2 
                          },
                          isFuture && { opacity: 0.3 }
                        ]}
                      >
                        <Text 
                          style={[
                            styles.calendarDayText,
                            { color: currentTheme.textPrimary },
                            isCompleted && { color: '#FFFFFF', fontWeight: 'bold' }
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const render12MonthsView = () => {
    return (
      <View style={[styles.placeholderView, { backgroundColor: currentTheme.cardBackground }]}>
        <Text style={[styles.placeholderText, { color: currentTheme.textSecondary }]}>
          12 Months view - Coming soon
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={currentTheme.accent}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: currentTheme.textPrimary }]}>
            Dashboard 📊
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Track your spiritual progress
          </Text>
        </View>

        {/* Overall Summary */}
        <View style={[styles.summaryCard, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.summaryTitle, { color: currentTheme.textPrimary }]}>
            Today's Overview
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: currentTheme.accent }]}>
                {todayStats.completed}
              </Text>
              <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>
                Completed
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: currentTheme.accent }]}>
                {todayStats.total}
              </Text>
              <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>
                Total Habits
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: currentTheme.accent }]}>
                {Math.max(...habits.map(h => h.streak), 0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>
                Best Streak
              </Text>
            </View>
          </View>
        </View>

        {/* Habits Progress Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
            Habits Progress
          </Text>
          <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
            Total Habits: {habits.length}
          </Text>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: currentTheme.cardBackground },
                timeFrame === '7days' && { backgroundColor: currentTheme.accent },
              ]}
              onPress={() => setTimeFrame('7days')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: currentTheme.textSecondary },
                  timeFrame === '7days' && { color: '#FFFFFF', fontWeight: 'bold' },
                ]}
              >
                7 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: currentTheme.cardBackground },
                timeFrame === '30days' && { backgroundColor: currentTheme.accent },
              ]}
              onPress={() => setTimeFrame('30days')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: currentTheme.textSecondary },
                  timeFrame === '30days' && { color: '#FFFFFF', fontWeight: 'bold' },
                ]}
              >
                30 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: currentTheme.cardBackground },
                timeFrame === '12months' && { backgroundColor: currentTheme.accent },
              ]}
              onPress={() => setTimeFrame('12months')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: currentTheme.textSecondary },
                  timeFrame === '12months' && { color: '#FFFFFF', fontWeight: 'bold' },
                ]}
              >
                12 Months
              </Text>
            </TouchableOpacity>
          </View>

          {/* Week Selector - Only show for 7 days view */}
          {timeFrame === '7days' && renderWeekSelector()}

          {/* Render appropriate view */}
          {timeFrame === '7days' && renderWeekGrid()}
          {timeFrame === '30days' && render30DaysView()}
          {timeFrame === '12months' && render12MonthsView()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  weekButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekDisplay: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekText: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayButton: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthDisplay: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  habitCalendarCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  habitCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitCalendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  habitStats: {
    flexDirection: 'row',
    gap: 12,
  },
  habitStatsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDayLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  calendarDay: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 13,
  },
  gridContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  gridCell: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
  },
  habitNameCell: {
    width: 120,
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 4,
  },
  dayCell: {
    flex: 1,
  },
  headerText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 10,
    marginTop: 2,
  },
  habitText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholderView: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
});