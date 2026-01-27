import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { db, Habit } from '../database/database';
import { useFocusEffect } from '@react-navigation/native';

interface HabitWithCompletion extends Habit {
  completedToday: boolean;
}

export function HabitTrackerScreen() {
  const { currentTheme } = useTheme();
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);

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
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No habits yet.{'\n'}Add some in Settings!
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
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
                    Daily
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
});