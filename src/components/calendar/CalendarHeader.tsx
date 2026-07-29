import type { ViewMode } from '../../types';
import { getMonthName } from '../../utils/calendar';

interface CalendarHeaderProps {
  year: number;
  month: number;
  selectedDate: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'day', label: '日' },
];

function getTitle(viewMode: ViewMode, year: number, month: number, selectedDate: string): string {
  if (viewMode === 'month') return getMonthName(year, month);
  if (viewMode === 'week') {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`;
    return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
  }
  // day mode
  const d = new Date(selectedDate);
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

export default function CalendarHeader({
  year, month, selectedDate, viewMode,
  onViewModeChange, onPrev, onNext, onToday,
}: CalendarHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{ height: '48px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}
    >
      <div className="flex items-center gap-1">
        <button className="btn btn-ghost btn-icon text-[15px]" onClick={onPrev}>‹</button>
        <h1 className="text-[15px] font-semibold mx-1" style={{ minWidth: '150px', textAlign: 'center' }}>
          {getTitle(viewMode, year, month, selectedDate)}
        </h1>
        <button className="btn btn-ghost btn-icon text-[15px]" onClick={onNext}>›</button>
        <button className="btn btn-ghost text-[12px] ml-2" onClick={onToday}>今天</button>
      </div>

      <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)' }}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => onViewModeChange(v.key)}
            className="px-3 py-1 text-[12px] font-medium transition-colors"
            style={{
              backgroundColor: viewMode === v.key ? 'var(--bg-primary)' : 'transparent',
              color: viewMode === v.key ? 'var(--accent)' : 'var(--text-tertiary)',
              boxShadow: viewMode === v.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >{v.label}</button>
        ))}
      </div>
    </div>
  );
}
