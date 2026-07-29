import { useEffect, useRef } from 'react';
import type { CalendarEvent } from '../../types';

interface SearchBarProps {
  keyword: string;
  results: CalendarEvent[];
  searching: boolean;
  showResults: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function SearchBar({
  keyword,
  results,
  searching,
  showResults,
  onChange,
  onClear,
  onEventClick,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        onClear();
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClear]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClear();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClear]);

  return (
    <div ref={containerRef} className="relative px-3 py-2">
      <div className="relative">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {searching ? '⏳' : '🔍'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={keyword}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜索事件... (Ctrl+K)"
          className="input pl-8 pr-6 text-[12px]"
        />
        {keyword && (
          <button
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {showResults && (
        <div
          className="absolute left-3 right-3 top-full mt-1 rounded-md shadow-lg z-40 max-h-64 overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
          }}
        >
          {results.length === 0 ? (
            <div
              className="px-3 py-4 text-center text-[12px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              没有找到相关事件
            </div>
          ) : (
            results.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--hover)] transition-colors"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        event.category_color || 'var(--text-tertiary)',
                    }}
                  />
                  <span className="text-[12px] font-medium truncate">
                    {event.title}
                  </span>
                </div>
                <div
                  className="text-[11px] mt-0.5 ml-4"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {event.date}
                  {event.start_time ? ` ${event.start_time}` : ''}
                  {event.category_name ? ` · ${event.category_name}` : ''}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
