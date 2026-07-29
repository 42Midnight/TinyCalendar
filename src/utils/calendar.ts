const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function getWeekdayName(day: number, short = true): string {
  return short ? WEEKDAY_NAMES[day] : WEEKDAY_FULL[day];
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAY_FULL[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

export function formatDateShort(date: string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isToday(date: string): boolean {
  return date === todayString();
}

export function getMonthName(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function getEventsForDate(
  events: import('../types').CalendarEvent[],
  date: string
): import('../types').CalendarEvent[] {
  return events.filter((e) => e.date === date);
}

export function getEventsForDateRange(
  events: import('../types').CalendarEvent[],
  startDate: string,
  endDate: string
): import('../types').CalendarEvent[] {
  return events.filter((e) => e.date >= startDate && e.date <= endDate);
}
