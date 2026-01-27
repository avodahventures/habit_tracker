import { PrayerRequest, CreatePrayerRequestInput, UpdatePrayerRequestInput, PrayerUpdate } from '../../../core/models/PrayerRequest';
import { IStorageAdapter } from '../../../core/storage/IStorageAdapter';
import { generateId } from '../../../shared/utils/uuid';

const PRAYERS_KEY = '@christian_habit_tracker:prayers';

export class PrayerRepository {
  constructor(private storage: IStorageAdapter) {}

  /**
   * Get all prayer requests
   */
  async getAllPrayers(): Promise<PrayerRequest[]> {
    const prayers = await this.storage.getItem<PrayerRequest[]>(PRAYERS_KEY);
    return prayers || [];
  }

  /**
   * Get prayers by status
   */
  async getPrayersByStatus(status: 'Active' | 'Answered' | 'Archived'): Promise<PrayerRequest[]> {
    const allPrayers = await this.getAllPrayers();
    return allPrayers.filter(prayer => prayer.status === status);
  }

  /**
   * Get prayer by ID
   */
  async getPrayerById(id: string): Promise<PrayerRequest | null> {
    const prayers = await this.getAllPrayers();
    return prayers.find(prayer => prayer.id === id) || null;
  }

  /**
   * Create a new prayer request
   */
  async createPrayer(input: CreatePrayerRequestInput): Promise<PrayerRequest> {
    const prayers = await this.getAllPrayers();
    const now = new Date().toISOString();

    const newPrayer: PrayerRequest = {
      id: generateId(),
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      updates: [],
    };

    prayers.push(newPrayer);
    await this.storage.setItem(PRAYERS_KEY, prayers);
    return newPrayer;
  }

  /**
   * Update a prayer request
   */
  async updatePrayer(id: string, input: UpdatePrayerRequestInput): Promise<PrayerRequest> {
    const prayers = await this.getAllPrayers();
    const index = prayers.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Prayer not found');
    }

    const updatedPrayer: PrayerRequest = {
      ...prayers[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    prayers[index] = updatedPrayer;
    await this.storage.setItem(PRAYERS_KEY, prayers);
    return updatedPrayer;
  }

  /**
   * Mark prayer as answered
   */
  async markAsAnswered(id: string, answeredNote?: string): Promise<PrayerRequest> {
    const prayers = await this.getAllPrayers();
    const index = prayers.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Prayer not found');
    }

    const now = new Date().toISOString();
    prayers[index] = {
      ...prayers[index],
      status: 'Answered',
      answeredAt: now,
      answeredNote,
      updatedAt: now,
    };

    await this.storage.setItem(PRAYERS_KEY, prayers);
    return prayers[index];
  }

  /**
   * Add an update to a prayer
   */
  async addPrayerUpdate(id: string, note: string): Promise<PrayerRequest> {
    const prayers = await this.getAllPrayers();
    const index = prayers.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Prayer not found');
    }

    const update: PrayerUpdate = {
      id: generateId(),
      note,
      createdAt: new Date().toISOString(),
    };

    prayers[index].updates.push(update);
    prayers[index].updatedAt = new Date().toISOString();

    await this.storage.setItem(PRAYERS_KEY, prayers);
    return prayers[index];
  }

  /**
   * Archive a prayer
   */
  async archivePrayer(id: string): Promise<PrayerRequest> {
    return this.updatePrayer(id, { status: 'Archived' });
  }

  /**
   * Delete a prayer permanently
   */
  async deletePrayer(id: string): Promise<void> {
    const prayers = await this.getAllPrayers();
    const filtered = prayers.filter(p => p.id !== id);
    await this.storage.setItem(PRAYERS_KEY, filtered);
  }
}
