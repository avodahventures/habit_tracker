import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, JournalEntry } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

export function JournalScreen() {
  const { currentTheme } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entryText, setEntryText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useFocusEffect(
    React.useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    try {
      const data = await db.getJournalEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryText.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    try {
      if (editingEntry) {
        await db.updateJournalEntry(editingEntry.id, entryText);
      } else {
        await db.addJournalEntry(selectedDate, entryText);
      }
      
      setModalVisible(false);
      setEntryText('');
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
    setModalVisible(true);
  };

  const handleDeleteEntry = (id: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors[0] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Journal 📖</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.accent }]}
          onPress={() => {
            setEditingEntry(null);
            setEntryText('');
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New Entry</Text>
        </TouchableOpacity>
      </View>

      {entries.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            No journal entries yet.{'\n'}Start writing your spiritual journey!
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
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
              <Text style={[styles.entryContent, { color: currentTheme.textPrimary }]}>
                {item.content}
              </Text>
            </View>
          )}
        />
      )}

      {/* Modal for adding/editing entries */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors[1] }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
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
              placeholder="Write your thoughts..."
              placeholderTextColor={currentTheme.textSecondary}
              multiline
              numberOfLines={10}
              value={entryText}
              onChangeText={setEntryText}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: currentTheme.cardBackground }]}
                onPress={() => {
                  setModalVisible(false);
                  setEntryText('');
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
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
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
    paddingTop: 10,
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
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
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
    height: 200,
    borderWidth: 1,
    marginBottom: 20,
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