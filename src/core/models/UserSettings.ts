export type BibleTranslation = 'NIV' | 'KJV' | 'ESV' | 'NLT' | 'NKJV' | 'ASV';

export interface UserSettings {
  translation: BibleTranslation;
  spiritualGoal: string;
  allowReminders: boolean;
  completedOnboarding: boolean;
  reminderTime?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateUserSettingsInput = Partial<Omit<UserSettings, 'createdAt' | 'updatedAt'>>;

// Translation display names
export const TRANSLATION_NAMES: Record<BibleTranslation, string> = {
  NIV: 'New International Version',
  KJV: 'King James Version',
  ESV: 'English Standard Version',
  NLT: 'New Living Translation',
  NKJV: 'New King James Version',
  ASV: 'American Standard Version',
};