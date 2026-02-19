import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
}

export function PremiumModal({ visible, onClose, feature }: PremiumModalProps) {
  const { currentTheme } = useTheme();
  const navigation = useNavigation<any>();

  const handleUpgrade = () => {
    onClose();
    navigation.navigate('Payment');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={styles.icon}>👑</Text>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Premium Feature
          </Text>
          <Text style={[styles.message, { color: currentTheme.textSecondary }]}>
            {feature} is a premium feature.{'\n'}
            Upgrade to unlock this and many more!
          </Text>

          <View style={styles.features}>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Prayer Journal with Tags
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Advanced Analytics
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Export to PDF & Excel
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textPrimary }]}>
              ✓ Search & Filter
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: currentTheme.accent }]}
            onPress={handleUpgrade}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: currentTheme.textSecondary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
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
    marginBottom: 24,
    lineHeight: 24,
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 15,
    marginBottom: 8,
    paddingLeft: 8,
  },
  upgradeButton: {
    width: '100%',
    padding: 16,
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
    padding: 8,
  },
  closeButtonText: {
    fontSize: 14,
  },
});