export type ThemeType = 'nightSky' | 'amberGold' | 'pureBlack' | 'faithCalmLight' | 'faithCalmDark';

export interface Theme {
  id: ThemeType;
  name: string;
  colors: readonly [string, string, string];
  textPrimary: string;
  textSecondary: string;
  textTertiary?: string;
  textInverse?: string;
  accent: string;
  accentSecondary?: string;
  success?: string;
  warning?: string;
  cardBackground: string;
  cardBorder: string;
  buttonPrimaryBg?: string;
  buttonPrimaryText?: string;
  buttonSecondaryBg?: string;
  buttonSecondaryText?: string;
  focus?: string;
}

export const themes: Record<ThemeType, Theme> = {
  nightSky: {
    id: 'nightSky',
    name: 'Night Sky Blue',
    colors: ['#1E3A5F', '#2D4A6F', '#3D5A7F'] as const,
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
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
    textTertiary: '#B45309',
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
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    accent: '#60A5FA',
    cardBackground: 'rgba(255, 255, 255, 0.08)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
  },
 faithCalmLight: {
  id: 'faithCalmLight',
  name: 'Faith Calm (Light)',
  colors: ['#D4C4B0', '#B8A791', '#9D8A73'] as const, // Darker gradient
  textPrimary: '#2D2520', // Darker text for better contrast
  textSecondary: '#4A3F35',
  textTertiary: '#6B5E52',
  textInverse: '#FFFFFF',
  accent: '#7A5F48', // Slightly darker accent
  accentSecondary: '#B59C84',
  success: '#6B8875',
  warning: '#B8945A',
  buttonPrimaryBg: '#7A5F48',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondaryBg: '#C9B89F',
  buttonSecondaryText: '#2D2520',
  focus: '#A38F79',
  cardBackground: '#E8DDD0', // Darker card background
  cardBorder: '#C9B89F',
},
  faithCalmDark: {
    id: 'faithCalmDark',
    name: 'Faith Calm (Dark)',
    colors: ['#2A241E', '#3A3128', '#5A4A3B'] as const,
    textPrimary: '#F4EFE9',
    textSecondary: '#D1C7BD',
    textTertiary: '#B6A89A',
    textInverse: '#1F1B17',
    accent: '#C8B08A',
    accentSecondary: '#8C6F56',
    success: '#9DB8A5',
    warning: '#E0B77D',
    buttonPrimaryBg: '#C8B08A',
    buttonPrimaryText: '#1F1B17',
    buttonSecondaryBg: '#3A3128',
    buttonSecondaryText: '#F4EFE9',
    focus: '#E0C9A6',
    cardBackground: '#2F281F',
    cardBorder: '#4A4035',
  },
};