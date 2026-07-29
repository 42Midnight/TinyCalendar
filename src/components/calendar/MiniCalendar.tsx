import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalendarDay } from '../../types';
import { dateString, getWeekdayName } from '../../utils/calendar';

interface MiniCalendarProps {
  year: number;
  month: number;
  selectedDate: string;
  onSelectDate: (day: number, month?: number, year?: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function MiniCalendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const [days, setDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await invoke<{ days: CalendarDay[] }>('get_calendar_data', {
          year,
          month,
          disabledHolidays: '',
        });
        setDays(data.days);
      } catch (err) {
        console.error('Failed to load mini calendar:', err);
      }
    }
    load();
  }, [year, month]);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <button
          className="text-[11px] p-0.5 rounded cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={onPrevMonth}
        >◀</button>
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {monthNames[month - 1]} {year}
        </span>
        <button
          className="text-[11px] p-0.5 rounded cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={onNextMonth}
        >▶</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="text-center text-[9px]"
            style={{ color: i === 0 || i === 6 ? 'var(--text-tertiary)' : 'var(--text-tertiary)' }}>
            {getWeekdayName(i)}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const d = dateString(day.year, day.month, day.day);
          const isSelected = d === selectedDate;
          const hasHoliday = !!day.holiday_text;
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day.day, day.month, day.year)}
              className="text-center text-[10px] py-0.5 rounded-sm transition-colors cursor-pointer"
              style={{
                backgroundColor: isSelected ? 'var(--accent)' : day.is_today ? 'var(--hover)' : 'transparent',
                color: isSelected ? '#fff'
                  : hasHoliday ? '#dc2626'
                  : day.is_current_month ? 'var(--text-primary)' : 'var(--text-tertiary)',
                opacity: day.is_current_month ? 1 : 0.4,
                fontWeight: day.is_today ? 600 : 400,
              }}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
