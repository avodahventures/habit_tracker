import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { themes, ThemeType } from '../utils/themes';
import { db, Habit } from '../database/database';

export function SettingsScreen() {
  const { currentTheme, themeType, setTheme } = useTheme();
  const { isPremium, setPremium } = usePremium();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [habitName, setHabitName] = useState('');

  // Collapsible state
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [habitsExpanded, setHabitsExpanded] = useState(true);
  const [premiumExpanded, setPremiumExpanded] = useState(false);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const data = await db.getHabits();
      setHabits(data);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const handleAddHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      await db.addHabit({
        name: habitName,
        icon: '📖',
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
              <View style={styles.sectionHeaderActions}>
                <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>
                  Manage your daily spiritual habits
                </Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: currentTheme.accent }]}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {habits.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: currentTheme.cardBackground }]}>
                  <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                    No habits yet. Add your first habit!
                  </Text>
                </View>
              ) : (
                habits.map((habit) => (
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
                        Daily
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteHabit(habit.id, habit.name)}>
                      <Text style={styles.deleteButton}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              New Daily Habit
            </Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.cardBackground,
                color: currentTheme.textPrimary 
              }]}
              placeholder="Habit name (e.g., Morning Prayer)"
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
  sectionHeaderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    flex: 1,
    marginBottom: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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
  emptyCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
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