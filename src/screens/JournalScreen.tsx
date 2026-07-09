import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { db } from '../database/database';
import { exportJournalToPDF, exportJournalToExcel } from '../utils/export';

interface JournalEntry {
  id: number;
  date: string;
  content: string;
  tags: string;
  createdAt: string;
}

export function JournalScreen() {
  const { currentTheme } = useTheme();
  const { isPremium } = usePremium();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [entryTags, setEntryTags] = useState('');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const allEntries = await db.getJournalEntries();
    setEntries(allEntries);
  };

  const handleSave = async () => {
    if (!entryText.trim()) {
      Alert.alert('Error', 'Please write something in your journal entry');
      return;
    }

    if (entryTags.trim() && !isPremium) {
      setEntryTags('');
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

  const handleCancel = () => {
    setModalVisible(false);
    setEntryText('');
    setEntryTags('');
    setEditingEntry(null);
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEntryText(entry.content);
    
    if (isPremium) {
      setEntryTags(entry.tags);
    } else {
      setEntryTags('');
    }
    
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.deleteJournalEntry(id);
          loadEntries();
        },
      },
    ]);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      loadEntries();
      return;
    }

    if (!isPremium) {
      setPremiumFeature('Search');
      setPremiumModalVisible(true);
      return;
    }

    const results = await db.searchJournalEntries(searchText);
    setEntries(results);
  };

  const handleFilterByTag = async (tag: string) => {
    if (!isPremium) {
      setPremiumFeature('Filter by Tag');
      setPremiumModalVisible(true);
      return;
    }

    if (selectedFilter === tag) {
      setSelectedFilter(null);
      loadEntries();
    } else {
      setSelectedFilter(tag);
      const results = await db.getJournalEntriesByTag(tag);
      setEntries(results);
    }
  };

  const handleExportPDF = async () => {
    if (!isPremium) {
      setPremiumFeature('Export to PDF');
      setPremiumModalVisible(true);
      return;
    }

    try {
      setShowExportMenu(false);
      await exportJournalToPDF(entries);
      Alert.alert('Success', 'Journal exported to PDF');
    } catch (error) {
      Alert.alert('Error', 'Failed to export journal');
    }
  };

  const handleExportExcel = async () => {
    if (!isPremium) {
      setPremiumFeature('Export to Excel');
      setPremiumModalVisible(true);
      return;
    }

    try {
      setShowExportMenu(false);
      await exportJournalToExcel(entries);
      Alert.alert('Success', 'Journal exported to Excel');
    } catch (error) {
      Alert.alert('Error', 'Failed to export journal');
    }
  };

  const getAllTags = (): string[] => {
    const tagsSet = new Set<string>();
    entries.forEach((entry) => {
      entry.tags.split(',').forEach((tag) => {
        const trimmedTag = tag.trim();
        if (trimmedTag) tagsSet.add(trimmedTag);
      });
    });
    return Array.from(tagsSet);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
          Prayer Journal
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingEntry(null);
            setEntryText('');
            setEntryTags('');
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: currentTheme.cardBackground }]}>
        <TextInput
          style={[styles.searchInput, { color: currentTheme.textPrimary }]}
          placeholder="Search entries..."
          placeholderTextColor={currentTheme.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
          editable={isPremium}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: currentTheme.accent }]}
          onPress={handleSearch}
          disabled={!isPremium}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
        {!isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>👑</Text>
          </View>
        )}
      </View>

      {getAllTags().length > 0 && isPremium && (
        <ScrollView horizontal style={styles.tagsContainer} showsHorizontalScrollIndicator={false}>
          {getAllTags().map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                {
                  backgroundColor:
                    selectedFilter === tag ? currentTheme.accent : currentTheme.cardBackground,
                },
              ]}
              onPress={() => handleFilterByTag(tag)}
            >
              <Text
                style={[
                  styles.tagButtonText,
                  {
                    color: selectedFilter === tag ? '#FFFFFF' : currentTheme.textPrimary,
                  },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {showExportMenu && (
        <View style={[styles.exportMenu, { backgroundColor: currentTheme.cardBackground }]}>
          <TouchableOpacity onPress={handleExportPDF}>
            <Text style={[styles.exportOption, { color: currentTheme.textPrimary }]}>
              📄 Export as PDF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportExcel}>
            <Text style={[styles.exportOption, { color: currentTheme.textPrimary }]}>
              📊 Export as Excel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExportMenu(false)}>
            <Text style={[styles.exportOption, { color: currentTheme.textSecondary }]}>
              ✕ Close
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.entryCard, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryDate, { color: currentTheme.textSecondary }]}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
              <View style={styles.entryActions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Text style={styles.actionButton}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.actionButton}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.entryContent, { color: currentTheme.textPrimary }]}>
              {item.content}
            </Text>
            {item.tags && isPremium && (
              <View style={styles.entryTags}>
                {item.tags.split(',').map((tag, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.entryTag,
                      { backgroundColor: currentTheme.accent, color: '#FFFFFF' },
                    ]}
                  >
                    {tag.trim()}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No journal entries yet
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={[styles.exportButton, { backgroundColor: currentTheme.accent }]}
        onPress={() => setShowExportMenu(!showExportMenu)}
      >
        <Text style={styles.exportButtonText}>⬇️ Export</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: currentTheme.colors[0] }]}>
          <View style={[styles.modalContainer, { backgroundColor: currentTheme.colors[0] }]}>
            <View style={[styles.modalHeader, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
                {editingEntry ? 'Edit Entry' : 'New Entry'}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: currentTheme.accent }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.buttonText, { color: currentTheme.accent }]}>
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

            <ScrollView style={styles.modalContent}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: currentTheme.cardBackground,
                    color: currentTheme.textPrimary,
                  },
                ]}
                placeholder="Write your prayer journal entry..."
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
                  editable={isPremium}
                />
                {!isPremium && (
                  <View style={styles.premiumBadgeInput}>
                    <Text style={styles.premiumBadgeText}>👑 Premium</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {premiumModalVisible && (
        <View style={styles.premiumModalOverlay}>
          <View style={[styles.premiumModalContent, { backgroundColor: currentTheme.cardBackground }]}>
            <Text style={[styles.premiumModalTitle, { color: currentTheme.textPrimary }]}>
              Premium Feature
            </Text>
            <Text style={[styles.premiumModalText, { color: currentTheme.textSecondary }]}>
              {premiumFeature} is only available for premium members.
            </Text>
            <TouchableOpacity
              style={[styles.premiumButton, { backgroundColor: currentTheme.accent }]}
              onPress={() => setPremiumModalVisible(false)}
            >
              <Text style={styles.premiumButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  searchButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 16,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    opacity: 0.5,
  },
  premiumBadgeText: {
    fontSize: 14,
  },
  tagsContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  tagButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportMenu: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    padding: 8,
  },
  exportOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  entryCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    fontSize: 18,
  },
  entryContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  entryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  exportButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 120,
  },
  modalContainer: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    minHeight: 150,
  },
  tagsInputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  tagsInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  premiumBadgeInput: {
    position: 'absolute',
    right: 8,
    top: 8,
    opacity: 0.5,
  },
  premiumModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  premiumModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  premiumModalText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  premiumButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
