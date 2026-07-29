export interface Calendar {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  calendar_id: number | null;
  calendar_name: string | null;
  calendar_color: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  note: string;
  location: string;
  repeat_rule: string;
  repeat_end_date: string | null;
  parent_event_id: number | null;
  notification_min: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  category_id: number | null;
  calendar_id: number | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  note: string;
  location: string;
  repeat_rule: string;
  repeat_end_date: string | null;
  notification_min: number;
}

export interface UpdateEventInput extends CreateEventInput {
  id: number;
}

export interface CalendarDay {
  day: number;
  month: number;
  year: number;
  is_current_month: boolean;
  is_today: boolean;
  lunar_text: string;
  holiday_text: string;
}

export interface CalendarData {
  days: CalendarDay[];
}

export type ViewMode = 'month' | 'week' | 'day';

export type ThemeMode = 'light' | 'dark' | 'system';
