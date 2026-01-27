import { useState, useEffect, useCallback } from 'react';
import { Verse } from '../../../core/models/Verse';
import { BibleTranslation } from '../../../core/models/UserSettings';
import { verseService } from '../services/VerseService';
import { UserSettingsRepository } from '../../onboarding/repositories/UserSettingsRepository';
import { asyncStorageAdapter } from '../../../core/storage/AsyncStorageAdapter';

export const useVerseOfTheDay = () => {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [translation, setTranslation] = useState<BibleTranslation>('NIV');
  const [loading, setLoading] = useState(true);

  const loadVerseOfTheDay = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading verse of the day...');

      // Get user's preferred translation
      const settingsRepo = new UserSettingsRepository(asyncStorageAdapter);
      const settings = await settingsRepo.getSettings();
      const userTranslation = settings?.translation || 'NIV';
      
      console.log('User translation:', userTranslation);
      
      // Get today's verse
      const todayVerse = verseService.getVerseOfTheDay();
      
      console.log('Today verse:', todayVerse.reference);
      
      setVerse(todayVerse);
      setTranslation(userTranslation);
    } catch (error) {
      console.error('Error loading verse of the day:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerseOfTheDay();
  }, [loadVerseOfTheDay]);

  const getVerseText = useCallback((): string => {
    if (!verse) return '';
    return verseService.getVerseText(verse, translation);
  }, [verse, translation]);

  return {
    verse,
    translation,
    verseText: getVerseText(),
    loading,
    refresh: loadVerseOfTheDay,
  };
};