import { Verse } from '../../../core/models/Verse';
import { BibleTranslation } from '../../../core/models/UserSettings';
import versesData from '../data/verses.json';

export class VerseService {
  private verses: Verse[];

  constructor() {
    this.verses = versesData as Verse[];
  }

  /**
   * Get verse of the day based on current date
   * Uses day of year to deterministically select a verse
   */
  getVerseOfTheDay(): Verse {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Use modulo to cycle through verses
    const index = dayOfYear % this.verses.length;
    return this.verses[index];
  }

  /**
   * Get verse text in specific translation
   */
  getVerseText(verse: Verse, translation: BibleTranslation): string {
    return verse.translations[translation];
  }

  /**
   * Get all verses by theme
   */
  getVersesByTheme(theme: string): Verse[] {
    return this.verses.filter(verse => 
      verse.themes.includes(theme)
    );
  }

  /**
   * Get all unique themes
   */
  getThemes(): string[] {
    const themesSet = new Set<string>();
    this.verses.forEach(verse => {
      verse.themes.forEach(theme => themesSet.add(theme));
    });
    return Array.from(themesSet).sort();
  }

  /**
   * Get all verses
   */
  getAllVerses(): Verse[] {
    return this.verses;
  }

  /**
   * Get verse by ID
   */
  getVerseById(id: string): Verse | undefined {
    return this.verses.find(verse => verse.id === id);
  }
}

export const verseService = new VerseService();