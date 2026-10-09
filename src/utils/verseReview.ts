import { MemoryVerse } from '../database/database';

// Spaced-repetition schedule: each successful practice pushes the next
// review further out, capping at 30 days.
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export interface VerseReviewInfo {
  nextReviewDate: Date | null;
  isDue: boolean;
}

export function getVerseReviewInfo(verse: MemoryVerse): VerseReviewInfo {
  if (!verse.lastPracticedAt || verse.timesPracticed <= 0) {
    return { nextReviewDate: null, isDue: false };
  }

  const intervalIndex = Math.min(verse.timesPracticed - 1, REVIEW_INTERVALS_DAYS.length - 1);
  const intervalDays = REVIEW_INTERVALS_DAYS[intervalIndex];

  const lastPracticed = new Date(verse.lastPracticedAt);
  const nextReviewDate = new Date(lastPracticed);
  nextReviewDate.setDate(lastPracticed.getDate() + intervalDays);

  return {
    nextReviewDate,
    isDue: new Date() >= nextReviewDate,
  };
}

export function countDueVerses(memoryVerses: MemoryVerse[]): number {
  return memoryVerses.filter(v => getVerseReviewInfo(v).isDue).length;
}
