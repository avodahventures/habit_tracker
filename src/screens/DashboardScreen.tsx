import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useFocusEffect } from '@react-navigation/native';
import { db, Habit } from '../database/database';
import { PremiumModal } from '../components/PremiumModal';

const { width } = Dimensions.get('window');

type ViewType = '7days' | '30days' | '12months';

interface WeekData {
  habitId: number;
  habitName: string;
  days: boolean[];
}

interface MonthCompletionCellProps {
  habitId: number;
  year: number;
  month: number;
}

export function DashboardScreen() {
  const { currentTheme } = useTheme();
  const { isPremium } = usePremium();
  const [selectedView, setSelectedView] = useState<ViewType>('7days');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getLastSunday(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthData, setMonthData] = useState<Map<number, boolean[]>>(new Map());
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadHabits();
    }, [])
  );

  useEffect(() => {
    if (selectedView === '7days') {
      loadWeekData();
    } else if (selectedView === '30days') {
      loadMonthData();
    }
  }, [habits, selectedWeekStart, selectedMonth, selectedView]);

  const loadHabits = async () => {
    try {
      const data = await db.getHabits();
      setHabits(data);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadWeekData = async () => {
    try {
      const weekStart = new Date(selectedWeekStart);
      const data: WeekData[] = [];

      for (const habit of habits) {
        const days: boolean[] = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const logs = await db.getHabitLogs(habit.id, dateStr, dateStr);
          const completed = logs.length > 0 && logs[0].completed === 1;
          days.push(completed);
        }
        data.push({
          habitId: habit.id,
          habitName: habit.name,
          days,
        });
      }

      setWeekData(data);
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  };

  const loadMonthData = async () => {
    try {
      const monthDataMap = new Map<number, boolean[]>();
      const firstDay = getFirstDayOfMonth(selectedMonth);
      const lastDay = getLastDayOfMonth(selectedMonth);
      const daysInMonth = getDaysInMonth(selectedMonth);

      for (const habit of habits) {
        const days: boolean[] = new Array(daysInMonth).fill(false);
        const startStr = firstDay.toISOString().split('T')[0];
        const endStr = lastDay.toISOString().split('T')[0];
        
        const logs = await db.getHabitLogs(habit.id, startStr, endStr);
        
        logs.forEach(log => {
          const logDate = new Date(log.date + 'T00:00:00');
          const dayIndex = logDate.getDate() - 1;
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
            days[dayIndex] = log.completed === 1;
          }
        });

        monthDataMap.set(habit.id, days);
      }

      setMonthData(monthDataMap);
    } catch (error) {
      console.error('Error loading month data:', error);
    }
  };

  const handleViewChange = (view: ViewType) => {
    if ((view === '30days' || view === '12months') && !isPremium) {
      setPremiumFeature(view === '30days' ? '30 Days View' : '12 Months View');
      setPremiumModalVisible(true);
      return;
    }
    setSelectedView(view);
  };

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedWeekStart(getLastSunday(new Date()));
    } else {
      const newWeekStart = new Date(selectedWeekStart);
      newWeekStart.setDate(selectedWeekStart.getDate() + (direction === 'next' ? 7 : -7));
      setSelectedWeekStart(newWeekStart);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedMonth(new Date());
    } else {
      const newMonth = new Date(selectedMonth);
      newMonth.setMonth(selectedMonth.getMonth() + (direction === 'next' ? 1 : -1));
      setSelectedMonth(newMonth);
    }
  };

  const navigateYear = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedYear(new Date().getFullYear());
    } else {
      setSelectedYear(selectedYear + (direction === 'next' ? 1 : -1));
    }
  };

  function getLastSunday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  function getFirstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getLastDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getMonthName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function formatDateRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  }

  const MonthCompletionCell: React.FC<MonthCompletionCellProps> = ({ habitId, year, month }) => {
    const [percentage, setPercentage] = useState<number | null>(null);

    useEffect(() => {
      loadMonthCompletion();
    }, [habitId, year, month]);

    const loadMonthCompletion = async () => {
      try {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const startStr = firstDay.toISOString().split('T')[0];
        const endStr = lastDay.toISOString().split('T')[0];

        const logs = await db.getHabitLogs(habitId, startStr, endStr);
        const completedDays = logs.filter(log => log.completed === 1).length;
        const pct = daysInMonth > 0 ? Math.round((completedDays / daysInMonth) * 100) : 0;
        setPercentage(pct);
      } catch (error) {
        console.error('Error loading month completion:', error);
        setPercentage(0);
      }
    };

    const getBackgroundColor = () => {
      if (percentage === null) return 'transparent';
      if (percentage >= 75) return '#22C55E';
      if (percentage >= 50) return '#BEF264';
      if (percentage >= 1) return '#FB923C';
      return 'transparent';
    };

    const getTextColor = () => {
      if (percentage === null) return currentTheme.textSecondary;
      if (percentage >= 75) return '#FFFFFF';
      if (percentage >= 50) return '#3F6212';
      if (percentage >= 1) return '#FFFFFF';
      return currentTheme.textSecondary;
    };

    return (
      <View
        style={[
          styles.yearCompletionBox,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: percentage === 0 ? currentTheme.cardBorder : 'transparent',
            borderWidth: percentage === 0 ? 1 : 0,
          },
        ]}
      >
        <Text style={[styles.yearCompletionText, { color: getTextColor() }]}>
          {percentage === null ? '-' : `${percentage}%`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
          Track your spiritual progress
        </Text>
      </View>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            { backgroundColor: currentTheme.cardBackground },
            selectedView === '7days' && { backgroundColor: currentTheme.accent },
          ]}
          onPress={() => handleViewChange('7days')}
        >
          <Text
            style={[
              styles.viewButtonText,
              { color: currentTheme.textPrimary },
              selectedView === '7days' && { color: '#FFFFFF', fontWeight: 'bold' },
            ]}
          >
            7 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            { backgroundColor: currentTheme.cardBackground },
            selectedView === '30days' && { backgroundColor: currentTheme.accent },
            !isPremium && { opacity: 0.6 },
          ]}
          onPress={() => handleViewChange('30days')}
        >
          <Text
            style={[
              styles.viewButtonText,
              { color: currentTheme.textPrimary },
              selectedView === '30days' && { color: '#FFFFFF', fontWeight: 'bold' },
            ]}
          >
            30 Days {!isPremium && '👑'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            { backgroundColor: currentTheme.cardBackground },
            selectedView === '12months' && { backgroundColor: currentTheme.accent },
            !isPremium && { opacity: 0.6 },
          ]}
          onPress={() => handleViewChange('12months')}
        >
          <Text
            style={[
              styles.viewButtonText,
              { color: currentTheme.textPrimary },
              selectedView === '12months' && { color: '#FFFFFF', fontWeight: 'bold' },
            ]}
          >
            12 Months {!isPremium && '👑'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 7 DAYS VIEW - FREE */}
        {selectedView === '7days' && (
          <View style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
                Weekly Progress
              </Text>
              <View style={styles.weekNavigation}>
                <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton}>
                  <Text style={[styles.navButtonText, { color: currentTheme.accent }]}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateWeek('today')} style={styles.todayButton}>
                  <Text style={[styles.todayButtonText, { color: currentTheme.textPrimary }]}>
                    {formatDateRange(selectedWeekStart)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton}>
                  <Text style={[styles.navButtonText, { color: currentTheme.accent }]}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {habits.length === 0 ? (
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                No habits yet. Add some in Settings!
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header Row */}
                  <View style={styles.gridRow}>
                    <View style={[styles.habitNameCell, styles.headerCell, { backgroundColor: currentTheme.colors[1] }]}>
                      <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>Habit</Text>
                    </View>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                      const date = new Date(selectedWeekStart);
                      date.setDate(selectedWeekStart.getDate() + index);
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      return (
                        <View key={index} style={[styles.dayCell, styles.headerCell, { backgroundColor: currentTheme.colors[1] }]}>
                          <Text style={[styles.headerText, { color: isToday ? currentTheme.accent : currentTheme.textPrimary }]}>
                            {day}
                          </Text>
                          <Text style={[styles.dateNumber, { color: isToday ? currentTheme.accent : currentTheme.textSecondary }]}>
                            {date.getDate()}
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
                        habitIndex % 2 === 0 && { backgroundColor: currentTheme.cardBackground },
                      ]}
                    >
                      <View style={styles.habitNameCell}>
                        <Text style={[styles.habitNameText, { color: currentTheme.textPrimary }]} numberOfLines={1}>
                          {habit.habitName}
                        </Text>
                      </View>
                      {habit.days.map((completed, dayIndex) => (
                        <View key={dayIndex} style={styles.dayCell}>
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: currentTheme.accent },
                              completed && { backgroundColor: currentTheme.accent },
                            ]}
                          >
                            {completed && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* 30 DAYS VIEW - PREMIUM */}
        {selectedView === '30days' && isPremium && (
          <View>
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: currentTheme.accent }]}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateMonth('today')} style={styles.todayButton}>
                <Text style={[styles.monthYearText, { color: currentTheme.textPrimary }]}>
                  {getMonthName(selectedMonth)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: currentTheme.accent }]}>▶</Text>
              </TouchableOpacity>
            </View>

            {habits.map((habit) => {
              const days = monthData.get(habit.id) || [];
              const completedDays = days.filter(d => d).length;
              const totalDays = days.length;
              const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

              const firstDay = getFirstDayOfMonth(selectedMonth);
              const startDayOfWeek = firstDay.getDay();

              return (
                <View key={habit.id} style={[styles.monthCard, { backgroundColor: currentTheme.cardBackground }]}>
                  <View style={styles.monthCardHeader}>
                    <Text style={[styles.monthHabitName, { color: currentTheme.textPrimary }]}>
                      {habit.name}
                    </Text>
                    <Text style={[styles.monthStats, { color: currentTheme.textSecondary }]}>
                      {completedDays}/{totalDays} days • {percentage}%
                    </Text>
                  </View>

                  <View style={styles.calendarGrid}>
                    {/* Day labels */}
                    <View style={styles.calendarWeek}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <View key={index} style={styles.calendarDayLabel}>
                          <Text style={[styles.calendarDayLabelText, { color: currentTheme.textSecondary }]}>
                            {day}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Calendar days */}
                    <View style={styles.calendarDays}>
                      {/* Empty cells before month starts */}
                      {Array.from({ length: startDayOfWeek }).map((_, index) => (
                        <View key={`empty-${index}`} style={styles.calendarDay} />
                      ))}

                      {/* Month days */}
                      {days.map((completed, dayIndex) => {
                        const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), dayIndex + 1);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isFuture = date > new Date();

                        return (
                          <View
                            key={dayIndex}
                            style={[
                              styles.calendarDay,
                              completed && { backgroundColor: currentTheme.accent },
                              isToday && { borderColor: currentTheme.accent, borderWidth: 2 },
                              isFuture && { opacity: 0.3 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                { color: completed ? '#FFFFFF' : currentTheme.textPrimary },
                              ]}
                            >
                              {dayIndex + 1}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 12 MONTHS VIEW - PREMIUM */}
        {selectedView === '12months' && isPremium && (
          <View>
            <View style={styles.yearNavigation}>
              <TouchableOpacity onPress={() => navigateYear('prev')} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: currentTheme.accent }]}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateYear('today')} style={styles.todayButton}>
                <Text style={[styles.yearText, { color: currentTheme.textPrimary }]}>
                  {selectedYear}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateYear('next')} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: currentTheme.accent }]}>▶</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {/* Header Row */}
                  <View style={styles.yearGridRow}>
                    <View style={[styles.yearHabitNameCell, styles.headerCell, { backgroundColor: currentTheme.colors[1] }]}>
                      <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>Habit</Text>
                    </View>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                      <View key={index} style={[styles.yearMonthCell, styles.headerCell, { backgroundColor: currentTheme.colors[1] }]}>
                        <Text style={[styles.headerText, { color: currentTheme.textPrimary }]}>{month}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Data Rows */}
                  {habits.map((habit, habitIndex) => (
                    <View
                      key={habit.id}
                      style={[
                        styles.yearGridRow,
                        habitIndex % 2 === 0 && { backgroundColor: currentTheme.cardBackground },
                      ]}
                    >
                      <View style={styles.yearHabitNameCell}>
                        <Text style={[styles.habitNameText, { color: currentTheme.textPrimary }]} numberOfLines={1}>
                          {habit.name}
                        </Text>
                      </View>
                      {Array.from({ length: 12 }).map((_, monthIndex) => (
                        <View key={monthIndex} style={styles.yearMonthCell}>
                          <MonthCompletionCell habitId={habit.id} year={selectedYear} month={monthIndex} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Premium Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        feature={premiumFeature}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  viewSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  yearNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gridRow: {
    flexDirection: 'row',
    minHeight: 50,
    alignItems: 'center',
  },
  habitNameCell: {
    width: 120,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  dayCell: {
    flex: 1,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCell: {
    paddingVertical: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dateNumber: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  habitNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  monthCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  monthCardHeader: {
    marginBottom: 12,
  },
  monthHabitName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  monthStats: {
    fontSize: 14,
  },
  calendarGrid: {
    marginTop: 8,
  },
  calendarWeek: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayLabel: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  calendarDayLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginBottom: 4,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearGridRow: {
    flexDirection: 'row',
    minHeight: 40,
    alignItems: 'center',
  },
  yearHabitNameCell: {
    width: 100,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  yearMonthCell: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCompletionBox: {
    width: 48,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCompletionText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});