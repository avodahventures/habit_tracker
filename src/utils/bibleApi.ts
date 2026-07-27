export interface FetchedVerse {
  reference: string;
  text: string;
}

export function normalizeReference(reference: string): string {
  return reference.toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function fetchVerseFromBible(
  book: string,
  chapter: string,
  verse: string
): Promise<FetchedVerse> {
  const query = `${book.trim()} ${chapter.trim()}:${verse.trim()}`;
  const url = `https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Verse not found');
  }

  const data = await response.json();
  if (!data || data.error || !data.text) {
    throw new Error(data?.error || 'Verse not found');
  }

  return {
    reference: String(data.reference || query).trim(),
    text: String(data.text).replace(/\s+/g, ' ').trim(),
  };
}
