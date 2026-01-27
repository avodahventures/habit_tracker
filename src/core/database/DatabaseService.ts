import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, DROP_TABLES, SCHEMA_VERSION } from './schema';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'spiritual_habits.db';

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async open(): Promise<void> {
    if (this.db) {
      console.log('DatabaseService: Database already open');
      return;
    }

    try {
      console.log('DatabaseService: Opening database...');
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      console.log('DatabaseService: Database opened, initializing tables...');
      await this.initializeTables();
      console.log('DatabaseService: Tables initialized');
    } catch (error) {
      console.error('DatabaseService: Error opening database:', error);
      throw error;
    }
  }

  private async initializeTables(): Promise<void> {
    if (!this.db) throw new Error('Database not open');

    try {
      await this.db.execAsync(CREATE_TABLES);
      console.log('Tables created successfully');

      const result = await this.db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
      );
      const currentVersion = result?.user_version || 0;

      if (currentVersion === 0) {
        await this.db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
        console.log('Schema version set to', SCHEMA_VERSION);
      } else if (currentVersion < SCHEMA_VERSION) {
        await this.migrate(currentVersion, SCHEMA_VERSION);
      }
    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }

  private async migrate(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Migrating database from version ${fromVersion} to ${toVersion}`);
    if (this.db) {
      await this.db.execAsync(`PRAGMA user_version = ${toVersion}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('Database closed');
    }
  }

  async executeSql(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
    if (!this.db) {
      throw new Error('Database not open. Call open() first.');
    }

    try {
      return await this.db.runAsync(sql, params);
    } catch (error) {
      console.error('SQL Error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not open. Call open() first.');
    }

    try {
      return await this.db.getAllAsync<T>(sql, params);
    } catch (error) {
      console.error('SQL Error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.db) {
      throw new Error('Database not open. Call open() first.');
    }

    try {
      return await this.db.getFirstAsync<T>(sql, params);
    } catch (error) {
      console.error('SQL Error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async transaction(callback: (tx: any) => Promise<void>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not open. Call open() first.');
    }

    return await this.db.withTransactionAsync(async () => {
      await callback(this.db);
    });
  }

  async logAllTables(): Promise<void> {
    if (!this.db) return;

    const tables = await this.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    console.log('=== DATABASE TABLES ===');
    for (const table of tables) {
      console.log(`Table: ${table.name}`);

      const count = await this.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table.name}`
      );
      console.log(`  Rows: ${count?.count || 0}`);
    }
  }

  async reset(): Promise<void> {
    if (!this.db) {
      await this.open();
    }

    await this.db!.execAsync(DROP_TABLES);
    await this.db!.execAsync(CREATE_TABLES);
    await this.db!.execAsync('PRAGMA user_version = 0');
    await this.initializeTables();
    console.log('Database reset complete');
  }
}

export const databaseService = DatabaseService.getInstance();