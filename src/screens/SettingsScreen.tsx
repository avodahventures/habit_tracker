import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { usePremium, PREMIUM_PRICE_LABEL } from '../context/PremiumContext';
import { useUserProfile } from '../context/UserProfileContext';
import { themes, ThemeType } from '../utils/themes';
import { db, Habit } from '../database/database';
import { DEFAULT_HABITS, DefaultHabit } from '../utils/defaultHabits';
import { REMINDER_TIME_OPTIONS, getReminderHours, setReminderHours } from '../utils/reminderSettings';
import { scheduleHabitReminders } from '../utils/pushNotifications';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Dev-only switch for the "Premium Status" and "Reset Onboarding" testing
// sections below. Flip to true when you need them for debugging, false to
// hide them again before shipping/demoing.
const SHOW_DEBUG_SETTINGS = true;

export function SettingsScreen() {
  const { currentTheme, themeType, setTheme } = useTheme();
  const {
    isPremium,
    setPremium,
    isTrialActive,
    trialDaysRemaining,
    hasActiveSubscription,
    subscriptionExpiresAt,
    simulateTrialExpired,
    resetTrialAndSubscription,
  } = usePremium();
  const navigation = useNavigation<any>();
  const { name, setName: saveName } = useUserProfile();
  const [nameExpanded, setNameExpanded] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [frequencyModalVisible, setFrequencyModalVisible] = useState(false);
  const [weekdayModalVisible, setWeekdayModalVisible] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [pendingHabit, setPendingHabit] = useState<{ name: string; icon: string } | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<'daily' | 'weekly'>('daily');
  const [selectedWeekday, setSelectedWeekday] = useState<string>('Any weekday');

  // Collapsible state
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [remindersExpanded, setRemindersExpanded] = useState(false);
  const [habitsExpanded, setHabitsExpanded] = useState(true);
  const [premiumExpanded, setPremiumExpanded] = useState(false);
  const [debugPremiumExpanded, setDebugPremiumExpanded] = useState(false);
  const [reminderHours, setReminderHoursState] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
      loadReminderHours();
    }, [])
  );

  const loadHabits = async () => {
    try {
      const data = await db.getHabits();
      setHabits(data);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadReminderHours = async () => {
    const hours = await getReminderHours();
    setReminderHoursState(hours);
  };

  const toggleReminderHour = async (hour: number) => {
    const newHours = reminderHours.includes(hour)
      ? reminderHours.filter(h => h !== hour)
      : [...reminderHours, hour].sort((a, b) => a - b);

    setReminderHoursState(newHours);
    await setReminderHours(newHours);

    const scheduled = await scheduleHabitReminders(newHours);
    if (!scheduled && newHours.length > 0) {
      Alert.alert(
        'Notifications Disabled',
        'Reminders are saved, but you\'ll need to enable notifications for this app in your device Settings to actually receive them.'
      );
    }
  };

  const toggleDefaultHabit = async (defaultHabit: DefaultHabit) => {
    const existingHabit = habits.find(h => h.name === defaultHabit.name);

    if (existingHabit) {
      try {
        await db.deleteHabit(existingHabit.id);
        await loadHabits();
      } catch (error) {
        console.error('Error deleting habit:', error);
      }
    } else {
      // Show frequency selection dialog
      setPendingHabit({ name: defaultHabit.name, icon: defaultHabit.icon });
      setSelectedFrequency('daily');
      setSelectedWeekday('Any weekday');
      setFrequencyModalVisible(true);
    }
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setPendingHabit({ name: habit.name, icon: habit.icon });
    setSelectedFrequency(habit.frequency === 'weekly' ? 'weekly' : 'daily');
    setSelectedWeekday(habit.weekday || 'Any weekday');
    setFrequencyModalVisible(true);
  };

  const handleFrequencySelected = () => {
    if (selectedFrequency === 'weekly') {
      setFrequencyModalVisible(false);
      setWeekdayModalVisible(true);
    } else {
      // Daily - save immediately
      confirmAddHabit();
    }
  };

  const handleWeekdaySelected = () => {
    setWeekdayModalVisible(false);
    confirmAddHabit();
  };

  const closeFrequencyModals = () => {
    setFrequencyModalVisible(false);
    setWeekdayModalVisible(false);
    setPendingHabit(null);
    setEditingHabitId(null);
  };

  const confirmAddHabit = async () => {
    if (!pendingHabit) return;

    try {
      if (editingHabitId) {
        await db.updateHabitSchedule(
          editingHabitId,
          selectedFrequency,
          selectedFrequency === 'weekly' ? selectedWeekday : undefined
        );
      } else {
        await db.addHabit({
          name: pendingHabit.name,
          icon: pendingHabit.icon,
          color: currentTheme.accent,
          frequency: selectedFrequency,
          weekday: selectedFrequency === 'weekly' ? selectedWeekday : undefined,
        });
      }

      await loadHabits();
      setPendingHabit(null);
      setEditingHabitId(null);
      setFrequencyModalVisible(false);
      setWeekdayModalVisible(false);
    } catch (error) {
      console.error('Error saving habit:', error);
      Alert.alert('Error', 'Failed to save habit');
    }
  };

  const handleAddCustomHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    setModalVisible(false);
    setPendingHabit({ name: habitName, icon: '✨' });
    setSelectedFrequency('daily');
    setSelectedWeekday('Any weekday');
    setHabitName('');
    setFrequencyModalVisible(true);
  };

  const handleDeleteHabit = (id: number, name: string) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteHabit(id);
              loadHabits();
            } catch (error) {
              console.error('Error deleting habit:', error);
            }
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear your onboarding status. You\'ll need to close and restart the app to see the onboarding screens again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('hasCompletedOnboarding');
              Alert.alert(
                'Success',
                'Onboarding reset! Please close the app completely and restart it to see the onboarding screens.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding');
            }
          },
        },
      ]
    );
  };

  const getHabitFrequencyText = (habit: Habit): string => {
    if (habit.frequency === 'daily') {
      return 'Daily';
    } else if (habit.frequency === 'weekly') {
      return habit.weekday ? `Weekly • ${habit.weekday}` : 'Weekly • Any weekday';
    }
    return 'Daily';
  };

  // Separate custom habits (not in default list)
  // Any habit not shown under a Default Habits row - includes non-default
  // names as well as duplicate habits that happen to share a default's name
  // (e.g. a habit added twice under the same name), so nothing is hidden.
  const customHabits = habits.filter(habit => {
    const isDefaultName = DEFAULT_HABITS.some(dh => dh.name === habit.name);
    if (!isDefaultName) return true;
    const firstMatch = habits.find(h => h.name === habit.name);
    return firstMatch?.id !== habit.id;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Settings</Text>

        {/* Your Name Section - Collapsible */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => {
              if (!nameExpanded) setNameInput(name);
              setNameExpanded(!nameExpanded);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                👤 Your Name
              </Text>
              <View style={[styles.badge, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.badgeText}>{name || 'Not set'}</Text>
              </View>
            </View>
            <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
              {nameExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {nameExpanded && (
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                Used for a personal greeting on the Home screen.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary },
                ]}
                placeholder="Your name"
                placeholderTextColor={currentTheme.textSecondary}
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[styles.nameSaveButton, { backgroundColor: currentTheme.accent }]}
                onPress={() => saveName(nameInput.trim())}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Premium Section - always visible, shows real trial/subscription status */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => setPremiumExpanded(!premiumExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                ✨ Premium
              </Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isPremium ? '#22C55E' : '#F59E0B' },
                ]}
              >
                <Text style={styles.badgeText}>
                  {hasActiveSubscription ? 'Active' : isTrialActive ? 'Trial' : 'Free'}
                </Text>
              </View>
            </View>
            <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
              {premiumExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {premiumExpanded && (
            <View style={styles.sectionContent}>
              {hasActiveSubscription ? (
                <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                  Your Premium subscription is active until{' '}
                  {subscriptionExpiresAt ? new Date(subscriptionExpiresAt).toLocaleDateString() : ''}.
                </Text>
              ) : isTrialActive ? (
                <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                  You're on your 30-day free trial — {trialDaysRemaining}{' '}
                  {trialDaysRemaining === 1 ? 'day' : 'days'} left. After that, you'll be asked to
                  continue Premium for {PREMIUM_PRICE_LABEL} or switch to the free plan.
                </Text>
              ) : (
                <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                  You're on the free plan. Upgrade to Premium for {PREMIUM_PRICE_LABEL} to unlock
                  journaling, devotional plans, and verse memorization tools.
                </Text>
              )}

              {!hasActiveSubscription && (
                <TouchableOpacity
                  style={[styles.premiumToggle, { backgroundColor: currentTheme.accent }]}
                  onPress={() => navigation.navigate('Payment')}
                >
                  <Text style={[styles.premiumToggleText, { color: '#FFFFFF' }]}>
                    Upgrade to Premium — {PREMIUM_PRICE_LABEL}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Premium Test Override - For Testing - dev-only */}
        {SHOW_DEBUG_SETTINGS && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
              onPress={() => setDebugPremiumExpanded(!debugPremiumExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                  👑 Premium Test Override
                </Text>
                <View style={[styles.badge, { backgroundColor: isPremium ? '#22C55E' : '#F59E0B' }]}>
                  <Text style={styles.badgeText}>{isPremium ? 'Active' : 'Free'}</Text>
                </View>
              </View>
              <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
                {debugPremiumExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {debugPremiumExpanded && (
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                  Force-overrides the real 30-day trial / $5-per-year subscription logic above, for
                  testing. Reset to go back to real trial/subscription behavior.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.premiumToggle,
                    {
                      backgroundColor: isPremium ? '#22C55E' : currentTheme.cardBackground,
                      borderColor: isPremium ? '#22C55E' : currentTheme.accent,
                      borderWidth: 2
                    }
                  ]}
                  onPress={() => setPremium(!isPremium)}
                >
                  <Text style={[
                    styles.premiumToggleText,
                    { color: isPremium ? '#FFFFFF' : currentTheme.textPrimary }
                  ]}>
                    {isPremium ? '✓ Premium Active (Override)' : 'Toggle Premium (Test Mode)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.freeButton}
                  onPress={() => setPremium(null)}
                >
                  <Text style={[styles.freeButtonText, { color: currentTheme.textSecondary }]}>
                    Reset to real trial/subscription logic
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.subsectionTitle, { color: currentTheme.textPrimary, marginTop: 16 }]}>
                  Simulate the 30-day trial
                </Text>
                <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                  This jumps the stored trial start date into the past so you can see the real
                  expiration prompt fire, without waiting 30 real days. Testing the {PREMIUM_PRICE_LABEL}
                  purchase and renewal themselves requires a Sandbox Apple ID on a real device
                  (StoreKit doesn't run in the simulator) — ask me for those steps when you're ready.
                </Text>

                <TouchableOpacity
                  style={[styles.simulateButton, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.accent }]}
                  onPress={() => {
                    simulateTrialExpired();
                    Alert.alert('Trial Expired', 'Trial start date moved back 31 days. Navigate to the Home tab to see the expiration prompt.');
                  }}
                >
                  <Text style={[styles.simulateButtonText, { color: currentTheme.textPrimary }]}>
                    ⏩ Simulate trial expired (Day 31)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simulateButton, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.cardBorder }]}
                  onPress={() => {
                    resetTrialAndSubscription();
                    Alert.alert('Reset', 'Trial restarted from today (Day 1).');
                  }}
                >
                  <Text style={[styles.simulateButtonText, { color: currentTheme.textPrimary }]}>
                    🔄 Reset trial to Day 1
                  </Text>
                </TouchableOpacity>

                {isPremium && (
                  <View style={[styles.premiumFeatures, { backgroundColor: currentTheme.colors[1] }]}>
                    <Text style={[styles.premiumFeaturesTitle, { color: currentTheme.textPrimary }]}>
                      Premium Features Unlocked:
                    </Text>
                    <Text style={[styles.premiumFeature, { color: currentTheme.textSecondary }]}>
                      ✓ Tag journal entries
                    </Text>
                    <Text style={[styles.premiumFeature, { color: currentTheme.textSecondary }]}>
                      ✓ Filter by tags
                    </Text>
                    <Text style={[styles.premiumFeature, { color: currentTheme.textSecondary }]}>
                      ✓ Export to PDF/Spreadsheet
                    </Text>
                    <Text style={[styles.premiumFeature, { color: currentTheme.textSecondary }]}>
                      ✓ 30 Days & 12 Months Dashboard
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Reset Onboarding - For Testing - dev-only */}
        {SHOW_DEBUG_SETTINGS && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
              onPress={handleResetOnboarding}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                  🔄 Reset Onboarding
                </Text>
                <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.badgeText}>Testing</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Theme Section - Collapsible */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => setThemeExpanded(!themeExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                🎨 Theme
              </Text>
              <View style={[styles.badge, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.badgeText}>{themes[themeType].name}</Text>
              </View>
            </View>
            <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
              {themeExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {themeExpanded && (
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                Choose your preferred background
              </Text>

              {(Object.keys(themes) as ThemeType[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: themeType === key ? currentTheme.accent : currentTheme.cardBorder,
                      borderWidth: themeType === key ? 3 : 2,
                    },
                  ]}
                  onPress={() => setTheme(key)}
                >
                  <View style={styles.themePreview}>
                    <View style={[styles.themePreviewBox, { backgroundColor: themes[key].colors[0] }]} />
                    <View style={[styles.themePreviewBox, { backgroundColor: themes[key].colors[1] }]} />
                    <View style={[styles.themePreviewBox, { backgroundColor: themes[key].colors[2] }]} />
                  </View>
                  <View style={styles.themeTextContainer}>
                    <Text style={[styles.themeName, { color: currentTheme.textPrimary }]}>
                      {themes[key].name}
                    </Text>
                    {themeType === key && (
                      <Text style={[styles.themeSelected, { color: currentTheme.accent }]}>
                        ✓ Selected
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Reminders Section - Collapsible */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => setRemindersExpanded(!remindersExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                🔔 Reminders
              </Text>
              <View style={[styles.badge, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.badgeText}>{reminderHours.length}</Text>
              </View>
            </View>
            <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
              {remindersExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {remindersExpanded && (
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                Choose when you'd like a gentle nudge about unfinished habits. We'll send a phone
                notification at each selected time (you may be asked to allow notifications).
              </Text>

              {REMINDER_TIME_OPTIONS.map((option) => {
                const isSelected = reminderHours.includes(option.hour);
                return (
                  <TouchableOpacity
                    key={option.hour}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: currentTheme.cardBackground,
                        borderColor: isSelected ? currentTheme.accent : currentTheme.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => toggleReminderHour(option.hour)}
                  >
                    <View
                      style={[
                        styles.defaultCheckbox,
                        { borderColor: currentTheme.accent },
                        isSelected && { backgroundColor: currentTheme.accent },
                      ]}
                    >
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.reminderOptionText, { color: currentTheme.textPrimary }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Habits Section - Collapsible */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => setHabitsExpanded(!habitsExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                ✅ My Habits Manager
              </Text>
              <View style={[styles.badge, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.badgeText}>{habits.length}</Text>
              </View>
            </View>
            <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
              {habitsExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {habitsExpanded && (
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                Select from default habits or create your own
              </Text>

              {/* Default Habits */}
              <View style={styles.defaultHabitsSection}>
                <Text style={[styles.subsectionTitle, { color: currentTheme.textPrimary }]}>
                  Default Habits
                </Text>
                {DEFAULT_HABITS.map((defaultHabit) => {
                  const existingHabit = habits.find(h => h.name === defaultHabit.name);
                  return (
                    <TouchableOpacity
                      key={defaultHabit.id}
                      style={[styles.defaultHabitCard, { backgroundColor: currentTheme.cardBackground }]}
                      onPress={() => toggleDefaultHabit(defaultHabit)}
                    >
                      <View style={styles.defaultHabitLeft}>
                        <View
                          style={[
                            styles.defaultCheckbox,
                            { borderColor: currentTheme.accent },
                            !!existingHabit && {
                              backgroundColor: currentTheme.accent,
                            },
                          ]}
                        >
                          {!!existingHabit && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.defaultHabitIcon}>{defaultHabit.icon}</Text>
                        <View style={styles.defaultHabitInfo}>
                          <Text style={[styles.defaultHabitName, { color: currentTheme.textPrimary }]}>
                            {defaultHabit.name}
                          </Text>
                          <Text style={[styles.defaultHabitDescription, { color: currentTheme.textSecondary }]}>
                            {defaultHabit.description}
                          </Text>
                          {existingHabit && (
                            <Text style={[styles.habitFrequencyLabel, { color: currentTheme.accent }]}>
                              {getHabitFrequencyText(existingHabit)}
                            </Text>
                          )}
                        </View>
                      </View>
                      {existingHabit && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditHabit(existingHabit)}
                        >
                          <Text style={styles.editButtonText}>✏️</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Add Custom Habit Button */}
              <TouchableOpacity
                style={[styles.addCustomButton, { backgroundColor: currentTheme.accent }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addCustomButtonText}>+ Add Custom Habit</Text>
              </TouchableOpacity>

              {/* Custom Habits List */}
              {customHabits.length > 0 && (
                <View style={styles.customHabitsSection}>
                  <Text style={[styles.subsectionTitle, { color: currentTheme.textPrimary }]}>
                    Custom Habits
                  </Text>
                  {customHabits.map((habit) => (
                    <View
                      key={habit.id}
                      style={[styles.habitCard, { backgroundColor: currentTheme.cardBackground }]}
                    >
                      <Text style={styles.habitIcon}>{habit.icon}</Text>
                      <View style={styles.habitInfo}>
                        <Text style={[styles.habitName, { color: currentTheme.textPrimary }]}>
                          {habit.name}
                        </Text>
                        <Text style={[styles.habitFrequency, { color: currentTheme.textSecondary }]}>
                          {getHabitFrequencyText(habit)} • Custom
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditHabit(habit)}
                      >
                        <Text style={styles.editButtonText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteHabit(habit.id, habit.name)}>
                        <Text style={styles.deleteButton}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Custom Habit Name Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              New Custom Habit
            </Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.cardBackground,
                color: currentTheme.textPrimary 
              }]}
              placeholder="Habit name (e.g., Learn a New Language)"
              placeholderTextColor={currentTheme.textSecondary}
              value={habitName}
              onChangeText={setHabitName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: currentTheme.cardBackground }]}
                onPress={() => {
                  setModalVisible(false);
                  setHabitName('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: currentTheme.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: currentTheme.accent }]} 
                onPress={handleAddCustomHabit}
              >
                <Text style={styles.saveButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Frequency Selection Modal */}
      <Modal visible={frequencyModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              How often?
            </Text>
            <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary }]}>
              {editingHabitId ? 'Update the frequency for this habit' : 'Choose the frequency for this habit'}
            </Text>

            <TouchableOpacity
              style={[
                styles.frequencyOption,
                { 
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: selectedFrequency === 'daily' ? currentTheme.accent : currentTheme.cardBorder,
                  borderWidth: 2,
                }
              ]}
              onPress={() => setSelectedFrequency('daily')}
            >
              <Text style={[styles.frequencyOptionText, { color: currentTheme.textPrimary }]}>
                📅 Daily
              </Text>
              <Text style={[styles.frequencyOptionSubtext, { color: currentTheme.textSecondary }]}>
                Track this habit every day
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.frequencyOption,
                { 
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: selectedFrequency === 'weekly' ? currentTheme.accent : currentTheme.cardBorder,
                  borderWidth: 2,
                }
              ]}
              onPress={() => setSelectedFrequency('weekly')}
            >
              <Text style={[styles.frequencyOptionText, { color: currentTheme.textPrimary }]}>
                📆 Weekly
              </Text>
              <Text style={[styles.frequencyOptionSubtext, { color: currentTheme.textSecondary }]}>
                Track this habit on specific days
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: currentTheme.cardBackground }]}
                onPress={closeFrequencyModals}
              >
                <Text style={[styles.cancelButtonText, { color: currentTheme.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: currentTheme.accent }]}
                onPress={handleFrequencySelected}
              >
                <Text style={styles.saveButtonText}>
                  {selectedFrequency === 'weekly' ? 'Next' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weekday Selection Modal */}
      <Modal visible={weekdayModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              Which day?
            </Text>
            <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary }]}>
              Select a specific day or any weekday
            </Text>

            <ScrollView style={styles.weekdayScroll}>
              <TouchableOpacity
                style={[
                  styles.weekdayOption,
                  { 
                    backgroundColor: currentTheme.cardBackground,
                    borderColor: selectedWeekday === 'Any weekday' ? currentTheme.accent : currentTheme.cardBorder,
                    borderWidth: 2,
                  }
                ]}
                onPress={() => setSelectedWeekday('Any weekday')}
              >
                <Text style={[styles.weekdayOptionText, { color: currentTheme.textPrimary }]}>
                  Any weekday
                </Text>
              </TouchableOpacity>

              {WEEKDAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.weekdayOption,
                    { 
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: selectedWeekday === day ? currentTheme.accent : currentTheme.cardBorder,
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => setSelectedWeekday(day)}
                >
                  <Text style={[styles.weekdayOptionText, { color: currentTheme.textPrimary }]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: currentTheme.cardBackground }]}
                onPress={() => {
                  setWeekdayModalVisible(false);
                  setFrequencyModalVisible(true);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: currentTheme.textPrimary }]}>
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: currentTheme.accent }]} 
                onPress={handleWeekdaySelected}
              >
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContent: {
    paddingHorizontal: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  premiumToggle: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumToggleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumFeatures: {
    padding: 16,
    borderRadius: 12,
  },
  premiumFeaturesTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  premiumFeature: {
    fontSize: 14,
    marginBottom: 6,
    paddingLeft: 8,
  },
  freeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  freeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  simulateButton: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  simulateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themePreview: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 16,
  },
  themePreviewBox: {
    width: 20,
    height: 40,
    borderRadius: 4,
  },
  themeTextContainer: {
    flex: 1,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeSelected: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  defaultHabitsSection: {
    marginBottom: 20,
  },
  reminderOption: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderOptionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  defaultHabitCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultHabitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 18,
  },
  defaultCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  defaultHabitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  defaultHabitInfo: {
    flex: 1,
  },
  defaultHabitName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  defaultHabitDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  habitFrequencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addCustomButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addCustomButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  customHabitsSection: {
    marginTop: 10,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  habitIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  habitFrequency: {
    fontSize: 14,
  },
  deleteButton: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  frequencyOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  frequencyOptionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  frequencyOptionSubtext: {
    fontSize: 14,
  },
  weekdayScroll: {
    maxHeight: 300,
  },
  weekdayOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  weekdayOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nameSaveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});