// Shared period/date utility for all commands
// Normalizes period strings to date ranges

export type PeriodLabel = 'today' | '1d' | '7d' | '14d' | '30d' | '90d' | 'week' | 'month' | 'all';

export interface PeriodRange {
  since: Date;
  days: number;
  label: string;
}

const PERIOD_MAP: Record<string, number> = {
  'today': 0,
  '1d': 1,
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
  'week': 7,
  'month': 30,
  'all': 365 * 5, // 5 years max
};

export function parsePeriod(input?: string): PeriodRange {
  const key = (input || '14d').toLowerCase().trim();
  const days = PERIOD_MAP[key] ?? 14;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const labels: Record<string, string> = {
    'today': 'Today',
    '1d': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '14d': 'Last 14 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'week': 'This Week',
    'month': 'This Month',
    'all': 'All Time',
  };

  return { since, days, label: labels[key] || `Last ${days} Days` };
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function formatPeriodLabel(days: number): string {
  if (days <= 1) return '24h';
  if (days <= 7) return '7d';
  if (days <= 14) return '14d';
  if (days <= 30) return '30d';
  if (days <= 90) return '90d';
  return 'All';
}
