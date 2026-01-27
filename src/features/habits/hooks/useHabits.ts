import { useState, useEffect, useCallback } from 'react';
import { Habit } from '../../../core/models/Habit';
import { habitRepository } from '../repositories/HabitRepository';

export const useHabits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    try {
      setLoading(true);
      const allHabits = await habitRepository.getAllHabits();
      setHabits(allHabits);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const createHabit = async (habit: Habit): Promise<void> => {
    try {
      await habitRepository.saveHabit(habit);
      await loadHabits();
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  };

  const updateHabit = async (habit: Habit): Promise<void> => {
    try {
      await habitRepository.saveHabit(habit);
      await loadHabits();
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  };

  const deleteHabit = async (id: string): Promise<void> => {
    try {
      await habitRepository.deleteHabit(id);
      await loadHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  };

  const toggleHabitActive = async (id: string): Promise<void> => {
    try {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;

      const updatedHabit: Habit = {
        ...habit,
        isActive: !habit.isActive,
        updatedAt: new Date().toISOString(),
      };

      await habitRepository.saveHabit(updatedHabit);
      await loadHabits();
    } catch (error) {
      console.error('Error toggling habit active:', error);
      throw error;
    }
  };

  const dailyHabits = habits.filter(h => h.frequency === 'daily' && h.isActive);
  const weeklyHabits = habits.filter(h => h.frequency === 'weekly' && h.isActive);
  const monthlyHabits = habits.filter(h => h.frequency === 'monthly' && h.isActive);

  return {
    habits,
    dailyHabits,
    weeklyHabits,
    monthlyHabits,
    loading,
    refreshHabits: loadHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabitActive,
  };
};