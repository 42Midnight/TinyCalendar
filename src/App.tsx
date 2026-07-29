import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from './hooks/useTheme';
import { useCalendar } from './hooks/useCalendar';
import { useEvents } from './hooks/useEvents';
import { useCategories } from './hooks/useCategories';
import { useSearch } from './hooks/useSearch';
import { useSettings } from './hooks/useSettings';
import { useCalendars } from './hooks/useCalendars';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import CalendarHeader from './components/calendar/CalendarHeader';
import MonthView from './components/calendar/MonthView';
import WeekView from './components/calendar/WeekView';
import DayView from './components/calendar/DayView';
import EventPanel from './components/event/EventPanel';
import EventEditor from './components/event/EventEditor';
import DayDetail from './components/event/DayDetail';
import SearchBar from './components/search/SearchBar';
import SettingsModal from './components/settings/SettingsModal';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from './types';
import { todayString } from './utils/calendar';

export default function App() {
  const appWindow = getCurrentWindow();
  const { theme, setTheme } = useTheme();
  const calendar = useCalendar();
  const { calendars, activeCalendarId, setActiveCalendarId, addCalendar, editCalendar, removeCalendar } = useCalendars();
  const { events, createEvent, updateEvent, deleteEvent, refreshEvents } =
    useEvents(calendar.year, calendar.month, activeCalendarId);
  const { categories, activeFilter, toggleFilter, addCategory, editCategory, removeCategory, reorderCategories } =
    useCategories();
  const search = useSearch();
  const { settings, updateSetting, toggleHoliday } = useSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingDate, setEditingDate] = useState<string>(todayString());
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);

  // Compute disabled holidays string
  const disabledHolidays = useMemo(() => {
    if (!settings.holidays) return '';
    return settings.holidays.filter((h) => !h.enabled).map((h) => h.id).join(',');
  }, [settings.holidays]);

  // Font size
  useEffect(() => {
    const sizes: Record<string, string> = { small: '13px', medium: '14px', large: '16px' };
    document.documentElement.style.fontSize = sizes[settings.font_size] || '14px';
  }, [settings.font_size]);

  // Global shortcut
  const shortcutRef = useRef(settings.global_shortcut);
  useEffect(() => {
    const s = settings.global_shortcut;
    if (!s) return;
    if (shortcutRef.current && shortcutRef.current !== s) unregister(shortcutRef.current).catch(() => {});
    shortcutRef.current = s;
    register(s, async (evt) => {
      if (evt.state === 'Pressed') {
        const v = await appWindow.isVisible();
        if (v) await appWindow.hide(); else { await appWindow.show(); await appWindow.setFocus(); }
      }
    }).catch(() => {});
    return () => { unregister(s).catch(() => {}); };
  }, [settings.global_shortcut, appWindow]);

  // Export / Import
  const handleExport = useCallback(async () => {
    try {
      const path = await save({ defaultPath: `tinycalendar-export-${todayString()}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (path) await invoke('export_to_file', { path });
    } catch {}
  }, []);
  const handleImport = useCallback(() => fileInputRef.current?.click(), []);
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.events) { for (const evt of data.events) await invoke('create_event', { input: { ...evt, category_id: evt.category_id || null } }); refreshEvents(); }
    } catch { alert('导入失败，请检查文件格式'); }
    e.target.value = '';
  }, [refreshEvents]);

  // Event editing
  const handleNewEvent = useCallback((date?: string) => {
    setEditingEvent(null); setEditingDate(date || calendar.selectedDate); setEditorOpen(true);
  }, [calendar.selectedDate]);

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event); setEditorOpen(true); search.clear();
  }, [search]);

  const handleSearchClick = useCallback((event: CalendarEvent) => {
    const p = event.date.split('-');
    calendar.selectDate(parseInt(p[2]), parseInt(p[1]), parseInt(p[0]));
    setEditingEvent(event); setEditorOpen(true); search.clear();
  }, [calendar, search]);

  const handleSaveEvent = useCallback(async (input: CreateEventInput | UpdateEventInput) => {
    if ('id' in input) return await updateEvent(input);
    return await createEvent(input);
  }, [createEvent, updateEvent]);

  // Double-click date → open DayDetail
  const handleDoubleClickDate = useCallback((date: string) => {
    setDayDetailDate(date);
  }, []);

  const renderView = () => {
    switch (calendar.viewMode) {
      case 'month':
        return (
          <MonthView year={calendar.year} month={calendar.month}
            selectedDate={calendar.selectedDate} events={events}
            activeFilter={activeFilter} showLunar={settings.show_lunar}
            showHolidays={settings.show_holidays} disabledHolidays={disabledHolidays}
            onSelectDate={calendar.selectDate} onDoubleClickDate={handleDoubleClickDate} />
        );
      case 'week':
        return (
          <WeekView selectedDate={calendar.selectedDate} events={events}
            activeFilter={activeFilter}
            onSelectDate={calendar.selectDate} onDoubleClickDate={handleDoubleClickDate} />
        );
      case 'day':
        return (
          <DayView selectedDate={calendar.selectedDate} events={events}
            activeFilter={activeFilter} onDoubleClickDate={handleDoubleClickDate} />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
      <TitleBar onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar categories={categories} activeFilter={activeFilter}
          onToggleFilter={toggleFilter}
          onNewEvent={() => handleNewEvent()}
          onAddCategory={addCategory}
          onEditCategory={editCategory}
          onRemoveCategory={removeCategory}
          onReorderCategories={reorderCategories}
          eventCount={events.length}
          calendars={calendars}
          activeCalendarId={activeCalendarId}
          onSelectCalendar={setActiveCalendarId}>
          <SearchBar keyword={search.keyword} results={search.results}
            searching={search.searching} showResults={search.showResults}
            onChange={search.handleChange} onClear={search.clear}
            onEventClick={handleSearchClick} />
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <CalendarHeader year={calendar.year} month={calendar.month}
            selectedDate={calendar.selectedDate} viewMode={calendar.viewMode}
            onViewModeChange={calendar.setViewMode}
            onPrev={calendar.goToPrev} onNext={calendar.goToNext}
            onToday={calendar.goToToday} />

          <div className="flex flex-1 overflow-hidden">
            {renderView()}
            <EventPanel date={calendar.selectedDate} events={events}
              onEventClick={handleEditEvent} onNewEvent={() => handleNewEvent()} />
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      {dayDetailDate && (
        <DayDetail
          open={!!dayDetailDate}
          onClose={() => setDayDetailDate(null)}
          date={dayDetailDate}
          events={events}
          categories={categories}
          onEditEvent={handleEditEvent}
          onNewEvent={handleNewEvent}
        />
      )}

      <EventEditor open={editorOpen} onClose={() => setEditorOpen(false)}
        onSave={handleSaveEvent} onDelete={deleteEvent}
        event={editingEvent} date={editingDate} categories={categories}
        calendars={calendars} activeCalendarId={activeCalendarId} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        theme={theme} setTheme={setTheme}
        settings={settings} onUpdateSetting={updateSetting}
        onToggleHoliday={toggleHoliday}
        onExport={handleExport} onImport={handleImport}
        calendars={calendars}
        onAddCalendar={addCalendar}
        onEditCalendar={editCalendar}
        onRemoveCalendar={removeCalendar} />
    </div>
  );
}
