import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, JournalEntry } from '../database/database';

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await db.getJournalEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write something');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (editingEntry) {
        await db.updateJournalEntry(editingEntry.id, content);
      } else {
        await db.addJournalEntry(today, content);
      }
      
      setModalVisible(false);
      setContent('');
      setEditingEntry(null);
      loadEntries();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setContent(entry.content);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingEntry(null);
            setContent('');
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New Entry</Text>
        </TouchableOpacity>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No journal entries yet</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <Text style={styles.entryDate}>{item.date}</Text>
              <Text style={styles.entryContent} numberOfLines={3}>
                {item.content}
              </Text>
              <View style={styles.entryActions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteButton}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingEntry ? 'Edit Entry' : 'New Entry'}
            </Text>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Write your thoughts..."
              placeholderTextColor="#888"
              value={content}
              onChangeText={setContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setContent('');
                  setEditingEntry(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
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
    backgroundColor: '#1E3A5F',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  entryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 14,
    color: '#60A5FA',
    marginBottom: 8,
    fontWeight: '600',
  },
  entryContent: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 16,
  },
  editButton: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  deleteButton: {
    color: '#F87171',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2D4A6F',
    width: '90%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#60A5FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});