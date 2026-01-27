import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../database/database';

export function DebugScreen() {
  const [habits, setHabits] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const habitsData = await db.getHabits();
      const logsData = await db.getAllLogs();
      const journalData = await db.getJournalEntries();

      setHabits(habitsData);
      setLogs(logsData);
      setJournal(journalData);

      console.log('=== HABITS ===');
      console.log(JSON.stringify(habitsData, null, 2));
      console.log('=== HABIT LOGS ===');
      console.log(JSON.stringify(logsData, null, 2));
      console.log('=== JOURNAL ENTRIES ===');
      console.log(JSON.stringify(journalData, null, 2));
    } catch (error) {
      console.error('Error loading debug data:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Database Debug</Text>

        <TouchableOpacity style={styles.refreshButton} onPress={loadAllData}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
        </TouchableOpacity>

        {/* Habits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habits ({habits.length})</Text>
          {habits.map((habit, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardText}>ID: {habit.id}</Text>
              <Text style={styles.cardText}>Name: {habit.name}</Text>
              <Text style={styles.cardText}>Icon: {habit.icon}</Text>
              <Text style={styles.cardText}>Frequency: {habit.frequency}</Text>
              <Text style={styles.cardText}>Created: {habit.createdAt}</Text>
            </View>
          ))}
        </View>

        {/* Habit Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit Logs ({logs.length})</Text>
          {logs.map((log, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardText}>ID: {log.id}</Text>
              <Text style={styles.cardText}>Habit ID: {log.habitId}</Text>
              <Text style={styles.cardText}>Date: {log.date}</Text>
              <Text style={styles.cardText}>Completed: {log.completed ? '✅' : '❌'}</Text>
            </View>
          ))}
        </View>

        {/* Journal Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journal Entries ({journal.length})</Text>
          {journal.map((entry, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardText}>ID: {entry.id}</Text>
              <Text style={styles.cardText}>Date: {entry.date}</Text>
              <Text style={styles.cardText}>Content: {entry.content.substring(0, 50)}...</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#60A5FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#60A5FA',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
});