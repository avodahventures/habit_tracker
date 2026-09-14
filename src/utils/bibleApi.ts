export interface FetchedVerse {
  reference: string;
  text: string;
}

export function normalizeReference(reference: string): string {
  return reference.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Fetches one verse, a verse range (e.g. "16-18"), or an entire chapter
 * (when verseSpec is omitted) from bible-api.com. In every case the result
 * text has each verse on its own line, prefixed with its verse number.
 */
export async function fetchVersesFromBible(
  book: string,
  chapter: string,
  verseSpec?: string
): Promise<FetchedVerse> {
  const query = verseSpec
    ? `${book.trim()} ${chapter.trim()}:${verseSpec.trim()}`
    : `${book.trim()} ${chapter.trim()}`;
  const url = `https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Not found');
  }

  const data = await response.json();
  if (!data || data.error || !Array.isArray(data.verses) || data.verses.length === 0) {
    throw new Error(data?.error || 'Not found');
  }

  const text = data.verses
    .map((v: { verse: number; text: string }) => `${v.verse} ${String(v.text).replace(/\s+/g, ' ').trim()}`)
    .join('\n');

  return {
    reference: String(data.reference || query).trim(),
    text,
  };
}
