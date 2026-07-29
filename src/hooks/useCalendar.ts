import { useState, useCallback, useMemo } from 'react';
import type { ViewMode } from '../types';

export function useCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const shiftDate = useCallback((days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    setYear(y);
    setMonth(m);
    setSelectedDate(
      `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
  }, [selectedDate]);

  const goToPrev = useCallback(() => {
    if (viewMode === 'month') {
      if (month === 1) { setMonth(12); setYear((y) => y - 1); }
      else { setMonth((m) => m - 1); }
    } else if (viewMode === 'week') {
      shiftDate(-7);
    } else {
      shiftDate(-1);
    }
  }, [viewMode, month, shiftDate]);

  const goToNext = useCallback(() => {
    if (viewMode === 'month') {
      if (month === 12) { setMonth(1); setYear((y) => y + 1); }
      else { setMonth((m) => m + 1); }
    } else if (viewMode === 'week') {
      shiftDate(7);
    } else {
      shiftDate(1);
    }
  }, [viewMode, month, shiftDate]);

  const goToToday = useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth() + 1);
    setSelectedDate(
      `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
    );
  }, []);

  const selectDate = useCallback(
    (day: number, monthOverride?: number, yearOverride?: number) => {
      const y = yearOverride ?? year;
      const m = monthOverride ?? month;
      setSelectedDate(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    },
    [year, month]
  );

  // months (for fetching events)
  const months = useMemo(() => {
    const ms = new Set<[number, number]>();
    ms.add([year, month]);
    if (viewMode === 'week') {
      const d = new Date(selectedDate);
      const prev = new Date(d); prev.setDate(d.getDate() - d.getDay());
      const next = new Date(d); next.setDate(d.getDate() + (6 - d.getDay()));
      ms.add([prev.getFullYear(), prev.getMonth() + 1]);
      ms.add([next.getFullYear(), next.getMonth() + 1]);
    }
    return Array.from(ms);
  }, [year, month, selectedDate, viewMode]);

  return {
    year,
    month,
    selectedDate,
    viewMode,
    setViewMode,
    goToPrev,
    goToNext,
    goToToday,
    selectDate,
    months,
  };
}
