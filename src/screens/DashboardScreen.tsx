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

type DailyTimeFrame = '7days' | '30days' | '12months';

export function DashboardScreen() {
  const { currentTheme } = useTheme();
  const [dailyHabits, setDailyHabits] = useState<HabitWithStats[]>([]);
  const [weeklyHabits, setWeeklyHabits] = useState<HabitWithStats[]>([]);
  const [monthlyHabits, setMonthlyHabits] = useState<HabitWithStats[]>([]);
  const [todayStats, setTodayStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [weeklyStats, setWeeklyStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [monthlyStats, setMonthlyStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  
  // Chart data - Initialize with default values to prevent empty array errors
  const [dailyWeekChart, setDailyWeekChart] = useState<ChartData>({ 
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 1] }] 
  });
  const [dailyMonthChart, setDailyMonthChart] = useState<ChartData>({ 
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], 
    datasets: [{ data: [0, 0, 0, 0, 1] }] 
  });
  const [dailyYearChart, setDailyYearChart] = useState<ChartData>({ 
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] }] 
  });
  const [weeklyMonthChart, setWeeklyMonthChart] = useState<ChartData>({ 
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], 
    datasets: [{ data: [0, 0, 0, 0, 1] }] 
  });
  const [monthlyYearChart, setMonthlyYearChart] = useState<ChartData>({ 
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] }] 
  });
  
  // Tab selection
  const [dailyTimeFrame, setDailyTimeFrame] = useState<DailyTimeFrame>('7days');
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const habits = await db.getHabits();
      const logs = await db.getTodayLogs();

      const logsMap: Record<number, number> = {};
      logs.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

      const habitsWithStats = await Promise.all(
        habits.map(async (habit) => {
          const stats = await db.getHabitStats(habit.id);
          return {
            ...habit,
            streak: stats.currentStreak,
            totalCompleted: stats.totalCompleted,
            completedToday: logsMap[habit.id] === 1,
          };
        })
      );

      const daily = habitsWithStats.filter(h => h.frequency === 'daily');
      const weekly = habitsWithStats.filter(h => h.frequency === 'weekly');
      const monthly = habitsWithStats.filter(h => h.frequency === 'monthly');

      setDailyHabits(daily);
      setWeeklyHabits(weekly);
      setMonthlyHabits(monthly);

      const calcStats = (habits: HabitWithStats[]) => {
        const total = habits.length;
        const completed = habits.filter(h => h.completedToday).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, percentage };
      };

      setTodayStats(calcStats(daily));
      setWeeklyStats(calcStats(weekly));
      setMonthlyStats(calcStats(monthly));

      // Load chart data
      await loadChartData(daily, weekly, monthly);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (
    dailyHabits: HabitWithStats[], 
    weeklyHabits: HabitWithStats[], 
    monthlyHabits: HabitWithStats[]
  ) => {
    console.log('=== LOADING CHART DATA ===');
    console.log('Daily habits count:', dailyHabits.length);
    console.log('Weekly habits count:', weeklyHabits.length);
    console.log('Monthly habits count:', monthlyHabits.length);
    
    const today = new Date();

    // Daily habits - Last 7 days (Sun to Sat)
    if (dailyHabits.length > 0) {
      console.log('--- Processing Daily 7 Days Chart ---');
      const last7Days = [];
      const last7DaysLabels = [];
      
      // Get current day of week (0 = Sunday, 6 = Saturday)
      const currentDayOfWeek = today.getDay();
      
      // Start from last Sunday
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - currentDayOfWeek);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(lastSunday);
        date.setDate(lastSunday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        let completed = 0;
        for (const habit of dailyHabits) {
          const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
          if (logs.length > 0 && logs[0].completed) {
            completed++;
          }
        }
        
        last7Days.push(completed);
        last7DaysLabels.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]);
      }

      // Add max value for proper Y-axis scaling
      const maxHabits = dailyHabits.length;
      const dataWithMax = [...last7Days, maxHabits];
      
      console.log('Daily 7 Days - Labels:', last7DaysLabels);
      console.log('Daily 7 Days - Data:', last7Days);
      console.log('Daily 7 Days - Max Habits:', maxHabits);
      console.log('Daily 7 Days - Data with Max:', dataWithMax);
      console.log('Daily 7 Days - Has undefined?', dataWithMax.some(val => val === undefined || val === null));

      setDailyWeekChart({
        labels: last7DaysLabels,
        datasets: [{ data: dataWithMax }]
      });
    } else {
      console.log('No daily habits - setting default chart');
      setDailyWeekChart({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0] }]
      });
    }

    // Daily habits - Last 30 days (grouped by week)
    if (dailyHabits.length > 0) {
      console.log('--- Processing Daily 30 Days Chart ---');
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyData = [0, 0, 0, 0];
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const weekIndex = Math.floor(i / 7);
        
        if (weekIndex < 4) {
          for (const habit of dailyHabits) {
            const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
            if (logs.length > 0 && logs[0].completed) {
              weeklyData[3 - weekIndex]++;
            }
          }
        }
      }

      // Add max value
      const maxHabits = dailyHabits.length;
      const dataWithMax = [...weeklyData, maxHabits];
      
      console.log('Daily 30 Days - Labels:', weeks);
      console.log('Daily 30 Days - Data:', weeklyData);
      console.log('Daily 30 Days - Max Habits:', maxHabits);
      console.log('Daily 30 Days - Data with Max:', dataWithMax);
      console.log('Daily 30 Days - Has undefined?', dataWithMax.some(val => val === undefined || val === null));

      setDailyMonthChart({
        labels: weeks,
        datasets: [{ data: dataWithMax }]
      });
    } else {
      console.log('No daily habits - setting default 30 day chart');
      setDailyMonthChart({
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{ data: [0, 0, 0, 0, 0] }]
      });
    }

    // Daily habits - Last 12 months
    if (dailyHabits.length > 0) {
      console.log('--- Processing Daily 12 Months Chart ---');
      const months = [];
      const monthlyData = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        months.push(date.toLocaleDateString('en-US', { month: 'short' }));
        
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        let completed = 0;
        for (const habit of dailyHabits) {
          const logs = await db.getHabitLogs(habit.id, startDate, endDate);
          completed += logs.filter(l => l.completed).length;
        }
        
        monthlyData.push(completed);
      }

      // Add max value
      const maxHabits = dailyHabits.length;
      const dataWithMax = [...monthlyData, maxHabits];
      
      console.log('Daily 12 Months - Labels:', months);
      console.log('Daily 12 Months - Data:', monthlyData);
      console.log('Daily 12 Months - Max Habits:', maxHabits);
      console.log('Daily 12 Months - Data with Max:', dataWithMax);
      console.log('Daily 12 Months - Has undefined?', dataWithMax.some(val => val === undefined || val === null));

      setDailyYearChart({
        labels: months,
        datasets: [{ data: dataWithMax }]
      });
    } else {
      console.log('No daily habits - setting default 12 month chart');
      setDailyYearChart({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]
      });
    }

    // Weekly habits - Last 4 weeks
    if (weeklyHabits.length > 0) {
      console.log('--- Processing Weekly Chart ---');
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyData = [];
      
      for (let i = 3; i >= 0; i--) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (i * 7 + 7));
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() - (i * 7));
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        let completed = 0;
        for (const habit of weeklyHabits) {
          const logs = await db.getHabitLogs(habit.id, startStr, endStr);
          if (logs.length > 0 && logs.some(l => l.completed)) {
            completed++;
          }
        }
        
        weeklyData.push(completed);
      }

      // Add max value
      const maxHabits = weeklyHabits.length;
      const dataWithMax = [...weeklyData, maxHabits];
      
      console.log('Weekly - Labels:', weeks);
      console.log('Weekly - Data:', weeklyData);
      console.log('Weekly - Max Habits:', maxHabits);
      console.log('Weekly - Data with Max:', dataWithMax);
      console.log('Weekly - Has undefined?', dataWithMax.some(val => val === undefined || val === null));

      setWeeklyMonthChart({
        labels: weeks,
        datasets: [{ data: dataWithMax }]
      });
    } else {
      console.log('No weekly habits - setting default chart');
      setWeeklyMonthChart({
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{ data: [0, 0, 0, 0, 0] }]
      });
    }

    // Monthly habits - Last 12 months
    if (monthlyHabits.length > 0) {
      console.log('--- Processing Monthly Chart ---');
      const months = [];
      const monthlyData = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        months.push(date.toLocaleDateString('en-US', { month: 'short' }));
        
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        let completed = 0;
        for (const habit of monthlyHabits) {
          const logs = await db.getHabitLogs(habit.id, startDate, endDate);
          if (logs.length > 0 && logs.some(l => l.completed)) {
            completed++;
          }
        }
        
        monthlyData.push(completed);
      }

      // Add max value
      const maxHabits = monthlyHabits.length;
      const dataWithMax = [...monthlyData, maxHabits];
      
      console.log('Monthly - Labels:', months);
      console.log('Monthly - Data:', monthlyData);
      console.log('Monthly - Max Habits:', maxHabits);
      console.log('Monthly - Data with Max:', dataWithMax);
      console.log('Monthly - Has undefined?', dataWithMax.some(val => val === undefined || val === null));

      setMonthlyYearChart({
        labels: months,
        datasets: [{ data: dataWithMax }]
      });
    } else {
      console.log('No monthly habits - setting default chart');
      setMonthlyYearChart({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]
      });
    }
    
    console.log('=== CHART DATA LOADING COMPLETE ===');
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

  const renderDailyChart = () => {
    console.log('=== RENDERING DAILY CHART ===');
    console.log('Daily time frame:', dailyTimeFrame);
    
    let chartData = dailyWeekChart;
    let title = 'Last 7 Days (Sun - Sat)';
    
    if (dailyTimeFrame === '30days') {
      chartData = dailyMonthChart;
      title = 'Last 30 Days (by week)';
    } else if (dailyTimeFrame === '12months') {
      chartData = dailyYearChart;
      title = 'Last 12 Months';
    }
    
    console.log('Chart data labels:', chartData.labels);
    console.log('Chart data values:', chartData.datasets[0].data);
    console.log('Has undefined in data?', chartData.datasets[0].data.some(val => val === undefined || val === null));

    // Don't render if data is empty
    if (chartData.labels.length === 0 || chartData.datasets[0].data.length === 0) {
      console.log('Chart data is empty, showing loading...');
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
          segments={dailyHabits.length > 0 ? dailyHabits.length : 1}
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
                {todayStats.completed + weeklyStats.completed + monthlyStats.completed}
              </Text>
              <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>
                Completed
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: currentTheme.accent }]}>
                {todayStats.total + weeklyStats.total + monthlyStats.total}
              </Text>
              <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>
                Total Habits
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: currentTheme.accent }]}>
                {Math.max(...[...dailyHabits, ...weeklyHabits, ...monthlyHabits].map(h => h.streak), 0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>
                Best Streak
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Habits Section */}
        {dailyHabits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
              Daily Habits Progress
            </Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
              Total Daily Habits: {dailyHabits.length}
            </Text>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  { backgroundColor: currentTheme.cardBackground },
                  dailyTimeFrame === '7days' && { backgroundColor: currentTheme.accent },
                ]}
                onPress={() => setDailyTimeFrame('7days')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: currentTheme.textSecondary },
                    dailyTimeFrame === '7days' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}
                >
                  7 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  { backgroundColor: currentTheme.cardBackground },
                  dailyTimeFrame === '30days' && { backgroundColor: currentTheme.accent },
                ]}
                onPress={() => setDailyTimeFrame('30days')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: currentTheme.textSecondary },
                    dailyTimeFrame === '30days' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}
                >
                  30 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  { backgroundColor: currentTheme.cardBackground },
                  dailyTimeFrame === '12months' && { backgroundColor: currentTheme.accent },
                ]}
                onPress={() => setDailyTimeFrame('12months')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: currentTheme.textSecondary },
                    dailyTimeFrame === '12months' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}
                >
                  12 Months
                </Text>
              </TouchableOpacity>
            </View>

            {renderDailyChart()}
          </View>
        )}

        {/* Weekly Habits Section */}
        {weeklyHabits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
              Weekly Habits Progress
            </Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
              Total Weekly Habits: {weeklyHabits.length}
            </Text>

            <View style={styles.chartContainer}>
              <Text style={[styles.chartTitle, { color: currentTheme.textPrimary }]}>
                Last 4 Weeks
              </Text>
              <BarChart
                data={weeklyMonthChart}
                width={screenWidth - 48}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars
                segments={weeklyHabits.length > 0 ? weeklyHabits.length : 1}
              />
            </View>
          </View>
        )}

        {/* Monthly Habits Section */}
        {monthlyHabits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
              Monthly Habits Progress
            </Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
              Total Monthly Habits: {monthlyHabits.length}
            </Text>

            <View style={styles.chartContainer}>
              <Text style={[styles.chartTitle, { color: currentTheme.textPrimary }]}>
                Last 12 Months
              </Text>
              <BarChart
                data={monthlyYearChart}
                width={screenWidth - 48}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars
                segments={monthlyHabits.length > 0 ? monthlyHabits.length : 1}
              />
            </View>
          </View>
        )}

        {dailyHabits.length === 0 && weeklyHabits.length === 0 && monthlyHabits.length === 0 && (
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