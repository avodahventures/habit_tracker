import { formatISO } from 'date-fns';
import { IStorageAdapter } from '../../../core/storage/IStorageAdapter';
import { StorageKeys } from '../../../core/storage/StorageKeys';
import { UserSettings, UpdateUserSettingsInput } from '../../../core/models/UserSettings';

export class UserSettingsRepository {
  constructor(private storage: IStorageAdapter) {}

  async getSettings(): Promise<UserSettings | null> {
    return await this.storage.getItem<UserSettings>(StorageKeys.USER_SETTINGS);
  }

  async initializeSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const newSettings: UserSettings = {
      translation: settings.translation || 'NIV',
      spiritualGoal: settings.spiritualGoal || '',
      allowReminders: settings.allowReminders ?? false,
      completedOnboarding: settings.completedOnboarding ?? false,
      reminderTime: settings.reminderTime,
      userName: settings.userName,
      createdAt: formatISO(new Date()),
      updatedAt: formatISO(new Date()),
    };

    await this.storage.setItem(StorageKeys.USER_SETTINGS, newSettings);
    return newSettings;
  }

  async updateSettings(input: UpdateUserSettingsInput): Promise<UserSettings> {
    const currentSettings = await this.getSettings();
    if (!currentSettings) {
      throw new Error('Settings not initialized');
    }

    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...input,
      updatedAt: formatISO(new Date()),
    };

    await this.storage.setItem(StorageKeys.USER_SETTINGS, updatedSettings);
    return updatedSettings;
  }

  async hasCompletedOnboarding(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings?.completedOnboarding ?? false;
  }
}