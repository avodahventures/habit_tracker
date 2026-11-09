import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { usePremium, PREMIUM_PRICE_LABEL } from '../context/PremiumContext';

export function ExpirationPromptModal() {
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { shouldShowExpirationPrompt, subscriptionExpiresAt, continueFree } = usePremium();

  // Was this triggered by the trial ending for the first time, or a paid
  // year lapsing? A non-null subscriptionExpiresAt means they subscribed at
  // least once before, even if that subscription has since expired.
  const isRenewal = subscriptionExpiresAt !== null;

  const handleContinueFree = () => {
    continueFree();
  };

  const handleSubscribe = () => {
    continueFree(); // mark this expiration as handled so the prompt won't reappear
    navigation.navigate('Payment');
  };

  return (
    <Modal visible={shouldShowExpirationPrompt} animationType="fade" transparent={true}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={[styles.card, { backgroundColor: currentTheme.colors[1] }]}>
          <Text style={styles.icon}>👑</Text>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            {isRenewal ? 'Your Premium Year Has Ended' : 'Your Free Trial Has Ended'}
          </Text>
          <Text style={[styles.message, { color: currentTheme.textSecondary }]}>
            {isRenewal
              ? 'Renew Premium to keep your journal tools, devotional plans, and verse memorization features.'
              : "You've had 30 days of full Premium access. Continue for just " +
                PREMIUM_PRICE_LABEL +
                ', or keep using the free plan.'}
          </Text>

          <TouchableOpacity
            style={[styles.subscribeButton, { backgroundColor: currentTheme.accent }]}
            onPress={handleSubscribe}
          >
            <Text style={styles.subscribeButtonText}>
              {isRenewal ? `Renew — ${PREMIUM_PRICE_LABEL}` : `Continue Premium — ${PREMIUM_PRICE_LABEL}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.freeButton} onPress={handleContinueFree}>
            <Text style={[styles.freeButtonText, { color: currentTheme.textSecondary }]}>
              Continue with Free Plan
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  subscribeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  freeButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  freeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
