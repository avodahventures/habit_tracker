import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useNavigation } from '@react-navigation/native';

type SubscriptionPlan = 'monthly' | 'yearly';

export function PaymentScreen() {
  const { currentTheme } = useTheme();
  const { setPremium } = usePremium();
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [processing, setProcessing] = useState(false);

  const plans = {
    monthly: {
      price: '$4.99',
      period: 'month',
      billingCycle: 'Billed monthly',
      savings: null,
    },
    yearly: {
      price: '$39.99',
      period: 'year',
      billingCycle: 'Billed annually',
      savings: 'Save 33%',
    },
  };

  const features = [
    {
      icon: '📖',
      title: 'Prayer Journal',
      description: 'Record your spiritual journey with tags and search',
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: '30-day and 12-month progress tracking',
    },
    {
      icon: '🔍',
      title: 'Search & Filter',
      description: 'Find journal entries by keyword or tag',
    },
    {
      icon: '📄',
      title: 'Export Your Data',
      description: 'Download journal as PDF or spreadsheet',
    },
    {
      icon: '🏷️',
      title: 'Custom Tags',
      description: 'Organize journal entries with tags',
    },
    {
      icon: '🔔',
      title: 'Smart Reminders',
      description: 'Gentle notifications to stay on track',
    },
  ];

  const handlePurchase = async () => {
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      Alert.alert(
        'Success! 🎉',
        `You're now a Premium member! Enjoy all the features.`,
        [
          {
            text: 'Start Using Premium',
            onPress: () => {
              setPremium(true);
              navigation.goBack();
            },
          },
        ]
      );
      setProcessing(false);
    }, 2000);

    // TODO: Integrate with actual payment provider
    // Examples: Stripe, RevenueCat, Apple/Google In-App Purchases
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'This feature will restore your previous purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            // TODO: Implement actual restore logic
            Alert.alert('Info', 'No previous purchases found.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.closeButtonText, { color: currentTheme.textPrimary }]}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Upgrade to Premium
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Unlock powerful features for your spiritual growth
          </Text>
        </View>

        {/* Plan Selection */}
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: selectedPlan === 'monthly' ? currentTheme.accent : 'transparent',
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planPeriod, { color: currentTheme.textPrimary }]}>
                  Monthly
                </Text>
                <Text style={[styles.planBilling, { color: currentTheme.textSecondary }]}>
                  {plans.monthly.billingCycle}
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: currentTheme.accent }]}>
                {plans.monthly.price}
                <Text style={[styles.planPriceUnit, { color: currentTheme.textSecondary }]}>
                  /{plans.monthly.period}
                </Text>
              </Text>
            </View>
            {selectedPlan === 'monthly' && (
              <View style={[styles.selectedBadge, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.selectedBadgeText}>✓ Selected</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: selectedPlan === 'yearly' ? currentTheme.accent : 'transparent',
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            {plans.yearly.savings && (
              <View style={[styles.savingsBadge, { backgroundColor: '#22C55E' }]}>
                <Text style={styles.savingsBadgeText}>{plans.yearly.savings}</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planPeriod, { color: currentTheme.textPrimary }]}>
                  Yearly
                </Text>
                <Text style={[styles.planBilling, { color: currentTheme.textSecondary }]}>
                  {plans.yearly.billingCycle}
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: currentTheme.accent }]}>
                {plans.yearly.price}
                <Text style={[styles.planPriceUnit, { color: currentTheme.textSecondary }]}>
                  /{plans.yearly.period}
                </Text>
              </Text>
            </View>
            {selectedPlan === 'yearly' && (
              <View style={[styles.selectedBadge, { backgroundColor: currentTheme.accent }]}>
                <Text style={styles.selectedBadgeText}>✓ Selected</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: currentTheme.textPrimary }]}>
            What You Get
          </Text>
          {features.map((feature, index) => (
            <View
              key={index}
              style={[styles.featureItem, { backgroundColor: currentTheme.cardBackground }]}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: currentTheme.textPrimary }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Terms */}
        <Text style={[styles.terms, { color: currentTheme.textSecondary }]}>
          Cancel anytime. Subscription automatically renews unless cancelled at least 24 hours
          before the end of the current period.
        </Text>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: currentTheme.colors[1] }]}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
        >
          <Text style={[styles.restoreButtonText, { color: currentTheme.accent }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: currentTheme.accent }]}
          onPress={handlePurchase}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Subscribe for {plans[selectedPlan].price}/{plans[selectedPlan].period}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planPeriod: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planBilling: {
    fontSize: 14,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  planPriceUnit: {
    fontSize: 16,
  },
  selectedBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 24,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});