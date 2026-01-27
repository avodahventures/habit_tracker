import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface QuestionTwoScreenProps {
  onNext: (answer: string) => void;
}

export function QuestionTwoScreen({ onNext }: QuestionTwoScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: 'strong', emoji: '⭐', text: 'Strong & consistent', subtext: "Prayer is my daily anchor" },
    { id: 'growing', emoji: '🌿', text: 'Growing', subtext: "I'm building the habit" },
    { id: 'inconsistent', emoji: '🌤️', text: 'Inconsistent', subtext: "Some days are better than others" },
    { id: 'struggling', emoji: '💬', text: 'Struggling', subtext: "I want to pray more" },
  ];

  const handleSelect = (id: string) => {
    setSelected(id);
    setTimeout(() => {
      onNext(id);
    }, 300);
  };

  return (
    <LinearGradient
      colors={['#1E3A5F', '#2D4A6F', '#3D5A7F']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
          </View>

          <View style={styles.questionContainer}>
            <Text style={styles.questionIcon}>🙏</Text>
            <Text style={styles.questionText}>
              How's your prayer life?
            </Text>
            <Text style={styles.questionSubtext}>
              We all have room to grow
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
                  <View style={styles.checkmark}>
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

const styles = StyleSheet.create({
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
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
  },
  progressDotInactive: {
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  questionIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderColor: '#60A5FA',
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
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});