use crate::db::models::{CalendarEvent, Category};
use crate::AppState;
use std::fs;
use tauri::State;

fn build_export_json(state: &AppState) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut cal_stmt = db
        .prepare("SELECT id, name, color, sort_order, is_visible, created_at, updated_at FROM calendars ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let calendars: Vec<crate::db::models::Calendar> = cal_stmt
        .query_map([], |row| {
            Ok(crate::db::models::Calendar {
                id: row.get(0)?, name: row.get(1)?, color: row.get(2)?,
                sort_order: row.get(3)?,
                is_visible: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?, updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut cat_stmt = db
        .prepare("SELECT id, name, color, icon, sort_order, created_at, updated_at FROM categories ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let categories: Vec<Category> = cat_stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?, name: row.get(1)?, color: row.get(2)?,
                icon: row.get(3)?, sort_order: row.get(4)?,
                created_at: row.get(5)?, updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut evt_stmt = db
        .prepare(
            "SELECT id, title, category_id, date, start_time, end_time,
             is_all_day, note, location, repeat_rule, repeat_end_date,
             parent_event_id, notification_min, calendar_id, created_at, updated_at
             FROM events ORDER BY date, start_time",
        )
        .map_err(|e| e.to_string())?;
    let events: Vec<CalendarEvent> = evt_stmt
        .query_map([], |row| {
            Ok(CalendarEvent {
                id: row.get(0)?, title: row.get(1)?, category_id: row.get(2)?,
                category_name: None, category_color: None,
                calendar_id: row.get(13)?, calendar_name: None, calendar_color: None,
                date: row.get(3)?, start_time: row.get(4)?, end_time: row.get(5)?,
                is_all_day: row.get::<_, i32>(6)? != 0,
                note: row.get(7)?, location: row.get(8)?,
                repeat_rule: row.get(9)?, repeat_end_date: row.get(10)?,
                parent_event_id: row.get(11)?, notification_min: row.get(12)?,
                created_at: row.get(14)?, updated_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let export = serde_json::json!({
        "version": "2.0",
        "exported_at": chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        "calendars": calendars,
        "categories": categories,
        "events": events,
    });

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_to_json(state: State<AppState>) -> Result<String, String> {
    build_export_json(&state)
}

#[tauri::command]
pub fn export_to_file(state: State<AppState>, path: String) -> Result<(), String> {
    let json = build_export_json(&state)?;
    fs::write(&path, json).map_err(|e| e.to_string())
}
