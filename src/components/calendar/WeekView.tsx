import type { CalendarEvent } from '../../types';

interface WeekViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  activeFilter: number | null;
  onSelectDate: (day: number, month?: number, year?: number) => void;
  onDoubleClickDate: (date: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function WeekView({
  selectedDate,
  events,
  activeFilter,
  onDoubleClickDate,
}: WeekViewProps) {
  // Calculate the week containing selectedDate
  const selected = new Date(selectedDate);
  const dayOfWeek = selected.getDay();
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - dayOfWeek);

  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    weekDays.push(`${y}-${m}-${day}`);
  }

  const filteredEvents = activeFilter
    ? events.filter((e) => e.category_id === activeFilter)
    : events;

  const getEventsForHour = (date: string, hour: number): CalendarEvent[] => {
    return filteredEvents.filter((e) => {
      if (e.date !== date || e.is_all_day) return false;
      const startHour = e.start_time ? parseInt(e.start_time.split(':')[0]) : -1;
      return startHour === hour;
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Header */}
      <div
        className="grid grid-cols-8 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="py-2 text-center text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          GMT+8
        </div>
        {weekDays.map((d, i) => (
          <div
            key={d}
            className="py-2 text-center"
            style={{
              borderLeft: '1px solid var(--border-light)',
              backgroundColor: d === selectedDate ? 'var(--hover)' : 'transparent',
            }}
          >
            <div
              className="text-[11px] font-medium"
              style={{
                color: i === 0 || i === 6 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              }}
            >
              {WEEKDAY_LABELS[i]}
            </div>
            <div
              className="text-[13px] font-semibold"
              style={{ color: d === selectedDate ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {new Date(d).getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-8"
            style={{
              minHeight: '48px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div
              className="py-1 pr-2 text-right text-[10px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDays.map((d) => {
              const hourEvents = getEventsForHour(d, hour);
              return (
                <div
                  key={d}
                  className="p-0.5 relative"
                  style={{ borderLeft: '1px solid var(--border-light)' }}
                  onDoubleClick={() => onDoubleClickDate(d)}
                >
                  {hourEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-sm px-1.5 py-0.5 text-[11px] truncate font-medium"
                      style={{
                        backgroundColor: evt.category_color
                          ? `${evt.category_color}20`
                          : 'var(--bg-tertiary)',
                        color: evt.category_color || 'var(--text-primary)',
                        borderLeft: evt.category_color
                          ? `2px solid ${evt.category_color}`
                          : '2px solid transparent',
                      }}
                    >
                      {evt.title}
                      {evt.start_time && (
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                          {evt.start_time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
