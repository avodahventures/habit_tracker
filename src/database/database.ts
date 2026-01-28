import * as SQLite from 'expo-sqlite';

// Type definitions
interface Habit {
  id: number;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  targetDays: string;
  createdAt: string;
}

interface HabitLog {
  id: number;
  habitId: number;
  date: string;
  completed: number;
}

interface HabitLogWithDetails extends HabitLog {
  name: string;
  icon: string;
  color: string;
  frequency: string;
}

interface JournalEntry {
  id: number;
  date: string;
  content: string;
  createdAt: string;
}

interface HabitStats {
  totalCompleted: number;
  currentStreak: number;
}

class Database {
  private database: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.database = await SQLite.openDatabaseAsync('habits.db');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    await this.database.execAsync(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        frequency TEXT NOT NULL,
        targetDays TEXT,
        createdAt TEXT NOT NULL
      );
    `);

    await this.database.execAsync(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habitId INTEGER NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (habitId) REFERENCES habits (id) ON DELETE CASCADE,
        UNIQUE(habitId, date)
      );
    `);

    await this.database.execAsync(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  }

  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.database) {
      throw new Error('Database not open. Call init() first.');
    }
    return this.database;
  }

  // Habits methods
  async getHabits(): Promise<Habit[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync('SELECT * FROM habits ORDER BY createdAt DESC');
    return result as Habit[];
  }

  async addHabit(habit: { name: string; icon: string; color: string; frequency: string; targetDays?: string }): Promise<number> {
    const database = this.getDatabase();
    const result = await database.runAsync(
      'INSERT INTO habits (name, icon, color, frequency, targetDays, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [habit.name, habit.icon, habit.color, habit.frequency, habit.targetDays || '', new Date().toISOString()]
    );
    return result.lastInsertRowId;
  }

  async deleteHabit(id: number): Promise<void> {
    const database = this.getDatabase();
    await database.runAsync('DELETE FROM habits WHERE id = ?', [id]);
  }

  // Habit logs methods
  async getTodayLogs(): Promise<HabitLogWithDetails[]> {
    const database = this.getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const result = await database.getAllAsync(
      `SELECT hl.*, h.name, h.icon, h.color, h.frequency 
       FROM habit_logs hl 
       JOIN habits h ON hl.habitId = h.id 
       WHERE hl.date = ?`,
      [today]
    );
    return result as HabitLogWithDetails[];
  }

  async toggleHabitLog(habitId: number, date: string): Promise<void> {
    const database = this.getDatabase();
    const existing = await database.getFirstAsync(
      'SELECT * FROM habit_logs WHERE habitId = ? AND date = ?',
      [habitId, date]
    ) as HabitLog | null;

    if (existing) {
      await database.runAsync(
        'UPDATE habit_logs SET completed = ? WHERE habitId = ? AND date = ?',
        [existing.completed ? 0 : 1, habitId, date]
      );
    } else {
      await database.runAsync(
        'INSERT INTO habit_logs (habitId, date, completed) VALUES (?, ?, ?)',
        [habitId, date, 1]
      );
    }
  }

  async getHabitLogs(habitId: number, startDate: string, endDate: string): Promise<HabitLog[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync(
      'SELECT * FROM habit_logs WHERE habitId = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
      [habitId, startDate, endDate]
    );
    return result as HabitLog[];
  }

  async getAllLogs(): Promise<HabitLog[]> {
  const database = this.getDatabase();
  const result = await database.getAllAsync('SELECT * FROM habit_logs ORDER BY date DESC');
  return result as HabitLog[];
  }

  async deleteHabitLog(id: number): Promise<void> {
  const database = this.getDatabase();
  await database.runAsync('DELETE FROM habit_logs WHERE id = ?', [id]);
  }

  async getHabitStats(habitId: number): Promise<HabitStats> {
    const database = this.getDatabase();
    
    // Get total completed logs
    const totalResult = await database.getFirstAsync(
      'SELECT COUNT(*) as total FROM habit_logs WHERE habitId = ? AND completed = 1',
      [habitId]
    ) as { total: number } | null;

    // Get current streak
    const logs = await database.getAllAsync(
      'SELECT date, completed FROM habit_logs WHERE habitId = ? ORDER BY date DESC',
      [habitId]
    ) as HabitLog[];

    let currentStreak = 0;
    const today = new Date();
    
    for (let i = 0; i < logs.length; i++) {
      const logDate = new Date(logs[i].date);
      const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i && logs[i].completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalCompleted: totalResult?.total || 0,
      currentStreak,
    };
  }

  // Journal methods
  async getJournalEntries(): Promise<JournalEntry[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync('SELECT * FROM journal_entries ORDER BY date DESC');
    return result as JournalEntry[];
  }

  async addJournalEntry(date: string, content: string): Promise<number> {
    const database = this.getDatabase();
    const result = await database.runAsync(
      'INSERT INTO journal_entries (date, content, createdAt) VALUES (?, ?, ?)',
      [date, content, new Date().toISOString()]
    );
    return result.lastInsertRowId;
  }

  async updateJournalEntry(id: number, content: string): Promise<void> {
    const database = this.getDatabase();
    await database.runAsync(
      'UPDATE journal_entries SET content = ? WHERE id = ?',
      [content, id]
    );
  }

  async deleteJournalEntry(id: number): Promise<void> {
    const database = this.getDatabase();
    await database.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
  }

  async getJournalEntryByDate(date: string): Promise<JournalEntry | null> {
    const database = this.getDatabase();
    const result = await database.getFirstAsync(
      'SELECT * FROM journal_entries WHERE date = ?',
      [date]
    );
    return result as JournalEntry | null;
  }
}

export const db = new Database();

// Export types for use in other files
export type { Habit, HabitLog, HabitLogWithDetails, JournalEntry, HabitStats };