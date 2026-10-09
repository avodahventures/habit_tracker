import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { db } from '../database/database';
import { getVerseOfTheDay, VerseOfTheDay } from '../utils/verses';
import { getWeekStart, getWeekEnd, isHabitScheduledToday, canToggleWeeklyHabit } from '../utils/habitScheduling';
import { countDueVerses } from '../utils/verseReview';
import { MemorizeVerseModal } from '../components/MemorizeVerseModal';
import { DailyQuizModal } from '../components/DailyQuizModal';

interface MemorizeHabitStatus {
  id: number;
  completedToday: boolean;
  canToggle: boolean;
}

export function HomeScreen() {
  const { currentTheme } = useTheme();
  const { isPremium } = usePremium();
  const [verseOfTheDay] = useState<VerseOfTheDay>(getVerseOfTheDay());
  const [memorizeModalVisible, setMemorizeModalVisible] = useState(false);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [dueVerseCount, setDueVerseCount] = useState(0);
  const [memorizeHabit, setMemorizeHabit] = useState<MemorizeHabitStatus | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadMemorizeHabitStatus();
      loadDueVerseCount();
    }, [isPremium])
  );

  const loadMemorizeHabitStatus = async () => {
    try {
      const habits = await db.getHabits();
      const habit = habits.find(h => h.name === 'Memorize a Verse');
      if (!habit) {
        setMemorizeHabit(null);
        return;
      }

      const todayLogs = await db.getTodayLogs();
      const completedToday = todayLogs.some(l => l.habitId === habit.id && l.completed === 1);

      let completedThisWeek = false;
      if (habit.frequency === 'weekly') {
        const weekStart = getWeekStart(new Date());
        const weekEnd = getWeekEnd(new Date());
        const weekLogs = await db.getHabitLogs(
          habit.id,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        );
        completedThisWeek = weekLogs.some(l => l.completed === 1);
      }

      const isScheduledToday = isHabitScheduledToday(habit);
      const canToggle = canToggleWeeklyHabit({
        frequency: habit.frequency,
        weekday: habit.weekday,
        completedThisWeek,
        isScheduledToday,
      });

      setMemorizeHabit({ id: habit.id, completedToday, canToggle });
    } catch (error) {
      console.error('Error loading memorize habit status:', error);
      setMemorizeHabit(null);
    }
  };

  const loadDueVerseCount = async () => {
    if (!isPremium) {
      setDueVerseCount(0);
      return;
    }
    try {
      const memoryVerses = await db.getMemoryVerses();
      setDueVerseCount(countDueVerses(memoryVerses));
    } catch (error) {
      console.error('Error loading verse review count:', error);
    }
  };

  const handleVersePracticeComplete = async () => {
    if (!memorizeHabit || memorizeHabit.completedToday || !memorizeHabit.canToggle) {
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.toggleHabitLog(memorizeHabit.id, today);
      await loadMemorizeHabitStatus();
    } catch (error) {
      console.error('Error completing memorize habit:', error);
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

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Branding Header */}
          <View style={styles.brandHeader}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={[styles.brandTitle, { color: currentTheme.textPrimary }]}>
              Faith Habit Tracker
            </Text>
            <Text style={[styles.brandCredit, { color: currentTheme.textSecondary }]}>
              by Avodah Ventures
            </Text>
          </View>

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
            <TouchableOpacity
              style={[styles.practiceMemorizingButton, { borderColor: currentTheme.accent }]}
              onPress={() => setMemorizeModalVisible(true)}
            >
              <Text style={[styles.practiceMemorizingButtonText, { color: currentTheme.accent }]}>
                📝 Practice Memorizing{dueVerseCount > 0 ? ` (${dueVerseCount} due)` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.practiceMemorizingButton, { borderColor: currentTheme.accent }]}
              onPress={() => setQuizModalVisible(true)}
            >
              <Text style={[styles.practiceMemorizingButtonText, { color: currentTheme.accent }]}>
                🧩 Daily Quiz
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <MemorizeVerseModal
        visible={memorizeModalVisible}
        onClose={() => {
          setMemorizeModalVisible(false);
          loadDueVerseCount();
        }}
        verseOfTheDay={verseOfTheDay}
        memorizeHabitCompletedToday={memorizeHabit ? memorizeHabit.completedToday : true}
        onPracticeComplete={handleVersePracticeComplete}
      />

      <DailyQuizModal
        visible={quizModalVisible}
        onClose={() => setQuizModalVisible(false)}
        verseOfTheDay={verseOfTheDay}
      />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  brandCredit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  verseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  practiceMemorizingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  practiceMemorizingButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
