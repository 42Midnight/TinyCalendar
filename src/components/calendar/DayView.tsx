import type { CalendarEvent } from '../../types';
import { formatDate } from '../../utils/calendar';

interface DayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  activeFilter: number | null;
  onDoubleClickDate: (date: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayView({
  selectedDate,
  events,
  activeFilter,
  onDoubleClickDate,
}: DayViewProps) {
  const filteredEvents = activeFilter
    ? events.filter((e) => e.category_id === activeFilter)
    : events;

  const dayEvents = filteredEvents.filter((e) => e.date === selectedDate);

  const allDayEvents = dayEvents.filter((e) => e.is_all_day);
  const timedEvents = dayEvents.filter((e) => !e.is_all_day);

  const getEventsForHour = (hour: number): CalendarEvent[] => {
    return timedEvents.filter((e) => {
      const startHour = e.start_time ? parseInt(e.start_time.split(':')[0]) : -1;
      return startHour === hour;
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2
          className="text-[16px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {formatDate(selectedDate)}
        </h2>
        {allDayEvents.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {allDayEvents.map((evt) => (
              <span
                key={evt.id}
                className="rounded-sm px-2 py-0.5 text-[11px]"
                style={{
                  backgroundColor: evt.category_color
                    ? `${evt.category_color}20`
                    : 'var(--bg-tertiary)',
                  color: evt.category_color || 'var(--text-primary)',
                }}
              >
                全天 · {evt.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div
              key={hour}
              className="flex"
              style={{
                minHeight: '52px',
                borderBottom: '1px solid var(--border-light)',
              }}
              onDoubleClick={() => onDoubleClickDate(selectedDate)}
            >
              <div
                className="w-16 flex-shrink-0 py-1 pr-3 text-right text-[11px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
              <div
                className="flex-1 py-0.5"
                style={{ borderLeft: '1px solid var(--border-light)' }}
              >
                {hourEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-sm px-2 py-1 mb-0.5 text-[12px]"
                    style={{
                      backgroundColor: evt.category_color
                        ? `${evt.category_color}25`
                        : 'var(--bg-tertiary)',
                      color: evt.category_color || 'var(--text-primary)',
                      borderLeft: evt.category_color
                        ? `3px solid ${evt.category_color}`
                        : '3px solid transparent',
                    }}
                  >
                    <div className="font-medium">{evt.title}</div>
                    {evt.start_time && (
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {evt.start_time}
                        {evt.end_time ? ` - ${evt.end_time}` : ''}
                        {evt.location ? ` · ${evt.location}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
