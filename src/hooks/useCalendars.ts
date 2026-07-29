import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Calendar } from '../types';

export function useCalendars() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCalendars = useCallback(async () => {
    try {
      const cals = await invoke<Calendar[]>('get_calendars');
      setCalendars(cals);
      if (cals.length > 0) {
        setActiveCalendarId((prev) => {
          if (prev && cals.find((c) => c.id === prev)) return prev;
          return cals[0].id;
        });
      }
    } catch (err) {
      console.error('Failed to load calendars:', err);
    }
  }, []);

  useEffect(() => {
    loadCalendars().finally(() => setLoading(false));
  }, [loadCalendars]);

  const addCalendar = useCallback(async (name: string, color: string) => {
    try {
      await invoke<Calendar>('create_calendar', { name, color });
      await loadCalendars();
    } catch (err) { console.error('Failed to create calendar:', err); }
  }, [loadCalendars]);

  const editCalendar = useCallback(async (id: number, name: string, color: string, isVisible: boolean) => {
    try {
      await invoke<Calendar>('update_calendar', { id, name, color, isVisible });
      await loadCalendars();
    } catch (err) { console.error('Failed to update calendar:', err); }
  }, [loadCalendars]);

  const removeCalendar = useCallback(async (id: number) => {
    try {
      await invoke('delete_calendar', { id });
      setActiveCalendarId((prev) => (prev === id ? null : prev));
      await loadCalendars();
    } catch (err) { console.error('Failed to delete calendar:', err); }
  }, [loadCalendars]);

  return {
    calendars, activeCalendarId, setActiveCalendarId, loading,
    addCalendar, editCalendar, removeCalendar, refreshCalendars: loadCalendars,
  };
}
