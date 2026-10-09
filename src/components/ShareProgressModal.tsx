import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../context/ThemeContext';

interface ShareProgressModalProps {
  visible: boolean;
  onClose: () => void;
  totalHabits: number;
  completedHabits: number;
  bestStreak: number;
  verseReference?: string;
}

export function ShareProgressModal({
  visible,
  onClose,
  totalHabits,
  completedHabits,
  bestStreak,
  verseReference,
}: ShareProgressModalProps) {
  const { currentTheme } = useTheme();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const allComplete = totalHabits > 0 && completedHabits === totalHabits;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleShare = async () => {
    if (!cardRef.current) return;

    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share My Progress',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Error sharing progress card:', error);
      Alert.alert('Error', 'Failed to create your progress card.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[0] }]}>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Share My Progress
          </Text>

          <View style={styles.cardWrapper} collapsable={false} ref={cardRef}>
            <LinearGradient
              colors={currentTheme.colors}
              style={styles.card}
            >
              <Text style={styles.brand}>🙏 Faith Habit Tracker</Text>
              <Text style={styles.date}>{today}</Text>

              <Text style={styles.headline}>
                {allComplete ? '🎉 All Habits Complete!' : `${completedHabits}/${totalHabits} Habits Completed Today`}
              </Text>

              {bestStreak > 0 && (
                <Text style={styles.streak}>🔥 {bestStreak} Day Streak</Text>
              )}

              {verseReference && (
                <Text style={styles.verse}>📖 Today's Verse: {verseReference}</Text>
              )}
            </LinearGradient>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: currentTheme.accent }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: currentTheme.accent }]}>
                Close
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: currentTheme.accent }]}
              onPress={handleShare}
              disabled={sharing}
            >
              <Text style={styles.shareButtonText}>
                {sharing ? 'Preparing...' : '📤 Share'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardWrapper: {
    width: 300,
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    width: 300,
    minHeight: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 28,
  },
  headline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  streak: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  verse: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
