import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_HOURS_KEY = 'reminderHours';

export const DEFAULT_REMINDER_HOURS = [12, 18];

export interface ReminderTimeOption {
  hour: number;
  label: string;
}

export const REMINDER_TIME_OPTIONS: ReminderTimeOption[] = [
  { hour: 9, label: '9:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 18, label: '6:00 PM' },
  { hour: 21, label: '9:00 PM' },
];

export async function getReminderHours(): Promise<number[]> {
  try {
    const stored = await AsyncStorage.getItem(REMINDER_HOURS_KEY);
    if (stored) {
      const hours = JSON.parse(stored);
      if (Array.isArray(hours) && hours.every(h => typeof h === 'number')) {
        return hours;
      }
    }
  } catch (error) {
    console.error('Error loading reminder hours:', error);
  }
  return DEFAULT_REMINDER_HOURS;
}

export async function setReminderHours(hours: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_HOURS_KEY, JSON.stringify(hours));
  } catch (error) {
    console.error('Error saving reminder hours:', error);
  }
}
