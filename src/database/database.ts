import * as SQLite from 'expo-sqlite';

export interface Habit {
  id: number;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  createdAt: string;
}

export interface HabitLog {
  id: number;
  habitId: number;
  date: string;
  completed: number;
}

export interface HabitLogWithDetails extends HabitLog {
  habitName: string;
  habitIcon: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  content: string;
  tags: string; // Comma-separated tags
  createdAt: string;
}

export interface HabitStats {
  currentStreak: number;
  totalCompleted: number;
}

class Database {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.db = SQLite.openDatabaseSync('habits.db');
      
      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          frequency TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habitId INTEGER NOT NULL,
          date TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (habitId) REFERENCES habits (id) ON DELETE CASCADE,
          UNIQUE(habitId, date)
        );

        CREATE TABLE IF NOT EXISTS journal_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          content TEXT NOT NULL,
          tags TEXT DEFAULT '',
          createdAt TEXT NOT NULL
        );
      `);

      // Add tags column if it doesn't exist (migration)
      try {
        await this.db.execAsync(`
          ALTER TABLE journal_entries ADD COLUMN tags TEXT DEFAULT '';
        `);
      } catch (error) {
        // Column already exists, ignore error
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async getHabits(): Promise<Habit[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync('SELECT * FROM habits ORDER BY createdAt DESC');
    return result as Habit[];
  }

  async addHabit(habit: Omit<Habit, 'id' | 'createdAt'>): Promise<void> {
    const database = this.getDatabase();
    const createdAt = new Date().toISOString();
    await database.runAsync(
      'INSERT INTO habits (name, icon, color, frequency, createdAt) VALUES (?, ?, ?, ?, ?)',
      [habit.name, habit.icon, habit.color, habit.frequency, createdAt]
    );
  }

  async deleteHabit(id: number): Promise<void> {
    const database = this.getDatabase();
    await database.runAsync('DELETE FROM habits WHERE id = ?', [id]);
  }

  async getTodayLogs(): Promise<HabitLog[]> {
    const database = this.getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const result = await database.getAllAsync(
      'SELECT * FROM habit_logs WHERE date = ?',
      [today]
    );
    return result as HabitLog[];
  }

  async toggleHabitLog(habitId: number, date: string): Promise<void> {
    const database = this.getDatabase();
    
    const existing = await database.getFirstAsync(
      'SELECT * FROM habit_logs WHERE habitId = ? AND date = ?',
      [habitId, date]
    ) as HabitLog | null;

    if (existing) {
      await database.runAsync(
        'UPDATE habit_logs SET completed = ? WHERE id = ?',
        [existing.completed ? 0 : 1, existing.id]
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

  async getHabitStats(habitId: number): Promise<HabitStats> {
    const database = this.getDatabase();
    
    const logs = await database.getAllAsync(
      'SELECT * FROM habit_logs WHERE habitId = ? ORDER BY date DESC',
      [habitId]
    ) as HabitLog[];

    const totalCompleted = logs.filter(log => log.completed).length;
    
    let currentStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const log = logs.find(l => l.date === dateStr);
      
      if (log && log.completed) {
        currentStreak++;
      } else if (dateStr !== todayStr) {
        break;
      }
    }

    return { currentStreak, totalCompleted };
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync('SELECT * FROM journal_entries ORDER BY date DESC');
    return result as JournalEntry[];
  }

  async searchJournalEntries(keyword: string): Promise<JournalEntry[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync(
      'SELECT * FROM journal_entries WHERE content LIKE ? OR tags LIKE ? ORDER BY date DESC',
      [`%${keyword}%`, `%${keyword}%`]
    );
    return result as JournalEntry[];
  }

  async getJournalEntriesByTag(tag: string): Promise<JournalEntry[]> {
    const database = this.getDatabase();
    const result = await database.getAllAsync(
      'SELECT * FROM journal_entries WHERE tags LIKE ? ORDER BY date DESC',
      [`%${tag}%`]
    );
    return result as JournalEntry[];
  }

  async addJournalEntry(date: string, content: string, tags: string = ''): Promise<void> {
    const database = this.getDatabase();
    const createdAt = new Date().toISOString();
    await database.runAsync(
      'INSERT INTO journal_entries (date, content, tags, createdAt) VALUES (?, ?, ?, ?)',
      [date, content, tags, createdAt]
    );
  }

  async updateJournalEntry(id: number, content: string, tags: string = ''): Promise<void> {
    const database = this.getDatabase();
    await database.runAsync(
      'UPDATE journal_entries SET content = ?, tags = ? WHERE id = ?',
      [content, tags, id]
    );
  }

  async deleteJournalEntry(id: number): Promise<void> {
    const database = this.getDatabase();
    await database.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
  }
}

export const db = new Database();