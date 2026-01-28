import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, Habit, HabitLog, JournalEntry } from '../database/database';
import { useTheme } from '../context/ThemeContext';

export function DebugScreen() {
  const { currentTheme } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const habitsData = await db.getHabits();
      const logsData = await db.getAllLogs();
      const journalData = await db.getJournalEntries();

      setHabits(habitsData);
      setLogs(logsData);
      setJournal(journalData);

      // Calculate stats
      const habitStats = await Promise.all(
        habitsData.map(async (habit) => {
          const habitLogs = logsData.filter(log => log.habitId === habit.id);
          const completed = habitLogs.filter(log => log.completed).length;
          return {
            habitId: habit.id,
            habitName: habit.name,
            totalLogs: habitLogs.length,
            completedLogs: completed,
            completionRate: habitLogs.length > 0 ? Math.round((completed / habitLogs.length) * 100) : 0
          };
        })
      );

      setStats({
        totalHabits: habitsData.length,
        totalLogs: logsData.length,
        completedLogs: logsData.filter(l => l.completed).length,
        totalJournalEntries: journalData.length,
        habitStats,
      });

      // Console logging for easy copy-paste
      console.log('=== DATABASE DUMP ===');
      console.log('\n--- HABITS ---');
      console.table(habitsData);
      console.log('\n--- HABIT LOGS ---');
      console.table(logsData);
      console.log('\n--- JOURNAL ENTRIES ---');
      console.table(journalData);
      console.log('\n--- STATS ---');
      console.log(JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Error loading debug data:', error);
      Alert.alert('Error', 'Failed to load database data');
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete ALL data? This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all logs
              for (const log of logs) {
                await db.deleteHabitLog(log.id);
              }
              // Delete all habits
              for (const habit of habits) {
                await db.deleteHabit(habit.id);
              }
              // Delete all journal entries
              for (const entry of journal) {
                await db.deleteJournalEntry(entry.id);
              }
              Alert.alert('Success', 'All data deleted');
              loadAllData();
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const addTestData = async () => {
    try {
      // Add test habits (all daily)
      await db.addHabit({
        name: 'Morning Prayer',
        icon: '🙏',
        color: '#60A5FA',
        frequency: 'daily',
      });
      await db.addHabit({
        name: 'Bible Reading',
        icon: '📖',
        color: '#60A5FA',
        frequency: 'daily',
      });
      await db.addHabit({
        name: 'Meditation',
        icon: '🧘',
        color: '#60A5FA',
        frequency: 'daily',
      });

      Alert.alert('Success', 'Test data added');
      loadAllData();
    } catch (error) {
      console.error('Error adding test data:', error);
      Alert.alert('Error', 'Failed to add test data');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
          🔍 Database Debug
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: currentTheme.accent }]} 
            onPress={loadAllData}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#10B981' }]} 
            onPress={addTestData}
          >
            <Text style={styles.buttonText}>➕ Add Test Data</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#EF4444' }]} 
            onPress={clearAllData}
          >
            <Text style={styles.buttonText}>🗑️ Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={[styles.statsCard, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.statsTitle, { color: currentTheme.textPrimary }]}>
            📊 Database Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: currentTheme.accent }]}>
                {stats.totalHabits || 0}
              </Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                Total Habits
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: currentTheme.accent }]}>
                {stats.totalLogs || 0}
              </Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                Total Logs
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: currentTheme.accent }]}>
                {stats.completedLogs || 0}
              </Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* Habits Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.accent }]}>
            📋 Habits ({habits.length})
          </Text>
          {habits.length === 0 ? (
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No habits in database
            </Text>
          ) : (
            habits.map((habit, index) => (
              <View key={index} style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
                    {habit.icon} {habit.name}
                  </Text>
                  <Text style={[styles.cardId, { color: currentTheme.textSecondary }]}>
                    ID: {habit.id}
                  </Text>
                </View>
                <Text style={[styles.cardText, { color: currentTheme.textSecondary }]}>
                  Frequency: Daily
                </Text>
                <Text style={[styles.cardText, { color: currentTheme.textSecondary }]}>
                  Created: {habit.createdAt}
                </Text>
                {stats.habitStats && (
                  <View style={styles.habitStatsRow}>
                    <Text style={[styles.cardText, { color: currentTheme.accent }]}>
                      {stats.habitStats.find((s: any) => s.habitId === habit.id)?.completedLogs || 0} completed
                    </Text>
                    <Text style={[styles.cardText, { color: currentTheme.accent }]}>
                      {stats.habitStats.find((s: any) => s.habitId === habit.id)?.completionRate || 0}% rate
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Habit Logs Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.accent }]}>
            📝 Habit Logs ({logs.length})
          </Text>
          {logs.length === 0 ? (
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No logs in database
            </Text>
          ) : (
            logs.slice(0, 20).map((log, index) => (
              <View key={index} style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
                    {log.completed ? '✅' : '⬜'} Habit ID: {log.habitId}
                  </Text>
                  <Text style={[styles.cardId, { color: currentTheme.textSecondary }]}>
                    Log ID: {log.id}
                  </Text>
                </View>
                <Text style={[styles.cardText, { color: currentTheme.textSecondary }]}>
                  Date: {log.date}
                </Text>
                <Text style={[styles.cardText, { color: currentTheme.textSecondary }]}>
                  Status: {log.completed ? 'Completed' : 'Not Completed'}
                </Text>
              </View>
            ))
          )}
          {logs.length > 20 && (
            <Text style={[styles.moreText, { color: currentTheme.textSecondary }]}>
              ... and {logs.length - 20} more logs (check console for full list)
            </Text>
          )}
        </View>

        {/* Journal Entries Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.accent }]}>
            📖 Journal Entries ({journal.length})
          </Text>
          {journal.length === 0 ? (
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No journal entries in database
            </Text>
          ) : (
            journal.map((entry, index) => (
              <View key={index} style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
                    {entry.date}
                  </Text>
                  <Text style={[styles.cardId, { color: currentTheme.textSecondary }]}>
                    ID: {entry.id}
                  </Text>
                </View>
                <Text style={[styles.cardText, { color: currentTheme.textSecondary }]} numberOfLines={2}>
                  {entry.content}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.footerText, { color: currentTheme.textSecondary }]}>
          💡 Check console logs for complete data dump
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  cardId: {
    fontSize: 12,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
  },
  habitStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  moreText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
});