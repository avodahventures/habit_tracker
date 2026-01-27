import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface PersonalizedResultScreenProps {
  answers: {
    bibleReading: string;
    prayer: string;
    struggle: string;
  };
  onFinish: () => void;
}

export function PersonalizedResultScreen({ answers, onFinish }: PersonalizedResultScreenProps) {
  const getMessage = () => {
    if (answers.struggle === 'consistency') {
      return {
        title: "We'll help you stay consistent",
        message: "Building habits takes time. We'll track your progress and celebrate every small win with you.",
        verse: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
        reference: "Galatians 6:9",
        highlights: ["track your progress", "celebrate every small win"]
      };
    } else if (answers.struggle === 'time') {
      return {
        title: "Make time for what matters",
        message: "Even 5 minutes a day with God can transform your life. Start small, and watch it grow.",
        verse: "Very early in the morning, while it was still dark, Jesus got up, left the house and went off to a solitary place, where he prayed.",
        reference: "Mark 1:35",
        highlights: ["5 minutes a day", "transform your life", "Start small"]
      };
    } else if (answers.struggle === 'motivation') {
      return {
        title: "Stay motivated with daily encouragement",
        message: "We'll remind you of your 'why' and show you the progress you're making every single day.",
        verse: "I can do all things through Christ who strengthens me.",
        reference: "Philippians 4:13",
        highlights: ["remind you of your 'why'", "progress you're making", "every single day"]
      };
    } else if (answers.struggle === 'distraction') {
      return {
        title: "Find focus in the noise",
        message: "This app will be your sacred space - a daily reminder to pause and connect with God.",
        verse: "Be still, and know that I am God.",
        reference: "Psalm 46:10",
        highlights: ["sacred space", "pause and connect with God"]
      };
    } else {
      return {
        title: "Go deeper in your faith",
        message: "Consistency builds depth. Track your spiritual disciplines and watch your relationship with God flourish.",
        verse: "Draw near to God, and he will draw near to you.",
        reference: "James 4:8",
        highlights: ["Consistency builds depth", "relationship with God flourish"]
      };
    }
  };

  const content = getMessage();

  const renderBoldText = (text: string, highlights: string[], style: any) => {
    let parts = [{ text, bold: false }];
    
    highlights.forEach(highlight => {
      const newParts: Array<{ text: string; bold: boolean }> = [];
      parts.forEach(part => {
        if (part.bold) {
          newParts.push(part);
        } else {
          const splitText = part.text.split(highlight);
          splitText.forEach((chunk, index) => {
            if (index > 0) {
              newParts.push({ text: highlight, bold: true });
            }
            if (chunk) {
              newParts.push({ text: chunk, bold: false });
            }
          });
        }
      });
      parts = newParts;
    });

    return (
      <Text style={style}>
        {parts.map((part, index) => (
          part.bold ? (
            <Text key={index} style={styles.boldText}>{part.text}</Text>
          ) : (
            <Text key={index}>{part.text}</Text>
          )
        ))}
      </Text>
    );
  };

  return (
    <LinearGradient
      colors={['#1E3A5F', '#2D4A6F', '#3D5A7F']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>{content.title}</Text>

          <View style={styles.messageCard}>
            {renderBoldText(content.message, content.highlights, styles.message)}
          </View>

          <View style={styles.verseCard}>
            <Text style={styles.verseText}>"{content.verse}"</Text>
            <Text style={styles.verseReference}>— {content.reference}</Text>
          </View>

          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Here's how we'll help you:</Text>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>📅</Text>
              {renderBoldText(
                "Daily habit tracking that fits your schedule",
                ["Daily habit tracking", "fits your schedule"],
                styles.benefitText
              )}
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>📊</Text>
              {renderBoldText(
                "See your spiritual growth over time",
                ["spiritual growth", "over time"],
                styles.benefitText
              )}
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>🎯</Text>
              {renderBoldText(
                "Stay accountable to your goals",
                ["Stay accountable", "your goals"],
                styles.benefitText
              )}
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>💛</Text>
              {renderBoldText(
                "Celebrate every step with you",
                ["Celebrate every step"],
                styles.benefitText
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={onFinish}>
            <Text style={styles.buttonText}>Start My Journey 🚀</Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emoji: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  verseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  verseText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 12,
  },
  verseReference: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '600',
  },
  benefitsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  button: {
    backgroundColor: '#60A5FA',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});