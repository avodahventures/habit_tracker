import { useState, useEffect, useCallback, useMemo } from 'react';
import { PrayerRequest, CreatePrayerRequestInput, UpdatePrayerRequestInput, PrayerCategory } from '../../../core/models/PrayerRequest';
import { PrayerRepository } from '../repositories/PrayerRepository';
import { asyncStorageAdapter } from '../../../core/storage/AsyncStorageAdapter';

export const usePrayers = () => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'answered' | 'archived'>('active');
  const [categoryFilter, setCategoryFilter] = useState<PrayerCategory | 'all'>('all');

  const repository = useMemo(() => new PrayerRepository(asyncStorageAdapter), []);

  const loadPrayers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading prayers...');
      const allPrayers = await repository.getAllPrayers();
      console.log('Loaded prayers:', allPrayers.length);
      
      // Sort by priority (Urgent > High > Normal) and then by date
      const sorted = allPrayers.sort((a, b) => {
        const priorityOrder = { Urgent: 0, High: 1, Normal: 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setPrayers(sorted);
    } catch (error) {
      console.error('Error loading prayers:', error);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);

  const createPrayer = useCallback(
    async (input: CreatePrayerRequestInput) => {
      console.log('Creating prayer:', input.title);
      const newPrayer = await repository.createPrayer(input);
      await loadPrayers();
      return newPrayer;
    },
    [repository, loadPrayers]
  );

  const updatePrayer = useCallback(
    async (id: string, input: UpdatePrayerRequestInput) => {
      console.log('Updating prayer:', id);
      await repository.updatePrayer(id, input);
      await loadPrayers();
    },
    [repository, loadPrayers]
  );

  const markAsAnswered = useCallback(
    async (id: string, answeredNote?: string) => {
      console.log('Marking prayer as answered:', id);
      await repository.markAsAnswered(id, answeredNote);
      await loadPrayers();
    },
    [repository, loadPrayers]
  );

  const addUpdate = useCallback(
    async (id: string, note: string) => {
      console.log('Adding update to prayer:', id);
      await repository.addPrayerUpdate(id, note);
      await loadPrayers();
    },
    [repository, loadPrayers]
  );

  const archivePrayer = useCallback(
    async (id: string) => {
      console.log('Archiving prayer:', id);
      await repository.archivePrayer(id);
      await loadPrayers();
    },
    [repository, loadPrayers]
  );

  const deletePrayer = useCallback(
    async (id: string) => {
      console.log('Deleting prayer:', id);
      await repository.deletePrayer(id);
      await loadPrayers();
    },
    [repository, loadPrayers]
  );

  // Filter prayers based on status and category
  const filteredPrayers = useMemo(() => {
    let filtered = prayers;

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(p => p.status === 'Active');
    } else if (filter === 'answered') {
      filtered = filtered.filter(p => p.status === 'Answered');
    } else if (filter === 'archived') {
      filtered = filtered.filter(p => p.status === 'Archived');
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered;
  }, [prayers, filter, categoryFilter]);

  const stats = useMemo(() => {
    const active = prayers.filter(p => p.status === 'Active').length;
    const answered = prayers.filter(p => p.status === 'Answered').length;
    const archived = prayers.filter(p => p.status === 'Archived').length;
    const total = prayers.length;

    return { active, answered, archived, total };
  }, [prayers]);

  return {
    prayers: filteredPrayers,
    allPrayers: prayers,
    stats,
    loading,
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    createPrayer,
    updatePrayer,
    markAsAnswered,
    addUpdate,
    archivePrayer,
    deletePrayer,
    refreshPrayers: loadPrayers,
  };
};