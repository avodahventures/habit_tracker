import { CreateHabitInput } from '../../core/models/Habit';

export const DEFAULT_HABITS: CreateHabitInput[] = [
  {
    name: 'Bible Reading',
    icon: '📖',
    isDefault: true,
    frequency: 'daily',
  },
  {
    name: 'Prayer',
    icon: '🙏',
    isDefault: true,
    frequency: 'daily',
  },
  {
    name: 'Gratitude',
    icon: '🌟',
    isDefault: true,
    frequency: 'daily',
  },
  {
    name: 'Scripture Memorization',
    icon: '💭',
    isDefault: true,
    frequency: 'weekly',
  },
  {
    name: 'Acts of Kindness',
    icon: '❤️',
    isDefault: true,
    frequency: 'daily',
  },
];