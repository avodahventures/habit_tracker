export interface VerseOfTheDay {
  date: string;
  reference: string;
  text: string;
  bibleGatewayUrl: string;
}

export const verses: VerseOfTheDay[] = require('../../assets/verses.json');

export function getVerseOfTheDay(): VerseOfTheDay {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateKey = `${month}-${day}`;
  const verse = verses.find(v => v.date === dateKey);
  return verse || verses[0];
}
