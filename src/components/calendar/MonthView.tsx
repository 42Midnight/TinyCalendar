import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalendarDay, CalendarEvent } from '../../types';
import { getWeekdayName, dateString } from '../../utils/calendar';
import CalendarCell from './CalendarCell';

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string;
  events: CalendarEvent[];
  activeFilter: number | null;
  showLunar: boolean;
  showHolidays: boolean;
  disabledHolidays: string;
  onSelectDate: (day: number, month?: number, year?: number) => void;
  onDoubleClickDate: (date: string) => void;
}

export default function MonthView({
  year,
  month,
  selectedDate,
  events,
  activeFilter,
  showLunar,
  showHolidays,
  disabledHolidays,
  onSelectDate,
  onDoubleClickDate,
}: MonthViewProps) {
  const [days, setDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await invoke<{ days: CalendarDay[] }>('get_calendar_data', {
          year,
          month,
          disabledHolidays: showHolidays ? disabledHolidays : '',
        });
        setDays(data.days);
      } catch (err) {
        console.error('Failed to load calendar data:', err);
      }
    }
    load();
  }, [year, month, showHolidays, disabledHolidays]);

  const filteredEvents = activeFilter
    ? events.filter((e) => e.category_id === activeFilter)
    : events;

  const getEventsForDay = (day: CalendarDay): CalendarEvent[] => {
    const d = dateString(day.year, day.month, day.day);
    return filteredEvents.filter((e) => e.date === d);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="text-center py-2 text-[11px] font-medium"
            style={{
              color: i === 0 || i === 6 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            }}
          >
            {getWeekdayName(i)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
        {days.map((day, idx) => (
          <CalendarCell
            key={idx}
            day={day}
            isSelected={dateString(day.year, day.month, day.day) === selectedDate}
            events={getEventsForDay(day)}
            showLunar={showLunar}
            showHolidays={showHolidays}
            onClick={() => onSelectDate(day.day, day.month, day.year)}
            onDoubleClick={() =>
              onDoubleClickDate(dateString(day.year, day.month, day.day))
            }
          />
        ))}
      </div>
    </div>
  );
}
