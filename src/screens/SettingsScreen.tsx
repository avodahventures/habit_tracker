import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { themes, ThemeType } from '../utils/themes';
import { db, Habit } from '../database/database';

interface DefaultHabit {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const DEFAULT_HABITS: DefaultHabit[] = [
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

export function SettingsScreen() {
  const { currentTheme, themeType, setTheme } = useTheme();
  const { isPremium, setPremium } = usePremium();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedDefaultHabits, setSelectedDefaultHabits] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [habitName, setHabitName] = useState('');

  // Collapsible state
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [habitsExpanded, setHabitsExpanded] = useState(true);
  const [premiumExpanded, setPremiumExpanded] = useState(false);

  useEffect(() => {
    loadHabits();
    loadSelectedDefaultHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const data = await db.getHabits();
      setHabits(data);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadSelectedDefaultHabits = async () => {
    try {
      const stored = await AsyncStorage.getItem('selectedDefaultHabits');
      if (stored) {
        setSelectedDefaultHabits(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading selected default habits:', error);
    }
  };

  const saveSelectedDefaultHabits = async (selected: Set<string>) => {
    try {
      await AsyncStorage.setItem('selectedDefaultHabits', JSON.stringify(Array.from(selected)));
    } catch (error) {
      console.error('Error saving selected default habits:', error);
    }
  };

  const toggleDefaultHabit = async (defaultHabit: DefaultHabit) => {
    const newSelected = new Set(selectedDefaultHabits);
    
    if (newSelected.has(defaultHabit.id)) {
      // Remove from selected and delete from database
      newSelected.delete(defaultHabit.id);
      
      // Find and delete the habit from database
      const existingHabit = habits.find(h => h.name === defaultHabit.name);
      if (existingHabit) {
        try {
          await db.deleteHabit(existingHabit.id);
          await loadHabits();
        } catch (error) {
          console.error('Error deleting habit:', error);
        }
      }
    } else {
      // Add to selected and insert into database
      newSelected.add(defaultHabit.id);
      
      try {
        await db.addHabit({
          name: defaultHabit.name,
          icon: defaultHabit.icon,
          color: currentTheme.accent,
          frequency: 'daily',
        });
        await loadHabits();
      } catch (error) {
        console.error('Error adding habit:', error);
      }
    }
    
    setSelectedDefaultHabits(newSelected);
    await saveSelectedDefaultHabits(newSelected);
  };

  const handleAddHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      await db.addHabit({
        name: habitName,
        icon: '✨',
        color: currentTheme.accent,
        frequency: 'daily',
      });

      setModalVisible(false);
      setHabitName('');
      loadHabits();
    } catch (error) {
      console.error('Error adding habit:', error);
      Alert.alert('Error', 'Failed to add habit');
    }
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
              
              // If it was a default habit, remove from selected
              const defaultHabit = DEFAULT_HABITS.find(dh => dh.name === name);
              if (defaultHabit) {
                const newSelected = new Set(selectedDefaultHabits);
                newSelected.delete(defaultHabit.id);
                setSelectedDefaultHabits(newSelected);
                await saveSelectedDefaultHabits(newSelected);
              }
              
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

  // Separate custom habits (not in default list)
  const customHabits = habits.filter(
    habit => !DEFAULT_HABITS.some(dh => dh.name === habit.name)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Settings</Text>

        {/* Premium Status Section - For Testing */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => setPremiumExpanded(!premiumExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                👑 Premium Status
              </Text>
              <View style={[styles.badge, { backgroundColor: isPremium ? '#22C55E' : '#F59E0B' }]}>
                <Text style={styles.badgeText}>{isPremium ? 'Active' : 'Free'}</Text>
              </View>
            </View>
            <Text style={[styles.expandIcon, { color: currentTheme.textPrimary }]}>
              {premiumExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {premiumExpanded && (
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                Premium features include tagging, filtering, and exporting journal entries
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
                  {isPremium ? '✓ Premium Active' : 'Toggle Premium (Test Mode)'}
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

        {/* Reset Onboarding - For Testing */}
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

        {/* Habits Section - Collapsible */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.sectionHeaderButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={() => setHabitsExpanded(!habitsExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>
                ✅ My Habits
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
                {DEFAULT_HABITS.map((defaultHabit) => (
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
                          selectedDefaultHabits.has(defaultHabit.id) && {
                            backgroundColor: currentTheme.accent,
                          },
                        ]}
                      >
                        {selectedDefaultHabits.has(defaultHabit.id) && (
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
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
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
                          Daily • Custom
                        </Text>
                      </View>
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

      {/* Add Custom Habit Modal */}
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
                onPress={handleAddHabit}
              >
                <Text style={styles.saveButtonText}>Add Habit</Text>
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
  defaultHabitCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  defaultHabitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});