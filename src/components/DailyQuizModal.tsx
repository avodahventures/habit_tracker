import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { verses, VerseOfTheDay } from '../utils/verses';

const QUIZ_RESULT_KEY = 'dailyQuizResult';

interface QuizResult {
  date: string;
  correct: boolean;
  selectedReference: string;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function generateOptions(verseOfTheDay: VerseOfTheDay): string[] {
  const otherReferences = verses
    .map(v => v.reference)
    .filter(ref => ref !== verseOfTheDay.reference);
  const distractors = shuffle(otherReferences).slice(0, 3);
  return shuffle([...distractors, verseOfTheDay.reference]);
}

interface DailyQuizModalProps {
  visible: boolean;
  onClose: () => void;
  verseOfTheDay: VerseOfTheDay;
}

export function DailyQuizModal({ visible, onClose, verseOfTheDay }: DailyQuizModalProps) {
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [priorResult, setPriorResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadTodaysResult();
      setOptions(generateOptions(verseOfTheDay));
      setSelectedOption(null);
    }
  }, [visible, verseOfTheDay]);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTodaysResult = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(QUIZ_RESULT_KEY);
      if (stored) {
        const result: QuizResult = JSON.parse(stored);
        setPriorResult(result.date === todayStr ? result : null);
      } else {
        setPriorResult(null);
      }
    } catch (error) {
      console.error('Error loading quiz result:', error);
      setPriorResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (option: string) => {
    if (selectedOption || priorResult) return;

    setSelectedOption(option);
    const correct = option === verseOfTheDay.reference;
    const result: QuizResult = { date: todayStr, correct, selectedReference: option };

    try {
      await AsyncStorage.setItem(QUIZ_RESULT_KEY, JSON.stringify(result));
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }

    setPriorResult(result);
  };

  const isAnswered = !!priorResult;
  const revealedAnswer = selectedOption || priorResult?.selectedReference || null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
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
            Daily Quiz
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: currentTheme.accent }]}>Close</Text>
          </TouchableOpacity>
        </View>

        {!loading && (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.question, { color: currentTheme.textPrimary }]}>
              Which verse is this?
            </Text>

            <View style={[styles.verseCard, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                "{verseOfTheDay.text}"
              </Text>
            </View>

            {options.map((option) => {
              const isCorrectOption = option === verseOfTheDay.reference;
              const isSelectedOption = option === revealedAnswer;

              let optionStyle = { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.cardBorder };
              if (isAnswered) {
                if (isCorrectOption) {
                  optionStyle = { backgroundColor: '#22C55E', borderColor: '#22C55E' };
                } else if (isSelectedOption) {
                  optionStyle = { backgroundColor: '#EF4444', borderColor: '#EF4444' };
                }
              }

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, optionStyle]}
                  onPress={() => handleSelectOption(option)}
                  disabled={isAnswered}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isAnswered && (isCorrectOption || isSelectedOption) ? '#FFFFFF' : currentTheme.textPrimary },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {isAnswered && (
              <View style={[styles.resultBanner, { backgroundColor: currentTheme.cardBackground }]}>
                <Text style={[styles.resultText, { color: currentTheme.textPrimary }]}>
                  {priorResult?.correct
                    ? '✓ Correct! Come back tomorrow for another one.'
                    : `✗ Not quite — the answer was ${verseOfTheDay.reference}. Come back tomorrow!`}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
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
    paddingBottom: 40,
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  verseCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  optionButton: {
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultBanner: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
