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
import { fetchVersesFromBible, normalizeReference } from '../utils/bibleApi';

const HIDE_LEVELS = [0, 25, 50, 75, 100];

function isVerseNumberToken(word: string): boolean {
  return /^\d+$/.test(word);
}

interface VerseLine {
  number: string | null;
  body: string;
}

function splitVerseNumber(line: string): VerseLine {
  const words = line.split(' ').filter(w => w.length > 0);
  if (words.length > 0 && isVerseNumberToken(words[0])) {
    return { number: words[0], body: words.slice(1).join(' ') };
  }
  return { number: null, body: line };
}

function blankWords(body: string, percent: number): string {
  if (percent === 0) return body;

  const words = body.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return body;

  const hideCount = Math.round(words.length * (percent / 100));
  if (hideCount === 0) return body;

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

      if (percent === 100) {
        return (lettersOnly.charAt(0) || word.charAt(0) || '').toUpperCase();
      }

      return '_'.repeat(blankLength);
    })
    .join(' ');
}

function getVerseLines(text: string, percent: number): VerseLine[] {
  // Each verse (line) is processed independently so a verse's leading
  // number is always recognized, kept visible, and rendered bold.
  return text.split('\n').map(line => {
    const { number, body } = splitVerseNumber(line);
    return { number, body: blankWords(body, percent) };
  });
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
    if (!lookupBook.trim() || !lookupChapter.trim()) {
      Alert.alert('Missing Info', 'Please enter at least the book and chapter (verse is optional).');
      return;
    }

    setLookupError(null);
    setLookupResult(null);
    setLookupLoading(true);

    try {
      const verseSpec = lookupVerse.trim();
      const isSingleVerse = /^\d+$/.test(verseSpec);

      if (isSingleVerse) {
        const queryReference = `${lookupBook} ${lookupChapter}:${verseSpec}`;
        const normalizedQuery = normalizeReference(queryReference);
        const localMatch = verses.find(v => normalizeReference(v.reference) === normalizedQuery);

        if (localMatch) {
          setLookupResult({
            reference: localMatch.reference,
            text: `${verseSpec} ${localMatch.text}`,
            fromInternet: false,
          });
          return;
        }
      }

      // Single verse not in the local bank, a verse range, or no verse
      // (whole chapter) - all handled the same way, one verse per line.
      const fetched = await fetchVersesFromBible(lookupBook, lookupChapter, verseSpec || undefined);
      setLookupResult({ reference: fetched.reference, text: fetched.text, fromInternet: true });
    } catch (error) {
      console.error('Error looking up verse:', error);
      setLookupError('Could not find that. Check the book, chapter, and verse and try again.');
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
            Practice Memorization
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
              Verse Lookup
            </Text>
            <Text style={[styles.lookupHint, { color: currentTheme.textSecondary }]}>
              Enter a verse (16), a range (16-18), or leave blank for the whole chapter
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
                keyboardType="default"
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
              {getVerseLines(activeVerse.text, showAnswer ? 0 : hidePercent).map((line, index, lines) => (
                <Text key={index} style={[styles.verseText, { color: currentTheme.textPrimary }]}>
                  {index === 0 ? '"' : ''}
                  {line.number && (
                    <Text style={[styles.verseNumberBold, { color: currentTheme.textPrimary }]}>
                      {line.number}.{' '}
                    </Text>
                  )}
                  {line.body}
                  {index === lines.length - 1 ? '"' : ''}
                </Text>
              ))}
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
  verseNumberBold: {
    fontWeight: 'bold',
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
  lookupHint: {
    fontSize: 12,
    marginBottom: 10,
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
