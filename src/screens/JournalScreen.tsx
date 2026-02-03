import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, JournalEntry } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useFocusEffect } from '@react-navigation/native';
import { PremiumModal } from '../components/PremiumModal';

const AVAILABLE_TAGS = [
  'Answered Prayer',
  'Lesson Learned',
  'Gratitude',
  'Guidance Needed',
  'Breakthrough',
  'Testimony',
];

export function JournalScreen() {
  const { currentTheme } = useTheme();
  const { isPremium } = usePremium();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entryText, setEntryText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    try {
      const data = await db.getJournalEntries();
      setEntries(data);
      setFilteredEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredEntries(entries);
      return;
    }

    try {
      const results = await db.searchJournalEntries(query);
      setFilteredEntries(results);
    } catch (error) {
      console.error('Error searching entries:', error);
    }
  };

  const handleFilterByTag = async (tag: string) => {
    if (!isPremium) {
      setPremiumFeature('Tag filtering');
      setPremiumModalVisible(true);
      return;
    }

    if (filterTag === tag) {
      setFilterTag(null);
      setFilteredEntries(entries);
    } else {
      setFilterTag(tag);
      try {
        const results = await db.getJournalEntriesByTag(tag);
        setFilteredEntries(results);
      } catch (error) {
        console.error('Error filtering by tag:', error);
      }
    }
  };

  const handleExport = () => {
    if (!isPremium) {
      setPremiumFeature('Export to PDF/Spreadsheet');
      setPremiumModalVisible(true);
      return;
    }

    Alert.alert(
      'Export Journal',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'PDF',
          onPress: () => {
            // TODO: Implement PDF export
            Alert.alert('Coming Soon', 'PDF export will be implemented');
          },
        },
        {
          text: 'Spreadsheet',
          onPress: () => {
            // TODO: Implement spreadsheet export
            Alert.alert('Coming Soon', 'Spreadsheet export will be implemented');
          },
        },
      ]
    );
  };

  const toggleTag = (tag: string) => {
    if (!isPremium) {
      setPremiumFeature('Tagging entries');
      setPremiumModalVisible(true);
      return;
    }

    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryText.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    try {
      const tagsString = selectedTags.join(',');

      if (editingEntry) {
        await db.updateJournalEntry(editingEntry.id, entryText, tagsString);
      } else {
        await db.addJournalEntry(selectedDate, entryText, tagsString);
      }
      
      setModalVisible(false);
      setEntryText('');
      setSelectedTags([]);
      setEditingEntry(null);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEntryText(entry.content);
    setSelectedDate(entry.date);
    setSelectedTags(entry.tags ? entry.tags.split(',').filter(Boolean) : []);
    setModalVisible(true);
  };

  const handleDeleteEntry = (id: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this prayer journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteJournalEntry(id);
              loadEntries();
            } catch (error) {
              console.error('Error deleting entry:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const parseTags = (tagsString: string): string[] => {
    return tagsString ? tagsString.split(',').filter(Boolean) : [];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Prayer Journal 🙏</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Document your spiritual journey
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.accent }]}
          onPress={() => {
            setEditingEntry(null);
            setEntryText('');
            setSelectedTags([]);
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* FREE FEATURE: Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: currentTheme.textPrimary }]}
            placeholder="Search journal entries..."
            placeholderTextColor={currentTheme.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={[styles.clearButton, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionButtons}>
          {/* PREMIUM FEATURE: Tag Filter */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: currentTheme.cardBackground },
              filterTag && { borderColor: currentTheme.accent, borderWidth: 2 }
            ]}
            onPress={() => {
              if (!isPremium) {
                setPremiumFeature('Tag filtering');
                setPremiumModalVisible(true);
              } else {
                setShowTagFilter(!showTagFilter);
              }
            }}
          >
            <Text style={[styles.filterButtonText, { color: currentTheme.textPrimary }]}>
              🏷️ {isPremium ? 'Filter' : 'Filter 👑'}
            </Text>
          </TouchableOpacity>

          {/* PREMIUM FEATURE: Export */}
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: currentTheme.cardBackground }]}
            onPress={handleExport}
          >
            <Text style={[styles.exportButtonText, { color: currentTheme.textPrimary }]}>
              📤 {isPremium ? 'Export' : 'Export 👑'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PREMIUM FEATURE: Tag Filter Chips */}
      {showTagFilter && isPremium && (
        <View style={styles.tagFilterContainer}>
          <Text style={[styles.tagFilterLabel, { color: currentTheme.textSecondary }]}>
            Filter by tag:
          </Text>
          <View style={styles.tagChips}>
            {AVAILABLE_TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagChip,
                  { backgroundColor: currentTheme.cardBackground },
                  filterTag === tag && { backgroundColor: currentTheme.accent }
                ]}
                onPress={() => handleFilterByTag(tag)}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    { color: currentTheme.textPrimary },
                    filterTag === tag && { color: '#FFFFFF', fontWeight: 'bold' }
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* FREE FEATURE: Journal Entries List */}
      {filteredEntries.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            {searchQuery || filterTag 
              ? 'No entries match your search.'
              : 'No journal entries yet.\nStart documenting your spiritual journey!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const tags = parseTags(item.tags);
            return (
              <View style={[styles.entryCard, { backgroundColor: currentTheme.cardBackground }]}>
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryDate, { color: currentTheme.accent }]}>
                    {formatDate(item.date)}
                  </Text>
                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      onPress={() => handleEditEntry(item)}
                      style={styles.actionButton}
                    >
                      <Text style={[styles.editButton, { color: currentTheme.accent }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(item.id)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.deleteButton}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* PREMIUM FEATURE: Display Tags */}
                {tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {tags.map((tag, index) => (
                      <View
                        key={index}
                        style={[styles.tag, { backgroundColor: currentTheme.accent + '20' }]}
                      >
                        <Text style={[styles.tagText, { color: currentTheme.accent }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.entryContent, { color: currentTheme.textPrimary }]}>
                  {item.content}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Add/Edit Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              {editingEntry ? 'Edit Entry' : 'New Prayer Journal Entry'}
            </Text>

            <Text style={[styles.dateLabel, { color: currentTheme.textPrimary }]}>
              {formatDate(selectedDate)}
            </Text>

            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: currentTheme.cardBackground,
                  color: currentTheme.textPrimary,
                  borderColor: currentTheme.cardBorder,
                }
              ]}
              placeholder="Write your prayer, reflection, or testimony..."
              placeholderTextColor={currentTheme.textSecondary}
              multiline
              numberOfLines={10}
              value={entryText}
              onChangeText={setEntryText}
              textAlignVertical="top"
            />

            {/* PREMIUM FEATURE: Tags Selection */}
            <View style={styles.tagsSection}>
              <View style={styles.tagsSectionHeader}>
                <Text style={[styles.tagsLabel, { color: currentTheme.textPrimary }]}>
                  Tags {!isPremium && '👑'}
                </Text>
                {!isPremium && (
                  <Text style={[styles.premiumHint, { color: currentTheme.textSecondary }]}>
                    Premium feature
                  </Text>
                )}
              </View>
              <View style={styles.tagsGrid}>
                {AVAILABLE_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagOption,
                      { backgroundColor: currentTheme.cardBackground },
                      selectedTags.includes(tag) && { backgroundColor: currentTheme.accent },
                      !isPremium && { opacity: 0.5 }
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.tagOptionText,
                        { color: currentTheme.textPrimary },
                        selectedTags.includes(tag) && { color: '#FFFFFF', fontWeight: 'bold' }
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: currentTheme.cardBackground }]}
                onPress={() => {
                  setModalVisible(false);
                  setEntryText('');
                  setSelectedTags([]);
                  setEditingEntry(null);
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: currentTheme.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: currentTheme.accent }]}
                onPress={handleSaveEntry}
              >
                <Text style={styles.saveButtonText}>
                  {editingEntry ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Feature Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        feature={premiumFeature}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    fontSize: 20,
    paddingHorizontal: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exportButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tagFilterLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 40,
    borderRadius: 16,
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  entryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButton: {
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entryContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    height: 160,
    borderWidth: 1,
    marginBottom: 16,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagsLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  premiumHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});