import { format, startOfDay } from 'date-fns';

export const getTodayISO = (): string => {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
};

export const formatDate = (date: Date | string, formatString: string = 'MMM d, yyyy'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatString);
};