import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { usePrayers } from '../features/prayer/hooks/usePrayers';
import { PrayerCategory, PrayerPriority, CreatePrayerRequestInput } from '../core/models/PrayerRequest';
import { formatDate } from '../shared/utils/dateUtils';

export function PrayerScreen() {
  const {
    prayers,
    stats,
    loading,
    filter,
    setFilter,
    createPrayer,
    markAsAnswered,
    deletePrayer,
    refreshPrayers,
  } = usePrayers();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrayerTitle, setNewPrayerTitle] = useState('');
  const [newPrayerDescription, setNewPrayerDescription] = useState('');
  const [newPrayerCategory, setNewPrayerCategory] = useState<PrayerCategory>('Personal');
  const [newPrayerPriority, setNewPrayerPriority] = useState<PrayerPriority>('Normal');

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPrayers();
    }, [refreshPrayers])
  );

  const handleAddPrayer = async () => {
    if (!newPrayerTitle.trim()) {
      Alert.alert('Error', 'Please enter a prayer request title');
      return;
    }

    try {
      const input: CreatePrayerRequestInput = {
        title: newPrayerTitle.trim(),
        description: newPrayerDescription.trim() || undefined,
        category: newPrayerCategory,
        priority: newPrayerPriority,
      };

      await createPrayer(input);
      
      // Reset form
      setNewPrayerTitle('');
      setNewPrayerDescription('');
      setNewPrayerCategory('Personal');
      setNewPrayerPriority('Normal');
      setShowAddModal(false);

      Alert.alert('Success', 'Prayer request added! 🙏');
    } catch (error) {
      console.error('Error adding prayer:', error);
      Alert.alert('Error', 'Failed to add prayer request');
    }
  };

  const handleMarkAnswered = (id: string, title: string) => {
    Alert.alert(
      'Mark as Answered',
      `Has "${title}" been answered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Answered! 🎉',
          onPress: () => markAsAnswered(id),
        },
      ]
    );
  };

  const handleDeletePrayer = (id: string, title: string) => {
    Alert.alert(
      'Delete Prayer',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePrayer(id),
        },
      ]
    );
  };

  const getPriorityColor = (priority: PrayerPriority) => {
    switch (priority) {
      case 'Urgent': return '#DC2626';
      case 'High': return '#F59E0B';
      case 'Normal': return '#6B7280';
    }
  };

  const getCategoryEmoji = (category: PrayerCategory) => {
    switch (category) {
      case 'Personal': return '🙏';
      case 'Family': return '👨‍👩‍👧‍👦';
      case 'Friends': return '🤝';
      case 'Church': return '⛪';
      case 'Health': return '🏥';
      case 'Work': return '💼';
      case 'World': return '🌍';
      case 'Other': return '📝';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Prayer Requests</Text>
          <Text style={styles.subtitle}>Bring your needs to God</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, filter === 'active' && styles.statCardActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={styles.statNumber}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, filter === 'answered' && styles.statCardActive]}
          onPress={() => setFilter('answered')}
        >
          <Text style={styles.statNumber}>{stats.answered}</Text>
          <Text style={styles.statLabel}>Answered</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, filter === 'all' && styles.statCardActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>All</Text>
        </TouchableOpacity>
      </View>

      {/* Prayer List */}
      <ScrollView style={styles.prayerList}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading prayers...</Text>
          </View>
        ) : prayers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🙏</Text>
            <Text style={styles.emptyStateTitle}>No prayer requests yet</Text>
            <Text style={styles.emptyStateText}>
              Tap the + button to add your first prayer request
            </Text>
          </View>
        ) : (
          prayers.map((prayer) => (
            <View
              key={prayer.id}
              style={[
                styles.prayerCard,
                prayer.status === 'Answered' && styles.prayerCardAnswered,
              ]}
            >
              <View style={styles.prayerHeader}>
                <View style={styles.prayerHeaderLeft}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(prayer.category)}</Text>
                  <View style={styles.prayerTitleContainer}>
                    <Text style={styles.prayerTitle}>{prayer.title}</Text>
                    <View style={styles.prayerMeta}>
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: getPriorityColor(prayer.priority) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(prayer.priority) },
                          ]}
                        >
                          {prayer.priority}
                        </Text>
                      </View>
                      <Text style={styles.categoryText}>{prayer.category}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {prayer.description && (
                <Text style={styles.prayerDescription}>{prayer.description}</Text>
              )}

              {prayer.status === 'Answered' && prayer.answeredAt && (
                <View style={styles.answeredBanner}>
                  <Text style={styles.answeredText}>
                    ✨ Answered on {formatDate(prayer.answeredAt)}
                  </Text>
                </View>
              )}

              <View style={styles.prayerFooter}>
                <Text style={styles.prayerDate}>
                  Added {formatDate(prayer.createdAt)}
                </Text>
                <View style={styles.prayerActions}>
                  {prayer.status === 'Active' && (
                    <TouchableOpacity
                      onPress={() => handleMarkAnswered(prayer.id, prayer.title)}
                    >
                      <Text style={styles.actionButton}>✓ Answered</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeletePrayer(prayer.id, prayer.title)}
                  >
                    <Text style={styles.actionButtonDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Prayer Request</Text>
            <TouchableOpacity onPress={handleAddPrayer}>
              <Text style={styles.modalSave}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prayer Request *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Health for my mom"
                value={newPrayerTitle}
                onChangeText={setNewPrayerTitle}
                autoFocus={true}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Details (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add more details about your prayer request..."
                value={newPrayerDescription}
                onChangeText={setNewPrayerDescription}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {(['Personal', 'Family', 'Friends', 'Church', 'Health', 'Work', 'World', 'Other'] as PrayerCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      newPrayerCategory === cat && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setNewPrayerCategory(cat)}
                  >
                    <Text style={styles.categoryOptionEmoji}>{getCategoryEmoji(cat)}</Text>
                    <Text style={styles.categoryOptionText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityOptions}>
                {(['Normal', 'High', 'Urgent'] as PrayerPriority[]).map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.priorityOption,
                      newPrayerPriority === pri && styles.priorityOptionSelected,
                      { borderColor: getPriorityColor(pri) },
                    ]}
                    onPress={() => setNewPrayerPriority(pri)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        newPrayerPriority === pri && { color: getPriorityColor(pri) },
                      ]}
                    >
                      {pri}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  prayerList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  prayerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prayerCardAnswered: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  prayerHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  prayerTitleContainer: {
    flex: 1,
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  prayerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280',
  },
  prayerDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  answeredBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  answeredText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  prayerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  prayerDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  prayerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  actionButtonDelete: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalSave: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    width: '22%',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  categoryOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  categoryOptionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  priorityOptionSelected: {
    backgroundColor: '#FEF3C7',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});