import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface QuestionOneScreenProps {
  onNext: (answer: string) => void;
}

export function QuestionOneScreen({ onNext }: QuestionOneScreenProps) {
  const { currentTheme } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: 'daily', emoji: '✨', text: 'Every day', subtext: "It's part of my routine" },
    { id: 'few-times', emoji: '📅', text: 'A few times a week', subtext: "I'm working on consistency" },
    { id: 'occasionally', emoji: '☁️', text: 'Occasionally', subtext: "When I remember" },
    { id: 'rarely', emoji: '🌱', text: 'Rarely or never', subtext: "I want to start" },
  ];

  const handleSelect = (id: string) => {
    setSelected(id);
    setTimeout(() => {
      onNext(id);
    }, 300);
  };

  const styles = createStyles(currentTheme);

  return (
    <LinearGradient
      colors={currentTheme.colors}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
          </View>

          <View style={styles.questionContainer}>
            <Text style={styles.questionIcon}>📖</Text>
            <Text style={styles.questionText}>
              How often do you read the Bible?
            </Text>
            <Text style={styles.questionSubtext}>
              Be honest - there's no wrong answer
            </Text>
          </View>

          <ScrollView 
            style={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  selected === option.id && styles.optionCardSelected,
                ]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionText}>{option.text}</Text>
                  <Text style={styles.optionSubtext}>{option.subtext}</Text>
                </View>
                {selected === option.id && (
                  <View style={[styles.checkmark, { backgroundColor: currentTheme.accent }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.accent,
  },
  progressDotInactive: {
    backgroundColor: theme.accent + '4D', // 30% opacity
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  questionIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSubtext: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.cardBorder,
  },
  optionCardSelected: {
    backgroundColor: theme.accent + '33', // 20% opacity
    borderColor: theme.accent,
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  optionSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});