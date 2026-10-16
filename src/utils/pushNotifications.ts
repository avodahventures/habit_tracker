import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HABIT_REMINDER_PREFIX = 'habit-reminder-';
const ANDROID_CHANNEL_ID = 'habit-reminders';

const REMINDER_MESSAGES = [
  { title: '🙏 Time to Check In', body: 'Take a moment for your spiritual habits today.' },
  { title: '☀️ Gentle Reminder', body: "Don't forget your habits — every step matters." },
  { title: '💙 Stay Faithful', body: 'A quick check-in on your spiritual journey awaits.' },
];

export async function registerForNotificationsAsync(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Habit Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

async function cancelAllHabitReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(HABIT_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Schedules a daily repeating local notification at each given hour (0-23),
 * replacing whatever habit reminders were previously scheduled. Requests
 * notification permission if not already granted; silently does nothing if
 * permission is denied.
 */
export async function scheduleHabitReminders(hours: number[]): Promise<boolean> {
  try {
    await cancelAllHabitReminders();

    if (hours.length === 0) {
      return true;
    }

    const granted = await registerForNotificationsAsync();
    if (!granted) {
      return false;
    }

    for (let i = 0; i < hours.length; i++) {
      const hour = hours[i];
      const message = REMINDER_MESSAGES[i % REMINDER_MESSAGES.length];

      await Notifications.scheduleNotificationAsync({
        identifier: `${HABIT_REMINDER_PREFIX}${hour}`,
        content: {
          title: message.title,
          body: message.body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error scheduling habit reminders:', error);
    return false;
  }
}
