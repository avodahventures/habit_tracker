import { Habit } from '../../../core/models/Habit';
import { DailyHabitLog } from '../../../core/models/DailyHabitLog';
import { databaseService } from '../../../core/database/DatabaseService';

export class HabitRepositorySQLite {
  // ===== HABITS =====

  async getAllHabits(): Promise<Habit[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM habits ORDER BY createdAt ASC'
    );

    return rows.map(row => this.mapRowToHabit(row));
  }

  async getHabitById(id: string): Promise<Habit | null> {
    const row = await databaseService.getFirstAsync<any>(
      'SELECT * FROM habits WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToHabit(row) : null;
  }

  async getHabitsByFrequency(frequency: 'daily' | 'weekly' | 'monthly'): Promise<Habit[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM habits WHERE frequency = ? ORDER BY createdAt ASC',
      [frequency]
    );

    return rows.map(row => this.mapRowToHabit(row));
  }

  async saveHabit(habit: Habit): Promise<void> {
    const exists = await this.getHabitById(habit.id);

    const isActiveInt = habit.isActive ? 1 : 0;
    const isDefaultInt = habit.isDefault ? 1 : 0;
    const streakInt = habit.streak || 0;

    if (exists) {
      await databaseService.executeSql(
        `UPDATE habits 
         SET name = ?, icon = ?, frequency = ?, reminderTime = ?, 
             streak = ?, lastCompletedDate = ?, isActive = ?, isDefault = ?, updatedAt = ?
         WHERE id = ?`,
        [
          habit.name,
          habit.icon || null,
          habit.frequency,
          habit.reminderTime || null,
          streakInt,
          habit.lastCompletedDate || null,
          isActiveInt,
          isDefaultInt,
          habit.updatedAt,
          habit.id,
        ]
      );
    } else {
      await databaseService.executeSql(
        `INSERT INTO habits (id, name, icon, frequency, reminderTime, streak, lastCompletedDate, isActive, isDefault, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          habit.id,
          habit.name,
          habit.icon || null,
          habit.frequency,
          habit.reminderTime || null,
          streakInt,
          habit.lastCompletedDate || null,
          isActiveInt,
          isDefaultInt,
          habit.createdAt,
          habit.updatedAt,
        ]
      );
    }
  }

  async deleteHabit(id: string): Promise<void> {
    await databaseService.executeSql(
      'DELETE FROM habits WHERE id = ?',
      [id]
    );
  }

  // ===== HABIT LOGS =====

  async getDailyLogsForDate(date: string): Promise<DailyHabitLog[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM habit_logs WHERE date = ?',
      [date]
    );

    return rows.map(row => this.mapRowToLog(row));
  }

  async getLogsForDateRange(startDate: string, endDate: string): Promise<DailyHabitLog[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM habit_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [startDate, endDate]
    );

    return rows.map(row => this.mapRowToLog(row));
  }

  async getLogsForHabit(habitId: string): Promise<DailyHabitLog[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM habit_logs WHERE habitId = ? ORDER BY date DESC',
      [habitId]
    );

    return rows.map(row => this.mapRowToLog(row));
  }

  async saveLog(log: DailyHabitLog): Promise<void> {
    const completedInt = log.completed ? 1 : 0;

    await databaseService.executeSql(
      `INSERT OR REPLACE INTO habit_logs (id, habitId, date, completed, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.habitId,
        log.date,
        completedInt,
        log.completedAt || null,
        log.createdAt,
        log.updatedAt,
      ]
    );
  }

  async deleteLog(habitId: string, date: string): Promise<void> {
    await databaseService.executeSql(
      'DELETE FROM habit_logs WHERE habitId = ? AND date = ?',
      [habitId, date]
    );
  }

  // ===== ANALYTICS QUERIES =====

  async getDailyStatsForDateRange(
    startDate: string,
    endDate: string,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): Promise<Array<{ date: string; completed: number; total: number }>> {
    const rows = await databaseService.getAllAsync<any>(
      `SELECT 
         hl.date,
         COUNT(CASE WHEN hl.completed = 1 THEN 1 END) as completed,
         COUNT(h.id) as total
       FROM habit_logs hl
       INNER JOIN habits h ON hl.habitId = h.id
       WHERE hl.date >= ? AND hl.date <= ? AND h.frequency = ?
       GROUP BY hl.date
       ORDER BY hl.date ASC`,
      [startDate, endDate, frequency]
    );

    return rows;
  }

  async getCompletionRateForHabit(
    habitId: string,
    startDate: string,
    endDate: string
  ): Promise<{ completed: number; total: number; percentage: number }> {
    const row = await databaseService.getFirstAsync<any>(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN completed = 1 THEN 1 END) as completed
       FROM habit_logs
       WHERE habitId = ? AND date >= ? AND date <= ?`,
      [habitId, startDate, endDate]
    );

    const percentage = row && row.total > 0 
      ? Math.round((row.completed / row.total) * 100) 
      : 0;

    return {
      completed: row?.completed || 0,
      total: row?.total || 0,
      percentage,
    };
  }

  async getCurrentStreak(habitId: string): Promise<number> {
    const habit = await this.getHabitById(habitId);
    if (!habit) return 0;

    const today = new Date().toISOString().split('T')[0];
    
    const rows = await databaseService.getAllAsync<{ date: string }>(
      `SELECT date FROM habit_logs 
       WHERE habitId = ? AND completed = 1 AND date <= ?
       ORDER BY date DESC`,
      [habitId, today]
    );

    if (rows.length === 0) return 0;

    let streak = 0;
    const firstDate = new Date(rows[0].date);
    let expectedDate = new Date(firstDate);

    for (const row of rows) {
      const logDate = new Date(row.date);
      
      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
        if (habit.frequency === 'daily') {
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else if (habit.frequency === 'weekly') {
          expectedDate.setDate(expectedDate.getDate() - 7);
        } else {
          expectedDate.setMonth(expectedDate.getMonth() - 1);
        }
      } else {
        break;
      }
    }

    return streak;
  }

  // ===== HELPER METHODS =====

  private mapRowToHabit(row: any): Habit {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      frequency: row.frequency as 'daily' | 'weekly' | 'monthly',
      reminderTime: row.reminderTime,
      streak: row.streak || 0,
      lastCompletedDate: row.lastCompletedDate,
      isActive: row.isActive === 1,
      isDefault: row.isDefault === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapRowToLog(row: any): DailyHabitLog {
    return {
      id: row.id,
      habitId: row.habitId,
      date: row.date,
      completed: row.completed === 1,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const habitRepositorySQLite = new HabitRepositorySQLite();