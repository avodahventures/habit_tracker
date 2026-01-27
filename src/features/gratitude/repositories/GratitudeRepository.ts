import { IStorageAdapter } from '../../../core/storage/IStorageAdapter';
import { GratitudeEntry } from '../../../core/models/GratitudeEntry';

const STORAGE_KEY = '@gratitude_entries';

export class GratitudeRepository {
  constructor(private storage: IStorageAdapter) {}

  async getAllEntries(): Promise<GratitudeEntry[]> {
    const data = await this.storage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    try {
      return JSON.parse(data as string);
    } catch (error) {
      console.error('Error parsing gratitude entries:', error);
      return [];
    }
  }

  async getEntryByDate(date: string): Promise<GratitudeEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find(entry => entry.date === date) || null;
  }

  async saveEntry(entry: GratitudeEntry): Promise<void> {
    const entries = await this.getAllEntries();
    const existingIndex = entries.findIndex(e => e.id === entry.id);

    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }

    await this.storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  async deleteEntry(id: string): Promise<void> {
    const entries = await this.getAllEntries();
    const filtered = entries.filter(e => e.id !== id);
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  async getEntriesByDateRange(startDate: string, endDate: string): Promise<GratitudeEntry[]> {
    const entries = await this.getAllEntries();
    return entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }
}