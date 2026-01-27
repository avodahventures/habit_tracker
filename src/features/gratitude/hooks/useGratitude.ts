import { useState, useEffect, useCallback } from 'react';
import { GratitudeEntry } from '../../../core/models/GratitudeEntry';
import { gratitudeService } from '../services/GratitudeService';

export const useGratitude = () => {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<GratitudeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const [allEntries, today] = await Promise.all([
        gratitudeService.getAllEntries(),
        gratitudeService.getTodayEntry(),
      ]);
      setEntries(allEntries);
      setTodayEntry(today);
    } catch (error) {
      console.error('Error loading gratitude entries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const saveEntry = async (date: string, entryTexts: string[]) => {
    try {
      const entry = await gratitudeService.saveEntry(date, entryTexts);
      await loadEntries();
      return entry;
    } catch (error) {
      console.error('Error saving gratitude entry:', error);
      throw error;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await gratitudeService.deleteEntry(id);
      await loadEntries();
    } catch (error) {
      console.error('Error deleting gratitude entry:', error);
      throw error;
    }
  };

  return {
    entries,
    todayEntry,
    loading,
    saveEntry,
    deleteEntry,
    refresh: loadEntries,
  };
};