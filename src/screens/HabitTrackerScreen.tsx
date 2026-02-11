import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { db, Habit } from '../database/database';
import { useFocusEffect } from '@react-navigation/native';

interface HabitWithCompletion extends Habit {
  completedToday: boolean;
  completedThisWeek: boolean;
  isScheduledToday: boolean;
}

interface VerseOfTheDay {
  date: string;
  reference: string;
  text: string;
  bibleGatewayUrl: string;
}

// Import verses from JSON file
const verses: VerseOfTheDay[] = require('../../assets/verses.json');

// Get verse for today's date
function getVerseOfTheDay(): VerseOfTheDay {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateKey = `${month}-${day}`;
  
  const verse = verses.find(v => v.date === dateKey);
  
  // Fallback to first verse if date not found
  return verse || verses[0];
}

// Get the start of the current week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Get the end of the current week (Saturday)
function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

export function HabitTrackerScreen() {
  const { currentTheme } = useTheme();
  const [dailyHabits, setDailyHabits] = useState<HabitWithCompletion[]>([]);
  const [weeklyHabits, setWeeklyHabits] = useState<HabitWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [verseOfTheDay] = useState<VerseOfTheDay>(getVerseOfTheDay());

  useFocusEffect(
    React.useCallback(() => {
      loadHabits();
    }, [])
  );

  const loadHabits = async () => {
    try {
      setLoading(true);
      const allHabits = await db.getHabits();
      const logs = await db.getTodayLogs();

      // Get logs for the entire week
      const today = new Date();
      const weekStart = getWeekStart(today);
      const weekEnd = getWeekEnd(today);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const logsMap: Record<number, number> = {};
      logs.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

      // Map to track if habit was completed ANY day this week
      const weekLogsMap: Record<number, boolean> = {};
      
      for (const habit of allHabits) {
        const weekLogs = await db.getHabitLogs(habit.id, weekStartStr, weekEndStr);
        const completedThisWeek = weekLogs.some(log => log.completed === 1);
        weekLogsMap[habit.id] = completedThisWeek;
      }

      const habitsWithCompletion = allHabits.map(habit => ({
        ...habit,
        completedToday: logsMap[habit.id] === 1,
        completedThisWeek: weekLogsMap[habit.id] || false,
        isScheduledToday: isHabitScheduledToday(habit),
      }));

      // Separate daily and weekly habits
      const daily = habitsWithCompletion.filter(h => !h.frequency || h.frequency === 'daily');
      const weekly = habitsWithCompletion.filter(h => h.frequency === 'weekly');

      // Sort weekly habits by day of week
      const sortedWeekly = sortWeeklyHabits(weekly);

      setDailyHabits(daily);
      setWeeklyHabits(sortedWeekly);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortWeeklyHabits = (habits: HabitWithCompletion[]): HabitWithCompletion[] => {
    const weekdayOrder = ['Any weekday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return habits.sort((a, b) => {
      const aDay = a.weekday || 'Any weekday';
      const bDay = b.weekday || 'Any weekday';
      return weekdayOrder.indexOf(aDay) - weekdayOrder.indexOf(bDay);
    });
  };

  const isHabitScheduledToday = (habit: Habit): boolean => {
    if (!habit.frequency || habit.frequency === 'daily') {
      return true; // Daily habits are always scheduled
    }
    
    if (habit.frequency === 'weekly') {
      // If no weekday specified or "Any weekday", scheduled every day
      if (!habit.weekday || habit.weekday === 'Any weekday') {
        return true; // "Any weekday" is always schedulable
      }
      
      // Check if today matches the selected weekday
      const today = new Date();
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = weekdays[today.getDay()];
      
      return todayName === habit.weekday;
    }
    
    return true;
  };

  const canToggleWeeklyHabit = (habit: HabitWithCompletion): boolean => {
    if (habit.frequency !== 'weekly') {
      return true; // Not a weekly habit
    }

    // For "Any weekday" habits, check if already completed this week
    if (!habit.weekday || habit.weekday === 'Any weekday') {
      return !habit.completedThisWeek; // Can only toggle if not completed this week
    }

    // For specific day habits, check if today is the scheduled day
    return habit.isScheduledToday;
  };

  const toggleHabit = async (habit: HabitWithCompletion) => {
    if (!canToggleWeeklyHabit(habit)) {
      // Don't allow toggling
      return;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.toggleHabitLog(habit.id, today);
      await loadHabits();
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  const openBibleGateway = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Don't know how to open URI: " + url);
      }
    } catch (error) {
      console.error('Error opening Bible Gateway:', error);
    }
  };

  const getHabitFrequencyText = (habit: Habit): string => {
    if (habit.frequency === 'daily') {
      return 'Daily';
    } else if (habit.frequency === 'weekly') {
      return habit.weekday ? `Weekly • ${habit.weekday}` : 'Weekly • Any weekday';
    }
    return 'Daily';
  };

  const getHabitStatusBadge = (habit: HabitWithCompletion): string | null => {
    if (habit.frequency !== 'weekly') {
      return null;
    }

    // For "Any weekday" habits
    if (!habit.weekday || habit.weekday === 'Any weekday') {
      if (habit.completedThisWeek) {
        return 'Done this week';
      }
      return null; // No badge if not completed yet
    }

    // For specific day habits
    if (!habit.isScheduledToday) {
      return 'Not today';
    }

    return null;
  };

  const renderHabitItem = (item: HabitWithCompletion) => {
    const canToggle = canToggleWeeklyHabit(item);
    const statusBadge = getHabitStatusBadge(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.habitCard,
          { backgroundColor: currentTheme.cardBackground },
          item.completedToday && canToggle && styles.habitCardCompleted,
          !canToggle && styles.habitCardNotScheduled,
        ]}
        onPress={() => toggleHabit(item)}
        disabled={!canToggle}
      >
        <View style={styles.habitLeft}>
          <View
            style={[
              styles.checkbox,
              { borderColor: currentTheme.accent },
              item.completedToday && canToggle && {
                backgroundColor: currentTheme.accent,
                borderColor: currentTheme.accent,
              },
              !canToggle && {
                borderColor: currentTheme.textSecondary,
                opacity: 0.3,
              },
            ]}
          >
            {item.completedToday && canToggle && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <View style={styles.habitInfo}>
            <View style={styles.habitNameRow}>
              <Text
                style={[
                  styles.habitName,
                  { color: currentTheme.textPrimary },
                  item.completedToday && canToggle && { color: currentTheme.accent },
                  !canToggle && { color: currentTheme.textSecondary },
                ]}
              >
                {item.name}
              </Text>
              {statusBadge && (
                <View style={[styles.statusBadge, { backgroundColor: currentTheme.colors[1] }]}>
                  <Text style={[styles.statusBadgeText, { color: currentTheme.textSecondary }]}>
                    {statusBadge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.habitFrequency, { color: currentTheme.textSecondary }]}>
              {getHabitFrequencyText(item)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors[0] }]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
      </View>
    );
  }

  const hasNoHabits = dailyHabits.length === 0 && weeklyHabits.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
          Today's Habits
        </Text>
      </View>

      {hasNoHabits ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No habits yet.{'\n'}Add some in Settings!
          </Text>
        </View>
      ) : (
        <FlatList
          data={[{ type: 'content' }]}
          keyExtractor={(item) => item.type}
          contentContainerStyle={styles.listContent}
          renderItem={() => (
            <>
              {/* Daily Habits Section */}
              {dailyHabits.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                    Track your daily spiritual journey
                  </Text>
                  {dailyHabits.map((habit) => (
                    <View key={habit.id}>
                      {renderHabitItem(habit)}
                    </View>
                  ))}
                </View>
              )}

              {/* Weekly Habits Section */}
              {weeklyHabits.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                    Track your weekly spiritual journey
                  </Text>
                  {weeklyHabits.map((habit) => (
                    <View key={habit.id}>
                      {renderHabitItem(habit)}
                    </View>
                  ))}
                </View>
              )}

              {/* Verse of the Day */}
              <View style={[styles.verseCard, { backgroundColor: currentTheme.cardBackground }]}>
                <View style={styles.verseHeader}>
                  <Text style={styles.verseIcon}>📖</Text>
                  <Text style={[styles.verseTitle, { color: currentTheme.textPrimary }]}>
                    Verse of the Day
                  </Text>
                </View>
                
                <Text style={[styles.verseReference, { color: currentTheme.accent }]}>
                  {verseOfTheDay.reference} (KJV)
                </Text>
                
                <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                  "{verseOfTheDay.text}"
                </Text>

                <TouchableOpacity
                  style={[styles.bibleGatewayButton, { backgroundColor: currentTheme.accent }]}
                  onPress={() => openBibleGateway(verseOfTheDay.bibleGatewayUrl)}
                >
                  <Text style={styles.bibleGatewayButtonText}>
                    Read Full Chapter on Bible Gateway 🔗
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  habitCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitCardCompleted: {
    opacity: 0.7,
  },
  habitCardNotScheduled: {
    opacity: 0.5,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkmark: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  habitInfo: {
    flex: 1,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  habitName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  habitFrequency: {
    fontSize: 14,
  },
  verseCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  verseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  verseReference: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  bibleGatewayButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  bibleGatewayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});