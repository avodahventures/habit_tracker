import { db } from '../database/database';

export interface NotificationMessage {
  title: string;
  body: string;
}

export function setupNotificationHandler(): void {
  console.log('In-app notification handler ready');
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  return undefined;
}

export async function scheduleHabitReminders(): Promise<void> {
  return;
}

export async function checkHabitsAndNotify(): Promise<NotificationMessage | null> {
  try {
    const habits = await db.getHabits();
    const logs = await db.getTodayLogs();

    const logsMap: Record<number, number> = {};
    logs.forEach(log => {
      logsMap[log.habitId] = log.completed;
    });

    const today = new Date();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = weekdays[today.getDay()];

    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const todayHabitsPromises = habits.map(async (habit) => {
      if (!habit.frequency || habit.frequency === 'daily') {
        return habit;
      }
      if (habit.frequency === 'weekly') {
        if (!habit.weekday || habit.weekday === 'Any weekday') {
          const weekLogs = await db.getHabitLogs(habit.id, weekStartStr, weekEndStr);
          const completedThisWeek = weekLogs.some(log => log.completed === 1);
          if (!completedThisWeek) {
            return habit;
          }
          return null;
        }
        if (habit.weekday === todayName) {
          return habit;
        }
      }
      return null;
    });

    const todayHabitsResults = await Promise.all(todayHabitsPromises);
    const todayHabits = todayHabitsResults.filter(h => h !== null);

    const totalHabits = todayHabits.length;
    const completedHabits = todayHabits.filter(h => logsMap[h!.id] === 1).length;
    const remainingHabits = totalHabits - completedHabits;

    const currentHour = new Date().getHours();

    if (remainingHabits === 0 && totalHabits > 0) {
      return {
        title: '🎉 Amazing Work!',
        body: `You've completed all ${totalHabits} habits today! God is proud of your dedication. 🙏✨`,
      };
    }

    if (remainingHabits > 0) {
      return getEncouragementMessage(remainingHabits, currentHour);
    }

    return null;
  } catch (error) {
    console.error('Error checking habits:', error);
    return null;
  }
}

// Mini celebration message shown after each habit is checked
export function getMiniCelebrationMessage(
  habitName: string,
  completedCount: number,
  totalCount: number
): NotificationMessage {
  const remaining = totalCount - completedCount;

  const messages = [
    {
      title: `✅ Great job!`,
      body: remaining > 0
        ? `"${habitName}" done! ${remaining} more habit${remaining > 1 ? 's' : ''} to go. Keep it up! 💪`
        : `"${habitName}" done! All habits complete! 🎉`,
    },
    {
      title: `⭐ Well done!`,
      body: remaining > 0
        ? `Keep going — ${remaining} habit${remaining > 1 ? 's' : ''} left today. You've got this! 🙏`
        : `All habits done today! God is pleased. 🎉`,
    },
    {
      title: `💙 Nice work!`,
      body: remaining > 0
        ? `${completedCount} of ${totalCount} done. Stay strong, finish well! ✨`
        : `Perfect day! Every habit complete. Praise God! 🙌`,
    },
    {
      title: `🙏 Faithful step!`,
      body: remaining > 0
        ? `${remaining} habit${remaining > 1 ? 's' : ''} remaining. A little more effort for God! 💫`
        : `Outstanding! You honored God with every habit today! 🌟`,
    },
  ];

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

function getEncouragementMessage(remaining: number, currentHour: number): NotificationMessage {
  const morningMessages = [
    {
      title: '🌅 Good Morning',
      body: `You have ${remaining} spiritual habit${remaining > 1 ? 's' : ''} today. Start the day right with God!`,
    },
    {
      title: '☀️ Rise and Shine',
      body: `${remaining} habit${remaining > 1 ? 's' : ''} ahead of you today. Let's get started!`,
    },
  ];

  const noonMessages = [
    {
      title: '🙏 Gentle Reminder',
      body: `You have ${remaining} spiritual habit${remaining > 1 ? 's' : ''} left today. Take a moment to connect with God.`,
    },
    {
      title: '☀️ Midday Check-In',
      body: `${remaining} habit${remaining > 1 ? 's' : ''} remaining. God's grace is with you - keep going!`,
    },
    {
      title: '💙 You\'re Doing Great',
      body: `${remaining} more to go. Remember, progress over perfection. God loves your effort!`,
    },
  ];

  const eveningMessages = [
    {
      title: '🌙 Evening Reminder',
      body: `Before the day ends, you have ${remaining} habit${remaining > 1 ? 's' : ''} left. You've got this!`,
    },
    {
      title: '✨ Almost There',
      body: `Just ${remaining} more habit${remaining > 1 ? 's' : ''} to complete your spiritual journey today.`,
    },
    {
      title: '🙏 Gentle Nudge',
      body: `${remaining} habit${remaining > 1 ? 's' : ''} remaining. Take a few minutes for your soul before bed.`,
    },
  ];

  const pool = currentHour < 12 ? morningMessages : currentHour < 17 ? noonMessages : eveningMessages;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export async function sendImmediateNotification(
  title: string,
  body: string
): Promise<NotificationMessage> {
  return { title, body };
}