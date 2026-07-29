import type { CalendarEvent, Category } from '../../types';
import { formatDate } from '../../utils/calendar';
import Modal from '../common/Modal';
import EventCard from './EventCard';

interface DayDetailProps {
  open: boolean;
  onClose: () => void;
  date: string;
  events: CalendarEvent[];
  categories: Category[];
  onEditEvent: (event: CalendarEvent) => void;
  onNewEvent: (date: string) => void;
}

export default function DayDetail({
  open,
  onClose,
  date,
  events,
  onEditEvent,
  onNewEvent,
}: DayDetailProps) {
  const dayEvents = events.filter((e) => e.date === date);
  const allDay = dayEvents.filter((e) => e.is_all_day);
  const timed = dayEvents.filter((e) => !e.is_all_day);

  return (
    <Modal open={open} onClose={onClose} title={formatDate(date)} width="460px">
      {/* Add button */}
      <div className="mb-3">
        <button
          className="btn btn-primary w-full text-[13px]"
          onClick={() => { onClose(); onNewEvent(date); }}
        >
          + 添加事件
        </button>
      </div>

      {dayEvents.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          <div className="text-[32px] mb-2 opacity-30">📝</div>
          <p className="text-[13px]">这一天还没有事件</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {allDay.length > 0 && (
            <>
              <div className="text-[11px] font-medium px-1" style={{ color: 'var(--text-tertiary)' }}>全天</div>
              {allDay.map((e) => (
                <EventCard key={e.id} event={e} onClick={() => onEditEvent(e)} />
              ))}
            </>
          )}
          {timed.length > 0 && (
            <>
              {allDay.length > 0 && (
                <div className="text-[11px] font-medium px-1 mt-1" style={{ color: 'var(--text-tertiary)' }}>时间段</div>
              )}
              {timed
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                .map((e) => (
                  <EventCard key={e.id} event={e} onClick={() => onEditEvent(e)} />
                ))}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
