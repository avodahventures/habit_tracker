import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { db, Habit } from '../database/database';
import { useFocusEffect } from '@react-navigation/native';
import {
  checkHabitsAndNotify,
  getMiniCelebrationMessage,
  NotificationMessage,
} from '../utils/notifications';
import { NotificationBanner } from '../components/NotificationBanner';

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

const verses: VerseOfTheDay[] = require('../../assets/verses.json');

function getVerseOfTheDay(): VerseOfTheDay {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateKey = `${month}-${day}`;
  const verse = verses.find(v => v.date === dateKey);
  return verse || verses[0];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

function isNearHour(targetHour: number): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  return currentHour === targetHour && currentMinute <= 10;
}

function getNotificationShownKey(hour: number): string {
  const today = new Date().toISOString().split('T')[0];
  return `notification_shown_${today}_${hour}`;
}

export function HabitTrackerScreen() {
  const { currentTheme } = useTheme();
  const [dailyHabits, setDailyHabits] = useState<HabitWithCompletion[]>([]);
  const [weeklyHabits, setWeeklyHabits] = useState<HabitWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [verseOfTheDay] = useState<VerseOfTheDay>(getVerseOfTheDay());
  const [banner, setBanner] = useState<NotificationMessage | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [isCelebration, setIsCelebration] = useState(false);
  const [isMini, setIsMini] = useState(false);

  const shownNotifications = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useFocusEffect(
    React.useCallback(() => {
      loadHabits();
      startTimeCheck();

      return () => {
        stopTimeCheck();
      };
    }, [])
  );

  const startTimeCheck = () => {
    stopTimeCheck();

    checkTimeAndShowBanner();

    timerRef.current = setInterval(() => {
      checkTimeAndShowBanner();
    }, 60000);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkTimeAndShowBanner();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  };

  const stopTimeCheck = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkTimeAndShowBanner = async () => {
    const isNoon = isNearHour(12);
    const isEvening = isNearHour(18);
    const noonKey = getNotificationShownKey(12);
    const eveningKey = getNotificationShownKey(18);

    if (isNoon && !shownNotifications.current.has(noonKey)) {
      const notification = await checkHabitsAndNotify();
      if (notification && !notification.title.includes('🎉')) {
        shownNotifications.current.add(noonKey);
        showBanner(notification, false, false);
      }
    } else if (isEvening && !shownNotifications.current.has(eveningKey)) {
      const notification = await checkHabitsAndNotify();
      if (notification && !notification.title.includes('🎉')) {
        shownNotifications.current.add(eveningKey);
        showBanner(notification, false, false);
      }
    }
  };

  const showBanner = (
    notification: NotificationMessage,
    celebration: boolean,
    mini: boolean
  ) => {
    if (bannerVisible) return;
    setIsCelebration(celebration);
    setIsMini(mini);
    setBanner(notification);
    setBannerVisible(true);
  };

  const loadHabits = async () => {
    try {
      setLoading(true);
      const allHabits = await db.getHabits();
      const logs = await db.getTodayLogs();

      const today = new Date();
      const weekStart = getWeekStart(today);
      const weekEnd = getWeekEnd(today);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const logsMap: Record<number, number> = {};
      logs.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

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

      const daily = habitsWithCompletion.filter(
        h => !h.frequency || h.frequency === 'daily'
      );
      const weekly = habitsWithCompletion.filter(
        h => h.frequency === 'weekly'
      );
      const sortedWeekly = sortWeeklyHabits(weekly);

      setDailyHabits(daily);
      setWeeklyHabits(sortedWeekly);

      // Show full celebration if all habits are done
      const notification = await checkHabitsAndNotify();
      if (notification && notification.title.includes('🎉')) {
        showBanner(notification, true, false);
      }

    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHabitsQuiet = async () => {
    try {
      const allHabits = await db.getHabits();
      const logs = await db.getTodayLogs();

      const today = new Date();
      const weekStart = getWeekStart(today);
      const weekEnd = getWeekEnd(today);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const logsMap: Record<number, number> = {};
      logs.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

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

      const daily = habitsWithCompletion.filter(
        h => !h.frequency || h.frequency === 'daily'
      );
      const weekly = habitsWithCompletion.filter(
        h => h.frequency === 'weekly'
      );
      const sortedWeekly = sortWeeklyHabits(weekly);

      setDailyHabits(daily);
      setWeeklyHabits(sortedWeekly);
    } catch (error) {
      console.error('Error loading habits quietly:', error);
    }
  };

  const sortWeeklyHabits = (habits: HabitWithCompletion[]): HabitWithCompletion[] => {
    const weekdayOrder = [
      'Any weekday', 'Sunday', 'Monday', 'Tuesday',
      'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ];
    return habits.sort((a, b) => {
      const aDay = a.weekday || 'Any weekday';
      const bDay = b.weekday || 'Any weekday';
      return weekdayOrder.indexOf(aDay) - weekdayOrder.indexOf(bDay);
    });
  };

  const isHabitScheduledToday = (habit: Habit): boolean => {
    if (!habit.frequency || habit.frequency === 'daily') {
      return true;
    }
    if (habit.frequency === 'weekly') {
      if (!habit.weekday || habit.weekday === 'Any weekday') {
        return true;
      }
      const today = new Date();
      const weekdays = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday',
      ];
      const todayName = weekdays[today.getDay()];
      return todayName === habit.weekday;
    }
    return true;
  };

  const canToggleWeeklyHabit = (habit: HabitWithCompletion): boolean => {
    if (habit.frequency !== 'weekly') {
      return true;
    }
    if (!habit.weekday || habit.weekday === 'Any weekday') {
      return !habit.completedThisWeek;
    }
    return habit.isScheduledToday;
  };

  const toggleHabit = async (habit: HabitWithCompletion) => {
    if (!canToggleWeeklyHabit(habit)) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await db.toggleHabitLog(habit.id, today);

      // Only show banners when checking (not unchecking)
      if (!habit.completedToday) {
        // Load habits quietly first to get updated state
        await loadHabitsQuiet();

        // Check if all habits are now complete
        const notification = await checkHabitsAndNotify();

        if (notification && notification.title.includes('🎉')) {
          // All habits done - show full celebration
          showBanner(notification, true, false);
        } else {
          // Show mini celebration for partial completion
          const allHabits = [...dailyHabits, ...weeklyHabits];
          const toggleableHabits = allHabits.filter(h => canToggleWeeklyHabit(h));
          const completedCount = toggleableHabits.filter(h =>
            h.id === habit.id ? true : h.completedToday
          ).length;
          const totalCount = toggleableHabits.length;

          const miniMessage = getMiniCelebrationMessage(
            habit.name,
            completedCount,
            totalCount
          );
          showBanner(miniMessage, false, true);
        }
      } else {
        // Just reload quietly when unchecking
        await loadHabitsQuiet();
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  const openBibleGateway = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
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
    if (!habit.weekday || habit.weekday === 'Any weekday') {
      if (habit.completedThisWeek) {
        return 'Done this week';
      }
      return null;
    }
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
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: currentTheme.colors[1] }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: currentTheme.textSecondary }
                  ]}>
                    {statusBadge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.habitFrequency,
              { color: currentTheme.textSecondary }
            ]}>
              {getHabitFrequencyText(item)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[
        styles.loadingContainer,
        { backgroundColor: currentTheme.colors[0] }
      ]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
      </View>
    );
  }

  const hasNoHabits = dailyHabits.length === 0 && weeklyHabits.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <SafeAreaView style={styles.safeArea}>
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
                    <Text style={[
                      styles.sectionSubtitle,
                      { color: currentTheme.textSecondary }
                    ]}>
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
                    <Text style={[
                      styles.sectionSubtitle,
                      { color: currentTheme.textSecondary }
                    ]}>
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
                <View style={[
                  styles.verseCard,
                  { backgroundColor: currentTheme.cardBackground }
                ]}>
                  <View style={styles.verseHeader}>
                    <Text style={styles.verseIcon}>📖</Text>
                    <Text style={[
                      styles.verseTitle,
                      { color: currentTheme.textPrimary }
                    ]}>
                      Verse of the Day
                    </Text>
                  </View>
                  <Text style={[
                    styles.verseReference,
                    { color: currentTheme.accent }
                  ]}>
                    {verseOfTheDay.reference} (KJV)
                  </Text>
                  <Text style={[
                    styles.verseText,
                    { color: currentTheme.textPrimary }
                  ]}>
                    "{verseOfTheDay.text}"
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.bibleGatewayButton,
                      { backgroundColor: currentTheme.accent }
                    ]}
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

      {/* In-App Notification Banner */}
      {banner && (
        <NotificationBanner
          title={banner.title}
          body={banner.body}
          visible={bannerVisible}
          isCelebration={isCelebration}
          isMini={isMini}
          onDismiss={() => {
            setBannerVisible(false);
            setBanner(null);
            setIsCelebration(false);
            setIsMini(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
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