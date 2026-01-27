import AsyncStorage from '@react-native-async-storage/async-storage';
import { habitRepositorySQLite } from '../../features/habits/repositories/HabitRepositorySQLite';
import { gratitudeRepositorySQLite } from '../../features/gratitude/repositories/GratitudeRepositorySQLite';
import { Habit } from '../models/Habit';
import { DailyHabitLog } from '../models/DailyHabitLog';
import { GratitudeEntry } from '../models/GratitudeEntry';

export async function migrateFromAsyncStorage(): Promise<{
  success: boolean;
  habitsImported: number;
  logsImported: number;
  gratitudeImported: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let habitsImported = 0;
  let logsImported = 0;
  let gratitudeImported = 0;

  try {
    console.log('Starting migration from AsyncStorage to SQLite...');

    // Migrate Habits
    try {
      const habitsJson = await AsyncStorage.getItem('@habits');
      if (habitsJson) {
        const habits: Habit[] = JSON.parse(habitsJson);
        for (const habit of habits) {
          await habitRepositorySQLite.saveHabit(habit);
          habitsImported++;
        }
        console.log(`Migrated ${habitsImported} habits`);
      }
    } catch (error) {
      errors.push(`Habit migration error: ${error}`);
    }

    // Migrate Habit Logs
    try {
      const logsJson = await AsyncStorage.getItem('@habit_logs');
      if (logsJson) {
        const logs: DailyHabitLog[] = JSON.parse(logsJson);
        for (const log of logs) {
          await habitRepositorySQLite.saveLog(log);
          logsImported++;
        }
        console.log(`Migrated ${logsImported} habit logs`);
      }
    } catch (error) {
      errors.push(`Habit log migration error: ${error}`);
    }

    // Migrate Gratitude Entries
    try {
      const gratitudeJson = await AsyncStorage.getItem('@gratitude_entries');
      if (gratitudeJson) {
        const entries: GratitudeEntry[] = JSON.parse(gratitudeJson);
        for (const entry of entries) {
          await gratitudeRepositorySQLite.saveEntry(entry);
          gratitudeImported++;
        }
        console.log(`Migrated ${gratitudeImported} gratitude entries`);
      }
    } catch (error) {
      errors.push(`Gratitude migration error: ${error}`);
    }

    // Mark migration as complete
    await AsyncStorage.setItem('@migration_complete', 'true');

    console.log('Migration complete!');
    return {
      success: errors.length === 0,
      habitsImported,
      logsImported,
      gratitudeImported,
      errors,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    errors.push(`General migration error: ${error}`);
    return {
      success: false,
      habitsImported,
      logsImported,
      gratitudeImported,
      errors,
    };
  }
}

export async function checkIfMigrationNeeded(): Promise<boolean> {
  const migrationComplete = await AsyncStorage.getItem('@migration_complete');
  return migrationComplete !== 'true';
}