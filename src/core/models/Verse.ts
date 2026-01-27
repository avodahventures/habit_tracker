import { BibleTranslation } from './UserSettings';

export interface Verse {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verse: string;
  translations: {
    NIV: string;
    KJV: string;
    ESV: string;
    NLT: string;
    NKJV: string;
    ASV: string;
  };
  reflection: string;
  themes: string[];
}

export type VerseTheme = 
  | 'Love'
  | 'Faith'
  | 'Hope'
  | 'Peace'
  | 'Strength'
  | 'Wisdom'
  | 'Joy'
  | 'Trust'
  | 'Prayer'
  | 'Guidance';
  