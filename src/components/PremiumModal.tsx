import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
}

export function PremiumModal({ visible, onClose, feature }: PremiumModalProps) {
  const { currentTheme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
          <Text style={styles.premiumIcon}>👑</Text>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Premium Feature
          </Text>
          <Text style={[styles.message, { color: currentTheme.textSecondary }]}>
            {feature} is a premium feature.{'\n\n'}
            Upgrade to unlock:
          </Text>

          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Tag and filter journal entries
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Export as PDF or spreadsheet
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Advanced search and filtering
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Unlimited journal entries
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: currentTheme.accent }]}
            onPress={() => {
              // TODO: Implement in-app purchase
              alert('Coming soon! In-app purchase will be implemented here.');
              onClose();
            }}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: currentTheme.textPrimary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  premiumIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 15,
    marginBottom: 10,
    paddingLeft: 8,
  },
  upgradeButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});