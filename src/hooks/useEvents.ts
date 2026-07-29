import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '../types';

export function useEvents(year: number, month: number, calendarId: number | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMonthEvents = useCallback(async (y: number, m: number, calId: number | null) => {
    setLoading(true);
    try {
      const result = await invoke<CalendarEvent[]>('get_month_events', {
        year: y,
        month: m,
        calendarId: calId,
      });
      setEvents(result);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthEvents(year, month, calendarId);
  }, [year, month, calendarId, fetchMonthEvents]);

  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<CalendarEvent | null> => {
      try {
        const event = await invoke<CalendarEvent>('create_event', {
          input,
        });
        setEvents((prev) => [...prev, event]);
        return event;
      } catch (err) {
        console.error('Failed to create event:', err);
        return null;
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (input: UpdateEventInput): Promise<CalendarEvent | null> => {
      try {
        const event = await invoke<CalendarEvent>('update_event', {
          input,
        });
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? event : e))
        );
        return event;
      } catch (err) {
        console.error('Failed to update event:', err);
        return null;
      }
    },
    []
  );

  const deleteEvent = useCallback(async (id: number): Promise<boolean> => {
    try {
      await invoke('delete_event', { id });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete event:', err);
      return false;
    }
  }, []);

  const getEventsForDate = useCallback(
    (date: string): CalendarEvent[] => {
      return events.filter((e) => e.date === date);
    },
    [events]
  );

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    refreshEvents: () => fetchMonthEvents(year, month, calendarId),
  };
}
