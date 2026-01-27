import { GratitudeEntry } from '../../../core/models/GratitudeEntry';
import { databaseService } from '../../../core/database/DatabaseService';

export class GratitudeRepositorySQLite {
  async getAllEntries(): Promise<GratitudeEntry[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM gratitude_entries ORDER BY date DESC'
    );

    const entries: GratitudeEntry[] = [];
    for (const row of rows) {
      const items = await this.getItemsForEntry(row.id);
      entries.push({
        id: row.id,
        date: row.date,
        entries: items,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    return entries;
  }

  async getEntryByDate(date: string): Promise<GratitudeEntry | null> {
    const row = await databaseService.getFirstAsync<any>(
      'SELECT * FROM gratitude_entries WHERE date = ?',
      [date]
    );

    if (!row) return null;

    const items = await this.getItemsForEntry(row.id);

    return {
      id: row.id,
      date: row.date,
      entries: items,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async saveEntry(entry: GratitudeEntry): Promise<void> {
    await databaseService.transaction(async () => {
      // Insert or update entry
      await databaseService.executeSql(
        `INSERT OR REPLACE INTO gratitude_entries (id, date, createdAt, updatedAt)
         VALUES (?, ?, ?, ?)`,
        [entry.id, entry.date, entry.createdAt, entry.updatedAt]
      );

      // Delete existing items for this entry
      await databaseService.executeSql(
        'DELETE FROM gratitude_items WHERE entryId = ?',
        [entry.id]
      );

      // Insert new items
      for (let i = 0; i < entry.entries.length; i++) {
        const item = entry.entries[i];
        if (item.trim()) {
          await databaseService.executeSql(
            'INSERT INTO gratitude_items (entryId, itemText, itemOrder) VALUES (?, ?, ?)',
            [entry.id, item, i]
          );
        }
      }
    });
  }

  async deleteEntry(id: string): Promise<void> {
    await databaseService.executeSql(
      'DELETE FROM gratitude_entries WHERE id = ?',
      [id]
    );
  }

  async getEntriesByDateRange(startDate: string, endDate: string): Promise<GratitudeEntry[]> {
    const rows = await databaseService.getAllAsync<any>(
      'SELECT * FROM gratitude_entries WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [startDate, endDate]
    );

    const entries: GratitudeEntry[] = [];
    for (const row of rows) {
      const items = await this.getItemsForEntry(row.id);
      entries.push({
        id: row.id,
        date: row.date,
        entries: items,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    return entries;
  }

  async getEntryCount(): Promise<number> {
    const row = await databaseService.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM gratitude_entries'
    );
    return row?.count || 0;
  }

  private async getItemsForEntry(entryId: string): Promise<string[]> {
    const rows = await databaseService.getAllAsync<{ itemText: string }>(
      'SELECT itemText FROM gratitude_items WHERE entryId = ? ORDER BY itemOrder ASC',
      [entryId]
    );

    return rows.map(row => row.itemText);
  }
}

export const gratitudeRepositorySQLite = new GratitudeRepositorySQLite();