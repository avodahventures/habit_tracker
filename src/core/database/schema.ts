export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  -- Habits table
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
    reminderTime TEXT,
    streak INTEGER DEFAULT 0,
    lastCompletedDate TEXT,
    isActive INTEGER DEFAULT 1,
    isDefault INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  -- Habit logs table
  CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habitId TEXT NOT NULL,
    date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE(habitId, date)
  );

  -- Gratitude entries table
  CREATE TABLE IF NOT EXISTS gratitude_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  -- Gratitude items table (one-to-many with entries)
  CREATE TABLE IF NOT EXISTS gratitude_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entryId TEXT NOT NULL,
    itemText TEXT NOT NULL,
    itemOrder INTEGER NOT NULL,
    FOREIGN KEY (entryId) REFERENCES gratitude_entries(id) ON DELETE CASCADE
  );

  -- Indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
  CREATE INDEX IF NOT EXISTS idx_habit_logs_habitId ON habit_logs(habitId);
  CREATE INDEX IF NOT EXISTS idx_habit_logs_habitId_date ON habit_logs(habitId, date);
  CREATE INDEX IF NOT EXISTS idx_gratitude_entries_date ON gratitude_entries(date);
  CREATE INDEX IF NOT EXISTS idx_gratitude_items_entryId ON gratitude_items(entryId);
`;

export const DROP_TABLES = `
  DROP TABLE IF EXISTS gratitude_items;
  DROP TABLE IF EXISTS gratitude_entries;
  DROP TABLE IF EXISTS habit_logs;
  DROP TABLE IF EXISTS habits;
`;