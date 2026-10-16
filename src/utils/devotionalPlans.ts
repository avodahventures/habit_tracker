export interface DevotionalDay {
  day: number;
  verseReference: string;
  verseText: string;
  reflection: string;
  habitSuggestion: string;
}

export interface DevotionalPlan {
  id: string;
  title: string;
  description: string;
  icon: string;
  days: DevotionalDay[];
}

export const DEVOTIONAL_PLANS: DevotionalPlan[] = require('../../assets/devotionalPlans.json');

export function getDevotionalPlan(planId: string): DevotionalPlan | undefined {
  return DEVOTIONAL_PLANS.find(p => p.id === planId);
}

export function parseCompletedDays(completedDaysJson: string | undefined): number[] {
  if (!completedDaysJson) return [];
  try {
    const parsed = JSON.parse(completedDaysJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The next day to work on: one past the highest completed day, capped at the plan length. */
export function getCurrentDay(plan: DevotionalPlan, completedDays: number[]): number {
  if (completedDays.length === 0) return 1;
  const next = Math.max(...completedDays) + 1;
  return Math.min(next, plan.days.length);
}

export function isPlanComplete(plan: DevotionalPlan, completedDays: number[]): boolean {
  return plan.days.every(d => completedDays.includes(d.day));
}
