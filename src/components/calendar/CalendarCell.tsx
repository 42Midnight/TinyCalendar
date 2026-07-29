import type { CalendarDay, CalendarEvent } from '../../types';

interface CalendarCellProps {
  day: CalendarDay;
  isSelected: boolean;
  events: CalendarEvent[];
  showLunar: boolean;
  showHolidays: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export default function CalendarCell({
  day,
  isSelected,
  events,
  showLunar,
  showHolidays,
  onClick,
  onDoubleClick,
}: CalendarCellProps) {
  const maxDots = 3;
  const lunarLabel = showLunar ? day.lunar_text : '';
  const holidayLabel = showHolidays ? day.holiday_text : '';

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="flex flex-col p-1 cursor-pointer transition-colors relative overflow-hidden"
      style={{
        borderRight: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        minHeight: '80px',
        backgroundColor: isSelected ? 'var(--hover)' : 'var(--bg-primary)',
        opacity: day.is_current_month ? 1 : 0.35,
      }}
    >
      {/* Day number + lunar + holiday */}
      <div className="flex items-center justify-center gap-0.5 flex-wrap mb-0.5">
        <span
          className="inline-flex items-center justify-center text-[12px] font-medium"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: day.is_today ? 'var(--accent)' : 'transparent',
            color: day.is_today ? 'white' : 'var(--text-secondary)',
          }}
        >
          {day.day}
        </span>

        {holidayLabel && (
          <span
            className="text-[9px] px-1 py-px rounded-sm font-medium"
            style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
            }}
          >
            {holidayLabel}
          </span>
        )}
      </div>

      {/* Lunar text below day number */}
      {lunarLabel && (
        <div
          className="text-center text-[10px] leading-tight"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {lunarLabel}
        </div>
      )}

      {/* Event dots */}
      <div className="flex flex-col gap-0.5 px-0.5 mt-0.5">
        {events.slice(0, maxDots).map((event, i) => (
          <div
            key={event.id || i}
            className="rounded-sm px-1 py-px truncate text-[10px] leading-tight"
            style={{
              backgroundColor: event.category_color
                ? `${event.category_color}18`
                : 'var(--bg-tertiary)',
              color: event.category_color || 'var(--text-secondary)',
              borderLeft: event.category_color
                ? `2px solid ${event.category_color}`
                : '2px solid transparent',
            }}
          >
            {!event.is_all_day && event.start_time && (
              <span style={{ opacity: 0.7 }}>{event.start_time} </span>
            )}
            {event.title}
          </div>
        ))}
        {events.length > maxDots && (
          <span className="text-[10px] px-1" style={{ color: 'var(--text-tertiary)' }}>
            +{events.length - maxDots}
          </span>
        )}
      </div>
    </div>
  );
}
