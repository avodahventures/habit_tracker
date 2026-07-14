export interface DefaultHabit {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const DEFAULT_HABITS: DefaultHabit[] = [
  {
    id: 'morning-prayer',
    name: 'Morning Prayer',
    description: 'Start the day with God',
    icon: '🙏',
  },
  {
    id: 'read-bible',
    name: 'Read the Bible',
    description: 'Daily verse or short passage',
    icon: '📖',
  },
  {
    id: 'evening-reflection',
    name: 'Evening Reflection / Gratitude',
    description: 'Thank God for today',
    icon: '🌙',
  },
  {
    id: 'memorize-verse',
    name: 'Memorize a Verse',
    description: 'Optional weekly goal - Keeps Scripture central without pressure',
    icon: '💭',
  },
  {
    id: 'family-time',
    name: 'Family Time',
    description: 'Prayer, conversation, or shared activity',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    id: 'practice-kindness',
    name: 'Practice Kindness',
    description: 'Encourage someone / show Christ\'s love',
    icon: '💝',
  },
  {
    id: 'serve-others',
    name: 'Serve Others',
    description: 'Simple acts — helping, checking in, giving',
    icon: '🤝',
  },
  {
    id: 'health-stewardship',
    name: 'Health Stewardship',
    description: 'Walk, stretch, hydrate — caring for God\'s temple',
    icon: '💪',
  },
];
