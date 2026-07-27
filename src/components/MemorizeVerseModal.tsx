import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { db, MemoryVerse } from '../database/database';
import { verses, VerseOfTheDay } from '../utils/verses';
import { fetchVerseFromBible, normalizeReference } from '../utils/bibleApi';

const HIDE_LEVELS = [0, 25, 50, 75, 100];

function getBlankedText(text: string, percent: number): string {
  if (percent === 0) return text;

  const words = text.split(' ');
  const hideCount = Math.round(words.length * (percent / 100));
  if (hideCount === 0) return text;

  const step = words.length / hideCount;
  const hideIndices = new Set<number>();
  for (let i = 0; i < hideCount; i++) {
    hideIndices.add(Math.floor(i * step));
  }

  return words
    .map((word, index) => {
      if (!hideIndices.has(index)) return word;
      const lettersOnly = word.replace(/[^a-zA-Z]/g, '');
      const blankLength = Math.max(lettersOnly.length, 3);
      return '_'.repeat(blankLength);
    })
    .join(' ');
}

interface MemorizeVerseModalProps {
  visible: boolean;
  onClose: () => void;
  verseOfTheDay: VerseOfTheDay;
  memorizeHabitCompletedToday: boolean;
  onPracticeComplete: () => void;
}

type ModalView = 'browse' | 'saved' | 'practice';

export function MemorizeVerseModal({
  visible,
  onClose,
  verseOfTheDay,
  memorizeHabitCompletedToday,
  onPracticeComplete,
}: MemorizeVerseModalProps) {
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ModalView>('browse');
  const [previousView, setPreviousView] = useState<ModalView>('browse');
  const [savedVerses, setSavedVerses] = useState<MemoryVerse[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeVerse, setActiveVerse] = useState<{ id?: number; reference: string; text: string } | null>(null);
  const [hidePercent, setHidePercent] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lookupBook, setLookupBook] = useState('');
  const [lookupChapter, setLookupChapter] = useState('');
  const [lookupVerse, setLookupVerse] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<{ reference: string; text: string; fromInternet: boolean } | null>(null);

  useEffect(() => {
    if (visible) {
      setView('browse');
      setSearchText('');
      setLookupBook('');
      setLookupChapter('');
      setLookupVerse('');
      setLookupError(null);
      setLookupResult(null);
      loadSavedVerses();
    }
  }, [visible]);

  const loadSavedVerses = async () => {
    const data = await db.getMemoryVerses();
    setSavedVerses(data);
  };

  const isSaved = (reference: string) => savedVerses.some(v => v.reference === reference);

  const handleAddVerse = async (reference: string, text: string) => {
    await db.addMemoryVerse(reference, text);
    await loadSavedVerses();
  };

  const handleLookupVerse = async () => {
    if (!lookupBook.trim() || !lookupChapter.trim() || !lookupVerse.trim()) {
      Alert.alert('Missing Info', 'Please enter the book, chapter, and verse.');
      return;
    }

    setLookupError(null);
    setLookupResult(null);
    setLookupLoading(true);

    try {
      const queryReference = `${lookupBook} ${lookupChapter}:${lookupVerse}`;
      const normalizedQuery = normalizeReference(queryReference);
      const localMatch = verses.find(v => normalizeReference(v.reference) === normalizedQuery);

      if (localMatch) {
        setLookupResult({ reference: localMatch.reference, text: localMatch.text, fromInternet: false });
      } else {
        const fetched = await fetchVerseFromBible(lookupBook, lookupChapter, lookupVerse);
        setLookupResult({ reference: fetched.reference, text: fetched.text, fromInternet: true });
      }
    } catch (error) {
      console.error('Error looking up verse:', error);
      setLookupError('Could not find that verse. Check the book, chapter, and verse and try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDeleteVerse = (verse: MemoryVerse) => {
    Alert.alert('Remove Verse', `Remove "${verse.reference}" from your memorization list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await db.deleteMemoryVerse(verse.id);
          await loadSavedVerses();
        },
      },
    ]);
  };

  const handleMarkMastered = async (verse: MemoryVerse) => {
    await db.setMemoryVerseStatus(verse.id, verse.status === 'mastered' ? 'learning' : 'mastered');
    await loadSavedVerses();
  };

  const startPractice = (verse: { id?: number; reference: string; text: string }, from: ModalView) => {
    setActiveVerse(verse);
    setHidePercent(0);
    setShowAnswer(false);
    setPreviousView(from);
    setView('practice');
  };

  const handleMarkPracticed = async () => {
    if (!activeVerse) return;

    if (activeVerse.id) {
      await db.recordVersePractice(activeVerse.id);
      await loadSavedVerses();
    } else {
      // Practicing verse of the day without having saved it yet
      await db.addMemoryVerse(activeVerse.reference, activeVerse.text);
      const refreshed = await db.getMemoryVerses();
      setSavedVerses(refreshed);
      const newlySaved = refreshed.find(v => v.reference === activeVerse.reference);
      if (newlySaved) {
        await db.recordVersePractice(newlySaved.id);
        await loadSavedVerses();
      }
    }

    onPracticeComplete();
    Alert.alert('Great job!', 'Keep practicing to lock it in.');
    setView(previousView);
  };

  const filteredVerses = searchText.trim()
    ? verses.filter(
        v =>
          v.reference.toLowerCase().includes(searchText.toLowerCase()) ||
          v.text.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={[
          styles.modal,
          {
            backgroundColor: currentTheme.colors[0],
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: currentTheme.cardBackground }]}>
          <Text style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>
            Memorize a Verse
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: currentTheme.accent }]}>Close</Text>
          </TouchableOpacity>
        </View>

        {view !== 'practice' && (
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: currentTheme.cardBackground },
                view === 'browse' && { backgroundColor: currentTheme.accent },
              ]}
              onPress={() => setView('browse')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: currentTheme.textPrimary },
                  view === 'browse' && { color: '#FFFFFF', fontWeight: 'bold' },
                ]}
              >
                Browse Verses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: currentTheme.cardBackground },
                view === 'saved' && { backgroundColor: currentTheme.accent },
              ]}
              onPress={() => setView('saved')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: currentTheme.textPrimary },
                  view === 'saved' && { color: '#FFFFFF', fontWeight: 'bold' },
                ]}
              >
                My Verses ({savedVerses.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'browse' && (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
              Today's Verse
            </Text>
            <View style={[styles.verseCard, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.verseReference, { color: currentTheme.accent }]}>
                {verseOfTheDay.reference} (KJV)
              </Text>
              <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                "{verseOfTheDay.text}"
              </Text>
              <View style={styles.verseActions}>
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: currentTheme.accent }]}
                  onPress={() => handleAddVerse(verseOfTheDay.reference, verseOfTheDay.text)}
                  disabled={isSaved(verseOfTheDay.reference)}
                >
                  <Text style={[styles.smallButtonText, { color: currentTheme.accent }]}>
                    {isSaved(verseOfTheDay.reference) ? '✓ Saved' : '+ Add to My Verses'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButtonFilled, { backgroundColor: currentTheme.accent }]}
                  onPress={() =>
                    startPractice(
                      { reference: verseOfTheDay.reference, text: verseOfTheDay.text },
                      'browse'
                    )
                  }
                >
                  <Text style={styles.smallButtonFilledText}>📝 Practice</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
              Look Up a Specific Verse
            </Text>
            <View style={styles.lookupRow}>
              <TextInput
                style={[
                  styles.lookupInputBook,
                  { backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary },
                ]}
                placeholder="Book (e.g. John)"
                placeholderTextColor={currentTheme.textSecondary}
                value={lookupBook}
                onChangeText={setLookupBook}
              />
              <TextInput
                style={[
                  styles.lookupInputSmall,
                  { backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary },
                ]}
                placeholder="Ch."
                placeholderTextColor={currentTheme.textSecondary}
                value={lookupChapter}
                onChangeText={setLookupChapter}
                keyboardType="number-pad"
              />
              <TextInput
                style={[
                  styles.lookupInputSmall,
                  { backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary },
                ]}
                placeholder="Vs."
                placeholderTextColor={currentTheme.textSecondary}
                value={lookupVerse}
                onChangeText={setLookupVerse}
                keyboardType="number-pad"
              />
            </View>
            <TouchableOpacity
              style={[styles.lookupButton, { backgroundColor: currentTheme.accent }]}
              onPress={handleLookupVerse}
              disabled={lookupLoading}
            >
              {lookupLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.smallButtonFilledText}>🔍 Look Up Verse</Text>
              )}
            </TouchableOpacity>

            {lookupError && (
              <Text style={[styles.lookupErrorText, { color: '#EF4444' }]}>{lookupError}</Text>
            )}

            {lookupResult && (
              <View style={[styles.verseCard, { backgroundColor: currentTheme.cardBackground, marginBottom: 20 }]}>
                <View style={styles.savedCardHeader}>
                  <Text style={[styles.verseReference, { color: currentTheme.accent }]}>
                    {lookupResult.reference}
                  </Text>
                  {lookupResult.fromInternet && (
                    <View style={[styles.statusBadge, { backgroundColor: currentTheme.colors[1] }]}>
                      <Text style={[styles.statusBadgeText, { color: currentTheme.textSecondary }]}>
                        🌐 From Internet
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                  "{lookupResult.text}"
                </Text>
                <View style={styles.verseActions}>
                  <TouchableOpacity
                    style={[styles.smallButton, { borderColor: currentTheme.accent }]}
                    onPress={() => handleAddVerse(lookupResult.reference, lookupResult.text)}
                    disabled={isSaved(lookupResult.reference)}
                  >
                    <Text style={[styles.smallButtonText, { color: currentTheme.accent }]}>
                      {isSaved(lookupResult.reference) ? '✓ Saved' : '+ Add to My Verses'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButtonFilled, { backgroundColor: currentTheme.accent }]}
                    onPress={() => startPractice(lookupResult, 'browse')}
                  >
                    <Text style={styles.smallButtonFilledText}>📝 Practice</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
              Find Another Verse
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary },
              ]}
              placeholder="Search by reference or keyword..."
              placeholderTextColor={currentTheme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />

            {filteredVerses.slice(0, 25).map((verse) => (
              <View
                key={verse.reference}
                style={[styles.browseRow, { backgroundColor: currentTheme.cardBackground }]}
              >
                <View style={styles.browseRowText}>
                  <Text style={[styles.browseReference, { color: currentTheme.textPrimary }]}>
                    {verse.reference}
                  </Text>
                  <Text
                    style={[styles.browseSnippet, { color: currentTheme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {verse.text}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: currentTheme.accent }]}
                  onPress={() => handleAddVerse(verse.reference, verse.text)}
                  disabled={isSaved(verse.reference)}
                >
                  <Text style={[styles.smallButtonText, { color: currentTheme.accent }]}>
                    {isSaved(verse.reference) ? '✓' : '+ Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {view === 'saved' && (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {savedVerses.length === 0 ? (
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                No verses saved yet. Add one from the Browse tab to start memorizing.
              </Text>
            ) : (
              savedVerses.map((verse) => (
                <View
                  key={verse.id}
                  style={[styles.savedCard, { backgroundColor: currentTheme.cardBackground }]}
                >
                  <View style={styles.savedCardHeader}>
                    <Text style={[styles.verseReference, { color: currentTheme.accent }]}>
                      {verse.reference}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: verse.status === 'mastered' ? currentTheme.accent : currentTheme.colors[1] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: verse.status === 'mastered' ? '#FFFFFF' : currentTheme.textSecondary },
                        ]}
                      >
                        {verse.status === 'mastered' ? 'Mastered' : 'Learning'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                    "{verse.text}"
                  </Text>
                  <Text style={[styles.practiceCount, { color: currentTheme.textSecondary }]}>
                    Practiced {verse.timesPracticed} time{verse.timesPracticed === 1 ? '' : 's'}
                  </Text>
                  <View style={styles.verseActions}>
                    <TouchableOpacity
                      style={[styles.smallButtonFilled, { backgroundColor: currentTheme.accent }]}
                      onPress={() => startPractice(verse, 'saved')}
                    >
                      <Text style={styles.smallButtonFilledText}>📝 Practice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallButton, { borderColor: currentTheme.accent }]}
                      onPress={() => handleMarkMastered(verse)}
                    >
                      <Text style={[styles.smallButtonText, { color: currentTheme.accent }]}>
                        {verse.status === 'mastered' ? 'Mark Learning' : 'Mark Mastered'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteVerse(verse)}>
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {view === 'practice' && activeVerse && (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity onPress={() => setView(previousView)}>
              <Text style={[styles.backLink, { color: currentTheme.accent }]}>← Back</Text>
            </TouchableOpacity>

            <Text style={[styles.verseReference, { color: currentTheme.accent, marginTop: 12 }]}>
              {activeVerse.reference}
            </Text>

            <View style={[styles.practiceCard, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                "{showAnswer ? activeVerse.text : getBlankedText(activeVerse.text, hidePercent)}"
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: currentTheme.textPrimary }]}>
              Hide Words
            </Text>
            <View style={styles.hideLevelsRow}>
              {HIDE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.hideLevelButton,
                    { backgroundColor: currentTheme.cardBackground },
                    hidePercent === level && { backgroundColor: currentTheme.accent },
                  ]}
                  onPress={() => {
                    setHidePercent(level);
                    setShowAnswer(false);
                  }}
                >
                  <Text
                    style={[
                      styles.hideLevelText,
                      { color: currentTheme.textPrimary },
                      hidePercent === level && { color: '#FFFFFF', fontWeight: 'bold' },
                    ]}
                  >
                    {level}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.peekButton, { borderColor: currentTheme.accent }]}
              onPress={() => setShowAnswer(!showAnswer)}
            >
              <Text style={[styles.peekButtonText, { color: currentTheme.accent }]}>
                {showAnswer ? 'Hide Answer' : '👁 Reveal Verse'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.practicedButton, { backgroundColor: currentTheme.accent }]}
              onPress={handleMarkPracticed}
            >
              <Text style={styles.practicedButtonText}>
                ✓ I Practiced This{!memorizeHabitCompletedToday ? ' (completes today\'s habit)' : ''}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
  },
  verseCard: {
    borderRadius: 16,
    padding: 16,
  },
  verseReference: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  verseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    alignItems: 'center',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallButtonFilled: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonFilledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  lookupRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  lookupInputBook: {
    flex: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  lookupInputSmall: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  lookupButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  lookupErrorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  browseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  browseRowText: {
    flex: 1,
    marginRight: 10,
  },
  browseReference: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  browseSnippet: {
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
  },
  savedCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  savedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  practiceCount: {
    fontSize: 12,
    marginTop: 8,
  },
  deleteText: {
    fontSize: 18,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  practiceCard: {
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    marginBottom: 8,
  },
  hideLevelsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hideLevelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  hideLevelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  peekButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  peekButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  practicedButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  practicedButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
