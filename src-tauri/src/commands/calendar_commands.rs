use chrono::Datelike;
use crate::db::models::Calendar;
use crate::services::lunar_service;
use crate::AppState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn get_calendars(state: State<AppState>) -> Result<Vec<Calendar>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, name, color, sort_order, is_visible, created_at, updated_at FROM calendars ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let calendars = stmt
        .query_map([], |row| {
            Ok(Calendar {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                sort_order: row.get(3)?,
                is_visible: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(calendars)
}

#[tauri::command]
pub fn create_calendar(state: State<AppState>, name: String, color: String) -> Result<Calendar, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let max_order: i32 = db
        .query_row("SELECT COALESCE(MAX(sort_order), 0) FROM calendars", [], |row| row.get(0))
        .unwrap_or(0);
    db.execute(
        "INSERT INTO calendars (name, color, sort_order) VALUES (?1, ?2, ?3)",
        params![name, color, max_order + 1],
    )
    .map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    db.query_row(
        "SELECT id, name, color, sort_order, is_visible, created_at, updated_at FROM calendars WHERE id = ?1",
        params![id],
        |row| {
            Ok(Calendar {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                sort_order: row.get(3)?,
                is_visible: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_calendar(state: State<AppState>, id: i64, name: String, color: String, is_visible: bool) -> Result<Calendar, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE calendars SET name=?1, color=?2, is_visible=?3, updated_at=datetime('now', 'localtime') WHERE id=?4",
        params![name, color, is_visible as i32, id],
    )
    .map_err(|e| e.to_string())?;
    db.query_row(
        "SELECT id, name, color, sort_order, is_visible, created_at, updated_at FROM calendars WHERE id = ?1",
        params![id],
        |row| {
            Ok(Calendar {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                sort_order: row.get(3)?,
                is_visible: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_calendar(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Don't allow deleting the last remaining calendar
    let count: i32 = db.query_row("SELECT COUNT(*) FROM calendars", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if count <= 1 {
        return Err("Cannot delete the last calendar".into());
    }
    // Delete events belonging to this calendar
    db.execute("DELETE FROM events WHERE calendar_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    // Delete the calendar
    db.execute("DELETE FROM calendars WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_calendar_data(year: i32, month: u32, disabled_holidays: String) -> Result<CalendarData, String> {
    let first_day = chrono::NaiveDate::from_ymd_opt(year, month, 1).ok_or("Invalid date")?;
    let start_of_week = first_day.weekday().num_days_from_sunday();

    let days_in_month = if month == 12 {
        chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else { chrono::NaiveDate::from_ymd_opt(year, month + 1, 1) }
    .ok_or("Invalid date")?.signed_duration_since(first_day).num_days() as u32;

    let prev_month = if month == 1 { 12 } else { month - 1 };
    let prev_year = if month == 1 { year - 1 } else { year };
    let days_in_prev_month = if prev_month == 12 {
        chrono::NaiveDate::from_ymd_opt(prev_year + 1, 1, 1)
    } else { chrono::NaiveDate::from_ymd_opt(prev_year, prev_month + 1, 1) }
    .ok_or("Invalid date")?.signed_duration_since(
        chrono::NaiveDate::from_ymd_opt(prev_year, prev_month, 1).unwrap()).num_days() as u32;

    let mut days: Vec<CalendarDay> = Vec::new();

    for i in (0..start_of_week).rev() {
        let d = days_in_prev_month - i;
        let (lt, ht) = lunar_info(prev_year, prev_month, d, &disabled_holidays);
        days.push(CalendarDay { day: d, month: prev_month, year: prev_year, is_current_month: false, is_today: false, lunar_text: lt, holiday_text: ht });
    }

    let today = chrono::Local::now().date_naive();
    for day in 1..=days_in_month {
        let (lt, ht) = lunar_info(year, month, day, &disabled_holidays);
        let date = chrono::NaiveDate::from_ymd_opt(year, month, day).unwrap();
        days.push(CalendarDay { day, month, year, is_current_month: true, is_today: date == today, lunar_text: lt, holiday_text: ht });
    }

    let remaining = 42 - days.len();
    let next_month = if month == 12 { 1 } else { month + 1 };
    let next_year = if month == 12 { year + 1 } else { year };
    for day in 1..=remaining as u32 {
        let (lt, ht) = lunar_info(next_year, next_month, day, &disabled_holidays);
        days.push(CalendarDay { day, month: next_month, year: next_year, is_current_month: false, is_today: false, lunar_text: lt, holiday_text: ht });
    }

    Ok(CalendarData { days })
}

fn lunar_info(year: i32, month: u32, day: u32, disabled: &str) -> (String, String) {
    let lunar = lunar_service::get_lunar_date(year, month, day);
    let lunar_text = lunar
        .map(|(lm, ld)| {
            if ld == 1 { lunar_service::get_lunar_month_name(lm).to_string() }
            else { lunar_service::get_lunar_day_name(ld).to_string() }
        })
        .unwrap_or_default();

    let disabled_set: std::collections::HashSet<&str> = disabled.split(',').filter(|s| !s.is_empty()).collect();

    let holiday_text = lunar_service::get_holiday(year, month, day)
        .filter(|name| !disabled_set.contains(name.as_str()))
        .or_else(|| {
            lunar.and_then(|(lm, ld)| lunar_service::get_lunar_festival(lm, ld))
                .filter(|name| !disabled_set.contains(name.as_str()))
        })
        .unwrap_or_default();

    (lunar_text, holiday_text)
}

#[derive(serde::Serialize)]
pub struct CalendarData { pub days: Vec<CalendarDay> }

#[derive(serde::Serialize)]
pub struct CalendarDay {
    pub day: u32, pub month: u32, pub year: i32,
    pub is_current_month: bool, pub is_today: bool,
    pub lunar_text: String, pub holiday_text: String,
}
