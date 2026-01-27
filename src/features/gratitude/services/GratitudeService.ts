import { GratitudeEntry } from '../../../core/models/GratitudeEntry';
import { gratitudeRepositorySQLite } from '../repositories/GratitudeRepositorySQLite';

export class GratitudeService {
  async getTodayEntry(): Promise<GratitudeEntry | null> {
    const today = new Date().toISOString().split('T')[0];
    return await gratitudeRepositorySQLite.getEntryByDate(today);
  }

  async saveEntry(date: string, entries: string[]): Promise<GratitudeEntry> {
    const existingEntry = await gratitudeRepositorySQLite.getEntryByDate(date);
    const now = new Date().toISOString();

    const entry: GratitudeEntry = {
      id: existingEntry?.id || `gratitude_${Date.now()}`,
      date,
      entries: entries.filter(e => e.trim() !== ''),
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    };

    await gratitudeRepositorySQLite.saveEntry(entry);
    return entry;
  }

  async getAllEntries(): Promise<GratitudeEntry[]> {
    return await gratitudeRepositorySQLite.getAllEntries();
  }

  async deleteEntry(id: string): Promise<void> {
    await gratitudeRepositorySQLite.deleteEntry(id);
  }

  async getEntriesForMonth(year: number, month: number): Promise<GratitudeEntry[]> {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return await gratitudeRepositorySQLite.getEntriesByDateRange(startDate, endDate);
  }
}

// Export singleton instance
export const gratitudeService = new GratitudeService();