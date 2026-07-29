export function formatTime(time: string | null): string {
  if (!time) return '';
  return time;
}

export function formatTimeRange(
  start: string | null,
  end: string | null
): string {
  if (!start) return '';
  if (!end) return formatTime(start);
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}
