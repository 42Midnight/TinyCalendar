import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalendarEvent } from '../types';

export function useSearch() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (kw: string) => {
    if (!kw.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const events = await invoke<CalendarEvent[]>('search_events', {
        keyword: kw,
      });
      setResults(events);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setKeyword(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => search(value), 250);
    },
    [search]
  );

  const clear = useCallback(() => {
    setKeyword('');
    setResults([]);
    setShowResults(false);
  }, []);

  return {
    keyword,
    results,
    searching,
    showResults,
    handleChange,
    clear,
  };
}
