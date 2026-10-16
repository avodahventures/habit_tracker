import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const CELEBRATION_COUNT_KEY = 'fullCelebrationCount';
const REVIEW_PROMPT_COUNT_KEY = 'reviewPromptCount';

// Only try at these celebration counts, and never more than MAX_PROMPTS
// times total - a good-citizen cap that also roughly matches how often
// the OS itself is willing to show the native prompt.
const MILESTONE_COUNTS = [3, 15, 45];
const MAX_PROMPTS = 3;

export async function recordFullCelebrationAndMaybePromptReview(): Promise<void> {
  try {
    const countStr = await AsyncStorage.getItem(CELEBRATION_COUNT_KEY);
    const count = (countStr ? parseInt(countStr, 10) : 0) + 1;
    await AsyncStorage.setItem(CELEBRATION_COUNT_KEY, String(count));

    if (!MILESTONE_COUNTS.includes(count)) {
      return;
    }

    const promptCountStr = await AsyncStorage.getItem(REVIEW_PROMPT_COUNT_KEY);
    const promptCount = promptCountStr ? parseInt(promptCountStr, 10) : 0;
    if (promptCount >= MAX_PROMPTS) {
      return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      return;
    }

    await StoreReview.requestReview();
    await AsyncStorage.setItem(REVIEW_PROMPT_COUNT_KEY, String(promptCount + 1));
  } catch (error) {
    console.error('Error handling review prompt:', error);
  }
}
