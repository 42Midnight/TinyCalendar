import { useState, useEffect } from 'react';
import type { Calendar, CalendarEvent, Category, CreateEventInput, UpdateEventInput } from '../../types';
import Modal from '../common/Modal';

interface EventEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateEventInput | UpdateEventInput) => Promise<CalendarEvent | null>;
  onDelete?: (id: number) => Promise<boolean>;
  event?: CalendarEvent | null;
  date?: string;
  categories: Category[];
  calendars: Calendar[];
  activeCalendarId: number | null;
}

const REPEAT_OPTIONS = [
  { value: '', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: '不提醒' },
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 1440, label: '提前 1 天' },
];

export default function EventEditor({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  date,
  categories,
  calendars,
  activeCalendarId,
}: EventEditorProps) {
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title || '');
  const [categoryId, setCategoryId] = useState<number | null>(
    event?.category_id ?? null
  );
  const [calendarId, setCalendarId] = useState<number | null>(
    event?.calendar_id ?? activeCalendarId
  );
  const [eventDate, setEventDate] = useState(event?.date || date || '');
  const [startTime, setStartTime] = useState(event?.start_time || '');
  const [endTime, setEndTime] = useState(event?.end_time || '');
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day || false);
  const [note, setNote] = useState(event?.note || '');
  const [location, setLocation] = useState(event?.location || '');
  const [repeatRule, setRepeatRule] = useState(event?.repeat_rule || '');
  const [notificationMin, setNotificationMin] = useState(
    event?.notification_min || 0
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(event?.title || '');
      setCategoryId(event?.category_id ?? null);
      setCalendarId(event?.calendar_id ?? activeCalendarId);
      setEventDate(event?.date || date || '');
      setStartTime(event?.start_time || '');
      setEndTime(event?.end_time || '');
      setIsAllDay(event?.is_all_day || false);
      setNote(event?.note || '');
      setLocation(event?.location || '');
      setRepeatRule(event?.repeat_rule || '');
      setNotificationMin(event?.notification_min || 0);
    }
  }, [open, event, date, activeCalendarId]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const input: CreateEventInput | UpdateEventInput = {
      ...(isEdit ? { id: event!.id } : {}),
      title: title.trim(),
      category_id: categoryId,
      calendar_id: calendarId,
      date: eventDate,
      start_time: isAllDay ? null : startTime || null,
      end_time: isAllDay ? null : endTime || null,
      is_all_day: isAllDay,
      note,
      location,
      repeat_rule: repeatRule,
      repeat_end_date: null,
      notification_min: notificationMin,
    };

    const result = await onSave(input);
    setSaving(false);
    if (result) onClose();
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    const ok = await onDelete(event.id);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑事件' : '新建事件'}
      width="440px"
    >
      <div className="flex flex-col gap-3.5">
        {/* Title */}
        <div>
          <label className="label">标题</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入事件标题"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </div>

        {/* Calendar + Category + Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">日历</label>
            <select
              className="input"
              value={calendarId ?? ''}
              onChange={(e) =>
                setCalendarId(e.target.value ? Number(e.target.value) : null)
              }
            >
              {calendars.filter((c) => c.is_visible).map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">分类</label>
            <select
              className="input"
              value={categoryId ?? ''}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">未分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Date row */}
        <div>
          <label className="label">日期</label>
          <input
            className="input"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        {/* All day toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            全天事件
          </span>
        </label>

        {/* Time */}
        {!isAllDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">开始时间</label>
              <input
                className="input"
                type="time"
                value={startTime || ''}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="label">结束时间</label>
              <input
                className="input"
                type="time"
                value={endTime || ''}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Location */}
        <div>
          <label className="label">地点</label>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="可选"
          />
        </div>

        {/* Note */}
        <div>
          <label className="label">备注</label>
          <textarea
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可选"
            rows={2}
          />
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px solid var(--border-light)' }} />

        {/* Repeat */}
        <div>
          <label className="label">重复</label>
          <select
            className="input"
            value={repeatRule}
            onChange={(e) => setRepeatRule(e.target.value)}
          >
            {REPEAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reminder */}
        <div>
          <label className="label">提醒</label>
          <select
            className="input"
            value={notificationMin}
            onChange={(e) => setNotificationMin(Number(e.target.value))}
          >
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <div>
            {isEdit && onDelete && (
              <button className="btn btn-danger text-[12px]" onClick={handleDelete}>
                删除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!title.trim() || saving}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
