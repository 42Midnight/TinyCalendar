import type { CalendarEvent } from '../../types';
import { formatTimeRange } from '../../utils/format';

interface EventCardProps {
  event: CalendarEvent;
  onClick: () => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-md px-3 py-2 cursor-pointer transition-all"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: `3px solid ${event.category_color || '#6b7280'}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium truncate">{event.title}</span>
        {event.category_name && (
          <span
            className="text-[10px] px-1.5 py-px rounded-sm flex-shrink-0"
            style={{
              backgroundColor: event.category_color
                ? `${event.category_color}18`
                : 'var(--bg-tertiary)',
              color: event.category_color || 'var(--text-tertiary)',
            }}
          >
            {event.category_name}
          </span>
        )}
      </div>

      {!event.is_all_day && (event.start_time || event.end_time) && (
        <div
          className="text-[11px] mt-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {formatTimeRange(event.start_time, event.end_time)}
        </div>
      )}

      {event.is_all_day && (
        <div
          className="text-[11px] mt-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          全天
        </div>
      )}

      {event.location && (
        <div
          className="text-[11px] mt-0.5 truncate"
          style={{ color: 'var(--text-tertiary)' }}
        >
          📍 {event.location}
        </div>
      )}

      {event.note && (
        <div
          className="text-[11px] mt-0.5 truncate"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {event.note}
        </div>
      )}
    </div>
  );
}
