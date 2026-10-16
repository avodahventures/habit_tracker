import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { db } from '../database/database';
import { PremiumModal } from './PremiumModal';
import {
  DEVOTIONAL_PLANS,
  DevotionalPlan,
  parseCompletedDays,
  getCurrentDay,
  isPlanComplete,
} from '../utils/devotionalPlans';

interface DevotionalPlansModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModalView = 'list' | 'plan';

export function DevotionalPlansModal({ visible, onClose }: DevotionalPlansModalProps) {
  const { currentTheme } = useTheme();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<ModalView>('list');
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [progressByPlanId, setProgressByPlanId] = useState<Record<string, number[]>>({});
  const [activePlan, setActivePlan] = useState<DevotionalPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [reflectionNote, setReflectionNote] = useState('');

  useEffect(() => {
    if (visible) {
      setView('list');
      setActivePlan(null);
      loadProgress();
    }
  }, [visible]);

  const loadProgress = async () => {
    try {
      const rows = await db.getAllDevotionalProgress();
      const map: Record<string, number[]> = {};
      rows.forEach(row => {
        map[row.planId] = parseCompletedDays(row.completedDays);
      });
      setProgressByPlanId(map);
    } catch (error) {
      console.error('Error loading devotional progress:', error);
    }
  };

  const handleOpenPlan = (plan: DevotionalPlan) => {
    if (!isPremium) {
      setPremiumModalVisible(true);
      return;
    }
    const completedDays = progressByPlanId[plan.id] || [];
    setActivePlan(plan);
    setSelectedDay(getCurrentDay(plan, completedDays));
    setReflectionNote('');
    setView('plan');
  };

  const handleMarkComplete = async () => {
    if (!activePlan) return;

    try {
      await db.markDevotionalDayComplete(activePlan.id, selectedDay);

      if (reflectionNote.trim()) {
        const date = new Date().toISOString().split('T')[0];
        await db.addJournalEntry(date, reflectionNote.trim(), '', 'gratitude', false, '');
      }

      const updatedCompleted = Array.from(
        new Set([...(progressByPlanId[activePlan.id] || []), selectedDay])
      );
      setProgressByPlanId(prev => ({ ...prev, [activePlan.id]: updatedCompleted }));
      setReflectionNote('');

      if (isPlanComplete(activePlan, updatedCompleted)) {
        Alert.alert('🎉 Plan Complete!', `You've finished "${activePlan.title}". Well done!`);
      } else {
        setSelectedDay(getCurrentDay(activePlan, updatedCompleted));
      }
    } catch (error) {
      console.error('Error marking devotional day complete:', error);
      Alert.alert('Error', 'Failed to save your progress.');
    }
  };

  const handleAddHabitSuggestion = async (suggestion: string) => {
    try {
      await db.addHabit({
        name: suggestion,
        icon: '✨',
        color: '#4F46E5',
        frequency: 'daily',
      });
      Alert.alert('Added!', 'This was added to your habits.');
    } catch (error) {
      console.error('Error adding habit suggestion:', error);
      Alert.alert('Error', 'Failed to add habit.');
    }
  };

  const activeCompletedDays = activePlan ? progressByPlanId[activePlan.id] || [] : [];
  const activeDayContent = activePlan?.days.find(d => d.day === selectedDay) || null;
  const isSelectedDayDone = activeCompletedDays.includes(selectedDay);

  return (
    <>
      <Modal visible={visible && !premiumModalVisible} animationType="slide" transparent>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: currentTheme.colors[0],
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={[styles.header, { backgroundColor: currentTheme.cardBackground }]}>
            <Text style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>
              Devotional Plans
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: currentTheme.accent }]}>Close</Text>
            </TouchableOpacity>
          </View>

          {view === 'list' && (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              {!isPremium && (
                <TouchableOpacity
                  style={[styles.upgradeBanner, { backgroundColor: currentTheme.cardBackground }]}
                  onPress={() => setPremiumModalVisible(true)}
                >
                  <Text style={[styles.upgradeBannerText, { color: currentTheme.textPrimary }]}>
                    👑 Unlock guided devotional plans with Premium
                  </Text>
                </TouchableOpacity>
              )}

              {DEVOTIONAL_PLANS.map((plan) => {
                const completedDays = progressByPlanId[plan.id] || [];
                const complete = isPlanComplete(plan, completedDays);

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planCard, { backgroundColor: currentTheme.cardBackground }]}
                    onPress={() => handleOpenPlan(plan)}
                  >
                    <Text style={styles.planIcon}>{plan.icon}</Text>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planTitle, { color: currentTheme.textPrimary }]}>
                        {plan.title}
                      </Text>
                      <Text
                        style={[styles.planDescription, { color: currentTheme.textSecondary }]}
                        numberOfLines={2}
                      >
                        {plan.description}
                      </Text>
                      {isPremium && completedDays.length > 0 && (
                        <Text style={[styles.planProgress, { color: currentTheme.accent }]}>
                          {complete ? '✓ Completed' : `Day ${getCurrentDay(plan, completedDays)} of ${plan.days.length}`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {view === 'plan' && activePlan && activeDayContent && (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              <TouchableOpacity onPress={() => setView('list')}>
                <Text style={[styles.backLink, { color: currentTheme.accent }]}>← All Plans</Text>
              </TouchableOpacity>

              <Text style={[styles.activePlanTitle, { color: currentTheme.textPrimary }]}>
                {activePlan.icon} {activePlan.title}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip}>
                {activePlan.days.map((d) => {
                  const done = activeCompletedDays.includes(d.day);
                  const isSelected = d.day === selectedDay;
                  return (
                    <TouchableOpacity
                      key={d.day}
                      style={[
                        styles.dayPill,
                        { backgroundColor: currentTheme.cardBackground },
                        isSelected && { backgroundColor: currentTheme.accent },
                      ]}
                      onPress={() => setSelectedDay(d.day)}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          { color: isSelected ? '#FFFFFF' : currentTheme.textPrimary },
                        ]}
                      >
                        {done ? '✓' : d.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.dayCard, { backgroundColor: currentTheme.cardBackground }]}>
                <Text style={[styles.dayLabel, { color: currentTheme.textSecondary }]}>
                  Day {activeDayContent.day}
                </Text>
                <Text style={[styles.verseReference, { color: currentTheme.accent }]}>
                  {activeDayContent.verseReference} (KJV)
                </Text>
                <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                  "{activeDayContent.verseText}"
                </Text>

                <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
                  Reflect
                </Text>
                <Text style={[styles.reflectionText, { color: currentTheme.textPrimary }]}>
                  {activeDayContent.reflection}
                </Text>

                <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
                  Try This
                </Text>
                <Text style={[styles.habitSuggestionText, { color: currentTheme.textPrimary }]}>
                  {activeDayContent.habitSuggestion}
                </Text>
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: currentTheme.accent }]}
                  onPress={() => handleAddHabitSuggestion(activeDayContent.habitSuggestion)}
                >
                  <Text style={[styles.smallButtonText, { color: currentTheme.accent }]}>
                    + Add as Habit
                  </Text>
                </TouchableOpacity>

                {!isSelectedDayDone && (
                  <>
                    <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
                      Your Reflection (optional)
                    </Text>
                    <TextInput
                      style={[
                        styles.reflectionInput,
                        { backgroundColor: currentTheme.colors[1], color: currentTheme.textPrimary },
                      ]}
                      placeholder="Write your thoughts — saved to your Gratitude Journal"
                      placeholderTextColor={currentTheme.textSecondary}
                      value={reflectionNote}
                      onChangeText={setReflectionNote}
                      multiline
                      textAlignVertical="top"
                    />
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.markCompleteButton,
                    { backgroundColor: isSelectedDayDone ? currentTheme.colors[1] : currentTheme.accent },
                  ]}
                  onPress={handleMarkComplete}
                  disabled={isSelectedDayDone}
                >
                  <Text
                    style={[
                      styles.markCompleteButtonText,
                      !isSelectedDayDone && { color: '#FFFFFF' },
                      isSelectedDayDone && { color: currentTheme.textSecondary },
                    ]}
                  >
                    {isSelectedDayDone ? '✓ Day Complete' : 'Mark Day Complete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        feature="Devotional Plans"
      />
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  upgradeBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  upgradeBannerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  planCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  planIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  planProgress: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  activePlanTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dayStrip: {
    marginBottom: 16,
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dayPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayCard: {
    borderRadius: 16,
    padding: 20,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
  },
  reflectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  habitSuggestionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  smallButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reflectionInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  markCompleteButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  markCompleteButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
