import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { db, Habit } from '../database/database';
import { useFocusEffect } from '@react-navigation/native';

interface HabitWithCompletion extends Habit {
  completedToday: boolean;
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
  
  // Fallback to first verse if date not found (shouldn't happen with 365 verses)
  return verse || verses[0];
}

export function HabitTrackerScreen() {
  const { currentTheme } = useTheme();
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
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
      
      console.log('All habits loaded:', allHabits.map(h => ({
        name: h.name,
        frequency: h.frequency,
        weekday: h.weekday
      })));
      
      const logs = await db.getTodayLogs();

      const logsMap: Record<number, number> = {};
      logs.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

      const habitsWithCompletion = allHabits.map(habit => ({
        ...habit,
        completedToday: logsMap[habit.id] === 1,
      }));

      setHabits(habitsWithCompletion);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.toggleHabitLog(habitId, today);
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

  const shouldShowHabitToday = (habit: Habit): boolean => {
    // If frequency is not set or is daily, always show
    if (!habit.frequency || habit.frequency === 'daily') {
      console.log(`${habit.name}: Daily habit - SHOW`);
      return true;
    }
    
    if (habit.frequency === 'weekly') {
      // If no weekday specified or "Any weekday", show every day
      if (!habit.weekday || habit.weekday === 'Any weekday') {
        console.log(`${habit.name}: Weekly (Any weekday) - SHOW`);
        return true;
      }
      
      // Check if today matches the selected weekday
      const today = new Date();
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = weekdays[today.getDay()];
      
      const shouldShow = todayName === habit.weekday;
      console.log(`${habit.name}: Weekly (${habit.weekday}) - Today is ${todayName} - ${shouldShow ? 'SHOW' : 'HIDE'}`);
      
      return shouldShow;
    }
    
    console.log(`${habit.name}: Unknown frequency (${habit.frequency}) - SHOW by default`);
    return true; // Default to showing
  };

  // Filter habits to show only those that should appear today
  const todayHabits = habits.filter(shouldShowHabitToday);

  console.log(`Total habits: ${habits.length}, Today's habits: ${todayHabits.length}`);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors[0] }]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
          Today's Habits
        </Text>
        <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
          Track your daily spiritual journey
        </Text>
      </View>

      {/* Habits List */}
      {todayHabits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No habits scheduled for today.{'\n'}Add some in Settings!
          </Text>
        </View>
      ) : (
        <FlatList
          data={todayHabits}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            /* Verse of the Day */
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
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.habitCard,
                { backgroundColor: currentTheme.cardBackground },
                item.completedToday && styles.habitCardCompleted,
              ]}
              onPress={() => toggleHabit(item.id)}
            >
              <View style={styles.habitLeft}>
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: currentTheme.accent },
                    item.completedToday && {
                      backgroundColor: currentTheme.accent,
                      borderColor: currentTheme.accent,
                    },
                  ]}
                >
                  {item.completedToday && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <View style={styles.habitInfo}>
                  <Text
                    style={[
                      styles.habitName,
                      { color: currentTheme.textPrimary },
                      item.completedToday && { color: currentTheme.accent },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.habitFrequency, { color: currentTheme.textSecondary }]}>
                    {getHabitFrequencyText(item)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  subtitle: {
    fontSize: 16,
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
  habitName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
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
