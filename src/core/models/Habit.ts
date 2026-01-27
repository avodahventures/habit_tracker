export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  name: string;
  icon?: string;
  reminderTime?: string;
  streak: number;
  lastCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  isActive: boolean;
  frequency: HabitFrequency; // NEW
}

export type CreateHabitInput = {
  name: string;
  icon?: string;
  reminderTime?: string;
  isDefault?: boolean;
  frequency?: HabitFrequency; // NEW - defaults to 'daily'
};

export type UpdateHabitInput = Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>;