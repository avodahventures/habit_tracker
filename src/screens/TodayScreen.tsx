import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, Habit } from '../database/database';

export function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      const habitsData = await db.getHabits();
      const logsData = await db.getTodayLogs();
      
      const logsMap: Record<number, number> = {};
      logsData.forEach(log => {
        logsMap[log.habitId] = log.completed;
      });

      setHabits(habitsData);
      setLogs(logsMap);
    } catch (error) {
      console.error('TodayScreen: Error loading today logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.toggleHabitLog(habitId, today);
      await loadTodayData();
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today</Text>
      
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No habits yet. Add some in the Habits tab!
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.habitCard}
              onPress={() => toggleHabit(item.id)}
            >
              <Text style={styles.habitIcon}>{item.icon}</Text>
              <Text style={styles.habitName}>{item.name}</Text>
              <View style={[
                styles.checkbox,
                logs[item.id] ? styles.checkboxChecked : null
              ]}>
                {logs[item.id] ? <Text style={styles.checkmark}>✓</Text> : null}
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
    backgroundColor: '#1E3A5F',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  habitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  habitName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#60A5FA',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});