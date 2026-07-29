import type { CalendarEvent } from '../../types';
import { formatDate } from '../../utils/calendar';
import EventCard from './EventCard';

interface EventPanelProps {
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: () => void;
}

export default function EventPanel({
  date,
  events,
  onEventClick,
  onNewEvent,
}: EventPanelProps) {
  const filteredEvents = events.filter((e) => e.date === date);

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h3 className="text-[13px] font-semibold">{formatDate(date)}</h3>
          <span
            className="text-[11px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {filteredEvents.length} 个事件
          </span>
        </div>
        <button
          className="btn btn-ghost btn-icon text-[18px]"
          onClick={onNewEvent}
          title="添加事件"
        >
          +
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredEvents.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full text-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <div className="text-[28px] mb-2 opacity-30">📝</div>
            <p className="text-[12px]">这一天没有事件</p>
            <button
              className="btn btn-ghost text-[12px] mt-2"
              onClick={onNewEvent}
              style={{ color: 'var(--accent)' }}
            >
              添加一个
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
