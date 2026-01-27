import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { db, Habit } from '../database/database';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

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

interface ChartData {
  labels: string[];
  datasets: [{
    data: number[];
  }];
}

type TimeFrame = '7days' | '30days' | '12months';

export function DashboardScreen() {
  const { currentTheme } = useTheme();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [todayStats, setTodayStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  
  // Chart data - Initialize with default values
  const [weekChart, setWeekChart] = useState<ChartData>({ 
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 1] }] 
  });
  const [monthChart, setMonthChart] = useState<ChartData>({ 
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], 
    datasets: [{ data: [0, 0, 0, 0, 1] }] 
  });
  const [yearChart, setYearChart] = useState<ChartData>({ 
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] }] 
  });
  
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

      // Load chart data
      await loadChartData(habitsWithStats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (habits: HabitWithStats[]) => {
    const today = new Date();

    if (habits.length === 0) {
      setWeekChart({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0] }]
      });
      setMonthChart({
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{ data: [0, 0, 0, 0, 0] }]
      });
      setYearChart({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]
      });
      return;
    }

    // Last 7 days (Sun to Sat)
    const last7Days = [];
    const last7DaysLabels = [];
    const currentDayOfWeek = today.getDay();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - currentDayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(lastSunday);
      date.setDate(lastSunday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      let completed = 0;
      for (const habit of habits) {
        const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
        if (logs.length > 0 && logs[0].completed) {
          completed++;
        }
      }
      
      last7Days.push(completed);
      last7DaysLabels.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]);
    }

    setWeekChart({
      labels: last7DaysLabels,
      datasets: [{ data: [...last7Days, habits.length] }]
    });

    // Last 30 days (grouped by week)
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const weeklyData = [0, 0, 0, 0];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const weekIndex = Math.floor(i / 7);
      
      if (weekIndex < 4) {
        for (const habit of habits) {
          const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
          if (logs.length > 0 && logs[0].completed) {
            weeklyData[3 - weekIndex]++;
          }
        }
      }
    }

    setMonthChart({
      labels: weeks,
      datasets: [{ data: [...weeklyData, habits.length] }]
    });

    // Last 12 months
    const months = [];
    const monthlyData = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      months.push(date.toLocaleDateString('en-US', { month: 'short' }));
      
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      
      let completed = 0;
      for (const habit of habits) {
        const logs = await db.getHabitLogs(habit.id, startDate, endDate);
        completed += logs.filter(l => l.completed).length;
      }
      
      monthlyData.push(completed);
    }

    setYearChart({
      labels: months,
      datasets: [{ data: [...monthlyData, habits.length] }]
    });
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

  const chartConfig = {
    backgroundColor: currentTheme.colors[1],
    backgroundGradientFrom: currentTheme.colors[1],
    backgroundGradientTo: currentTheme.colors[2],
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  const renderChart = () => {
    let chartData = weekChart;
    let title = 'Last 7 Days (Sun - Sat)';
    
    if (timeFrame === '30days') {
      chartData = monthChart;
      title = 'Last 30 Days (by week)';
    } else if (timeFrame === '12months') {
      chartData = yearChart;
      title = 'Last 12 Months';
    }

    if (chartData.labels.length === 0 || chartData.datasets[0].data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: currentTheme.textPrimary }]}>
            {title}
          </Text>
          <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: currentTheme.textSecondary }}>Loading chart...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: currentTheme.textPrimary }]}>
          {title}
        </Text>
        <BarChart
          data={chartData}
          width={screenWidth - 48}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
          showValuesOnTopOfBars
          segments={habits.length > 0 ? habits.length : 1}
        />
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
        {habits.length > 0 && (
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

            {renderChart()}
          </View>
        )}

        {habits.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: currentTheme.cardBackground }]}>
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No habits to track yet.{'\n'}Add some habits in Settings to get started!
            </Text>
          </View>
        )}
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
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
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
});