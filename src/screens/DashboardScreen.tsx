import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { db, Habit, HabitLog } from '../database/database';
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      await loadWeekData(habitsWithStats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async (habits: HabitWithStats[]) => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - currentDayOfWeek);

    const weekDataArray: WeekData[] = [];

    for (const habit of habits) {
      const days = [false, false, false, false, false, false, false];

      for (let i = 0; i < 7; i++) {
        const date = new Date(lastSunday);
        date.setDate(lastSunday.getDate() + i);
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

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
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

    return (
      <View style={styles.gridContainer}>
        {/* Header Row */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCell, styles.headerCell, styles.habitNameCell]}>
            <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>
              Habit
            </Text>
          </View>
          {dayLabels.map((day, index) => (
            <View key={index} style={[styles.gridCell, styles.headerCell, styles.dayCell]}>
              <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>
                {day}
              </Text>
            </View>
          ))}
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
    return (
      <View style={[styles.placeholderView, { backgroundColor: currentTheme.cardBackground }]}>
        <Text style={[styles.placeholderText, { color: currentTheme.textSecondary }]}>
          30 Days view - Coming soon
        </Text>
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
    marginBottom: 20,
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
    width: 120, // Fixed width ~15 characters
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
