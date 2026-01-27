export type ThemeType = 'nightSky' | 'amberGold' | 'pureBlack';

export interface Theme {
  id: ThemeType;
  name: string;
  colors: readonly [string, string, string];
  textPrimary: string;
  textSecondary: string;
  accent: string;
  cardBackground: string;
  cardBorder: string;
}

export const themes: Record<ThemeType, Theme> = {
  nightSky: {
    id: 'nightSky',
    name: 'Night Sky Blue',
    colors: ['#1E3A5F', '#2D4A6F', '#3D5A7F'] as const,
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    accent: '#60A5FA',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    cardBorder: 'rgba(255, 255, 255, 0.2)',
  },
  amberGold: {
    id: 'amberGold',
    name: 'Calming Amber Gold',
    colors: ['#FED7AA', '#FDBA74', '#FB923C'] as const,
    textPrimary: '#78350F',
    textSecondary: '#92400E',
    accent: '#F97316',
    cardBackground: 'rgba(255, 255, 255, 0.3)',
    cardBorder: 'rgba(120, 53, 15, 0.2)',
  },
  pureBlack: {
    id: 'pureBlack',
    name: 'Pure Black',
    colors: ['#000000', '#0A0A0A', '#141414'] as const,
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    accent: '#60A5FA',
    cardBackground: 'rgba(255, 255, 255, 0.08)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
  },
};
