export type PrayerCategory = 
  | 'Personal'
  | 'Family'
  | 'Friends'
  | 'Church'
  | 'Health'
  | 'Work'
  | 'World'
  | 'Other';

export type PrayerPriority = 'Urgent' | 'High' | 'Normal';

export type PrayerStatus = 'Active' | 'Answered' | 'Archived';

export interface PrayerUpdate {
  id: string;
  note: string;
  createdAt: string;
}

export interface PrayerRequest {
  id: string;
  title: string;
  description?: string;
  category: PrayerCategory;
  priority: PrayerPriority;
  status: PrayerStatus;
  createdAt: string;
  updatedAt: string;
  answeredAt?: string;
  answeredNote?: string;
  updates: PrayerUpdate[];
}

export type CreatePrayerRequestInput = {
  title: string;
  description?: string;
  category: PrayerCategory;
  priority: PrayerPriority;
};

export type UpdatePrayerRequestInput = Partial<Omit<PrayerRequest, 'id' | 'createdAt' | 'updatedAt'>>;