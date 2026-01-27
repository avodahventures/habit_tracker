export interface GratitudeEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  entries: string[]; // Array of gratitude items for the day
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}