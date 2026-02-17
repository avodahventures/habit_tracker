import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { db, JournalEntry } from '../database/database';
import { useFocusEffect } from '@react-navigation/native';
import { PremiumModal } from '../components/PremiumModal';
import { exportJournalToPDF, exportJournalToExcel } from '../utils/export';

export function JournalScreen() {
  const { currentTheme } = useTheme();
  const { isPremium } = usePremium();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entryText, setEntryText] = useState('');
  const [entryTags, setEntryTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
    setSelectedTag(null);

    if (!isPremium) {
      setPremiumFeature('Search & Filter');
      setPremiumModalVisible(true);
      return;
    }

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

  const handleTagFilter = async (tag: string) => {
    if (!isPremium) {
      setPremiumFeature('Tag Filtering');
      setPremiumModalVisible(true);
      return;
    }

    if (selectedTag === tag) {
      setSelectedTag(null);
      setFilteredEntries(entries);
      setSearchQuery('');
    } else {
      setSelectedTag(tag);
      setSearchQuery('');
      try {
        const results = await db.getJournalEntriesByTag(tag);
        setFilteredEntries(results);
      } catch (error) {
        console.error('Error filtering by tag:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!entryText.trim()) {
      Alert.alert('Error', 'Please write something in your journal entry');
      return;
    }

    if (entryTags.trim() && !isPremium) {
      setPremiumFeature('Journal Tags');
      setPremiumModalVisible(true);
      return;
    }

    try {
      const date = new Date().toISOString().split('T')[0];

      if (editingEntry) {
        await db.updateJournalEntry(editingEntry.id, entryText, entryTags);
      } else {
        await db.addJournalEntry(date, entryText, entryTags);
      }

      setModalVisible(false);
      setEntryText('');
      setEntryTags('');
      setEditingEntry(null);
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEntryText(entry.content);
    setEntryTags(entry.tags);
    setModalVisible(true);
  };

  const handleDelete = (entry: JournalEntry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.deleteJournalEntry(entry.id);
            loadEntries();
          } catch (error) {
            console.error('Error deleting entry:', error);
          }
        },
      },
    ]);
  };

  const handleExportPDF = async () => {
    if (!isPremium) {
      setPremiumFeature('Export to PDF');
      setPremiumModalVisible(true);
      setShowExportMenu(false);
      return;
    }

    try {
      setExporting(true);
      setShowExportMenu(false);
      await exportJournalToPDF(filteredEntries.length > 0 ? filteredEntries : entries);
      Alert.alert('Success', 'Journal exported successfully!');
    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert('Error', 'Failed to export journal to PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!isPremium) {
      setPremiumFeature('Export to Spreadsheet');
      setPremiumModalVisible(true);
      setShowExportMenu(false);
      return;
    }

    try {
      setExporting(true);
      setShowExportMenu(false);
      await exportJournalToExcel(filteredEntries.length > 0 ? filteredEntries : entries);
      Alert.alert('Success', 'Journal exported successfully!');
    } catch (error) {
      console.error('Export Excel error:', error);
      Alert.alert('Error', 'Failed to export journal to spreadsheet');
    } finally {
      setExporting(false);
    }
  };

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    entries.forEach(entry => {
      if (entry.tags) {
        entry.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet);
  };

  const allTags = getAllTags();
  const displayedEntries = filteredEntries.length > 0 ? filteredEntries : entries;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Prayer Journal
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: currentTheme.accent }]}
              onPress={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.exportButtonText}>Export</Text>
                  {!isPremium && <Text style={styles.exportButtonText}> 👑</Text>}
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: currentTheme.accent }]}
              onPress={() => {
                setEditingEntry(null);
                setEntryText('');
                setEntryTags('');
                setModalVisible(true);
              }}
            >
              <Text style={styles.addButtonText}>+ New Entry</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Export Menu Dropdown */}
        {showExportMenu && (
          <View style={styles.exportMenu}>
            <TouchableOpacity
              style={styles.exportMenuItem}
              onPress={handleExportPDF}
            >
              <Text style={styles.exportMenuText}>
                📄 Export as PDF
              </Text>
              {!isPremium && <Text style={styles.premiumBadge}>👑 Premium</Text>}
            </TouchableOpacity>
            <View style={styles.exportMenuDivider} />
            <TouchableOpacity
              style={styles.exportMenuItem}
              onPress={handleExportExcel}
            >
              <Text style={styles.exportMenuText}>
                📊 Export as Spreadsheet
              </Text>
              {!isPremium && <Text style={styles.premiumBadge}>👑 Premium</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
          Record your spiritual journey
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: currentTheme.textPrimary }]}
            placeholder="Search entries..."
            placeholderTextColor={currentTheme.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {!isPremium && (
            <View style={styles.premiumBadgeSmall}>
              <Text style={styles.premiumBadgeText}>👑</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {allTags.length > 0 && (
          <View style={styles.tagsContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={allTags}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor:
                        selectedTag === item ? currentTheme.accent : currentTheme.cardBackground,
                    },
                  ]}
                  onPress={() => handleTagFilter(item)}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      {
                        color: selectedTag === item ? '#FFFFFF' : currentTheme.textPrimary,
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Entries List */}
      {displayedEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No journal entries yet.{'\n'}Start recording your spiritual journey!
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedEntries}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.entryCard, { backgroundColor: currentTheme.cardBackground }]}>
              <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: currentTheme.accent }]}>
                  {new Date(item.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => handleEdit(item)}>
                    <Text style={[styles.actionButton, { color: currentTheme.accent }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteButton}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {item.tags && (
                <View style={styles.entryTags}>
                  {item.tags.split(',').map((tag, index) => (
                    <View
                      key={index}
                      style={[styles.entryTag, { backgroundColor: currentTheme.colors[1] }]}
                    >
                      <Text style={[styles.entryTagText, { color: currentTheme.accent }]}>
                        {tag.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.entryContent, { color: currentTheme.textPrimary }]}>
                {item.content}
              </Text>
            </View>
          )}
        />
      )}

      {/* Add/Edit Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              {editingEntry ? 'Edit Entry' : 'New Entry'}
            </Text>

            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: currentTheme.cardBackground,
                  color: currentTheme.textPrimary,
                },
              ]}
              placeholder="What's on your heart today?"
              placeholderTextColor={currentTheme.textSecondary}
              value={entryText}
              onChangeText={setEntryText}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />

            <View style={styles.tagsInputContainer}>
              <TextInput
                style={[
                  styles.tagsInput,
                  {
                    backgroundColor: currentTheme.cardBackground,
                    color: currentTheme.textPrimary,
                  },
                ]}
                placeholder="Tags (comma separated)"
                placeholderTextColor={currentTheme.textSecondary}
                value={entryTags}
                onChangeText={setEntryTags}
              />
              {!isPremium && (
                <View style={styles.premiumBadgeInput}>
                  <Text style={styles.premiumBadgeText}>👑 Premium</Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: currentTheme.cardBackground }]}
                onPress={() => {
                  setModalVisible(false);
                  setEntryText('');
                  setEntryTags('');
                  setEditingEntry(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: currentTheme.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: currentTheme.accent }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Modal */}
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
    padding: 20,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exportMenu: {
    position: 'absolute',
    top: 70,
    right: 90,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1000,
    minWidth: 240,
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  exportMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  exportMenuDivider: {
    height: 1,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  premiumBadgeSmall: {
    marginLeft: 8,
  },
  premiumBadgeText: {
    fontSize: 16,
  },
  tagsContainer: {
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  entryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entryTagText: {
    fontSize: 12,
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
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 200,
  },
  tagsInputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  tagsInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  premiumBadgeInput: {
    position: 'absolute',
    right: 12,
    top: 12,
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