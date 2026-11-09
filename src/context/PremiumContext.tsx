import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { REVENUECAT_IOS_API_KEY, PREMIUM_ENTITLEMENT_ID } from '../config/revenuecat';

const TRIAL_START_KEY = 'trialStartDate';
const LAST_PROMPTED_KEY = 'lastPromptedExpiryKey';
const DEV_OVERRIDE_KEY = 'isPremium';

export const TRIAL_DAYS = 30;
export const PREMIUM_PRICE_LABEL = '$4.99/year';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  hasActiveSubscription: boolean;
  subscriptionExpiresAt: string | null;
  shouldShowExpirationPrompt: boolean;
  continueFree: () => Promise<void>;
  purchasePremium: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  setPremium: (status: boolean | null) => void;
  simulateTrialExpired: () => Promise<void>;
  resetTrialAndSubscription: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  isLoading: true,
  isTrialActive: false,
  trialDaysRemaining: 0,
  hasActiveSubscription: false,
  subscriptionExpiresAt: null,
  shouldShowExpirationPrompt: false,
  continueFree: async () => {},
  purchasePremium: async () => {},
  restorePurchases: async () => false,
  setPremium: () => {},
  simulateTrialExpired: async () => {},
  resetTrialAndSubscription: async () => {},
});

export const usePremium = () => useContext(PremiumContext);

function daysBetween(now: Date, later: Date): number {
  return Math.ceil((later.getTime() - now.getTime()) / 86400000);
}

// Configured synchronously at module load time (not inside a React effect)
// so Purchases is always ready before any screen — including one reached
// immediately via deep link or fast navigation — tries to call it.
try {
  Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
} catch (error) {
  console.error('Error configuring RevenueCat:', error);
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [lastPromptedKey, setLastPromptedKey] = useState<string | null>(null);
  const [devOverride, setDevOverride] = useState<boolean | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      let startDate = await AsyncStorage.getItem(TRIAL_START_KEY);
      if (!startDate) {
        startDate = new Date().toISOString();
        await AsyncStorage.setItem(TRIAL_START_KEY, startDate);
      }
      setTrialStartDate(startDate);

      const promptedKey = await AsyncStorage.getItem(LAST_PROMPTED_KEY);
      setLastPromptedKey(promptedKey);

      const override = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
      if (override === 'true') setDevOverride(true);
      else if (override === 'false') setDevOverride(false);

      Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('Error initializing premium status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const now = new Date();
  const trialEnd = trialStartDate
    ? new Date(new Date(trialStartDate).getTime() + TRIAL_DAYS * 86400000)
    : now;

  const activeEntitlement = customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  const hasActiveSubscription = !!activeEntitlement;
  const subscriptionExpiresAt = activeEntitlement?.expirationDate ?? null;

  const isTrialActive = !hasActiveSubscription && now < trialEnd;
  const trialDaysRemaining = isTrialActive ? Math.max(0, daysBetween(now, trialEnd)) : 0;

  const currentPeriodKey = hasActiveSubscription ? `sub:${subscriptionExpiresAt}` : 'trial';
  const periodExpired = !isTrialActive && !hasActiveSubscription;
  const shouldShowExpirationPrompt =
    !isLoading && devOverride === null && periodExpired && lastPromptedKey !== currentPeriodKey;

  const isPremium = devOverride !== null ? devOverride : isTrialActive || hasActiveSubscription;

  const continueFree = async () => {
    try {
      await AsyncStorage.setItem(LAST_PROMPTED_KEY, currentPeriodKey);
      setLastPromptedKey(currentPeriodKey);
    } catch (error) {
      console.error('Error saving free-tier choice:', error);
    }
  };

  const markPeriodHandled = async (info: CustomerInfo) => {
    const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
    const key = entitlement ? `sub:${entitlement.expirationDate}` : 'trial';
    await AsyncStorage.setItem(LAST_PROMPTED_KEY, key);
    setLastPromptedKey(key);
  };

  const purchasePremium = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.annual ?? offerings.current?.availablePackages[0];
      if (!pkg) {
        throw new Error('No RevenueCat package available to purchase');
      }
      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(updatedInfo);
      await markPeriodHandled(updatedInfo);
    } catch (error: any) {
      if (!error?.userCancelled) {
        console.error('Error purchasing premium:', error);
        throw error;
      }
    }
  };

  const restorePurchases = async () => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    const restored = !!info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
    if (restored) {
      await markPeriodHandled(info);
    }
    return restored;
  };

  // Dev-only "time travel" helper so the 30-day trial can be tested without
  // waiting for real time to pass. Clears the dev override and the
  // last-prompted key so the real ExpirationPromptModal actually fires off
  // the simulated trial date. Real subscription renewal/expiry has to be
  // tested with a Sandbox Apple ID (Apple's accelerated sandbox renewals),
  // since that state now lives with Apple/RevenueCat, not locally.
  const simulateTrialExpired = async () => {
    try {
      const past = new Date(now.getTime() - (TRIAL_DAYS + 1) * 86400000).toISOString();
      await AsyncStorage.setItem(TRIAL_START_KEY, past);
      setTrialStartDate(past);
      await AsyncStorage.removeItem(LAST_PROMPTED_KEY);
      setLastPromptedKey(null);
      setDevOverride(null);
      await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    } catch (error) {
      console.error('Error simulating trial expiration:', error);
    }
  };

  const resetTrialAndSubscription = async () => {
    try {
      const freshStart = now.toISOString();
      await AsyncStorage.setItem(TRIAL_START_KEY, freshStart);
      setTrialStartDate(freshStart);
      await AsyncStorage.removeItem(LAST_PROMPTED_KEY);
      setLastPromptedKey(null);
      setDevOverride(null);
      await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    } catch (error) {
      console.error('Error resetting trial:', error);
    }
  };

  // Dev-only override used by the hidden debug toggle in Settings. Pass null
  // to clear the override and fall back to real trial/subscription logic.
  const setPremium = (status: boolean | null) => {
    setDevOverride(status);
    if (status === null) {
      AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    } else {
      AsyncStorage.setItem(DEV_OVERRIDE_KEY, String(status));
    }
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoading,
        isTrialActive,
        trialDaysRemaining,
        hasActiveSubscription,
        subscriptionExpiresAt,
        shouldShowExpirationPrompt,
        continueFree,
        purchasePremium,
        restorePurchases,
        setPremium,
        simulateTrialExpired,
        resetTrialAndSubscription,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}
