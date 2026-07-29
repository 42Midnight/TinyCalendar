use crate::db::models::{CalendarEvent, CreateEventInput, UpdateEventInput};
use crate::AppState;
use rusqlite::params;
use tauri::State;

fn map_event(
    row: &rusqlite::Row,
) -> Result<CalendarEvent, rusqlite::Error> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        title: row.get(1)?,
        category_id: row.get(2)?,
        category_name: row.get(10)?,
        category_color: row.get(11)?,
        calendar_id: row.get(12)?,
        calendar_name: row.get(13)?,
        calendar_color: row.get(14)?,
        date: row.get(3)?,
        start_time: row.get(4)?,
        end_time: row.get(5)?,
        is_all_day: row.get::<_, i32>(6)? != 0,
        note: row.get(7)?,
        location: row.get(8)?,
        repeat_rule: row.get(9)?,
        repeat_end_date: row.get(15)?,
        parent_event_id: row.get(16)?,
        notification_min: row.get(17)?,
        created_at: row.get(18)?,
        updated_at: row.get(19)?,
    })
}

const EVENT_SELECT: &str = "
    SELECT e.id, e.title, e.category_id, e.date, e.start_time, e.end_time,
           e.is_all_day, e.note, e.location, e.repeat_rule,
           c.name, c.color,
           e.calendar_id, cal.name, cal.color,
           e.repeat_end_date, e.parent_event_id,
           e.notification_min, e.created_at, e.updated_at
    FROM events e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN calendars cal ON e.calendar_id = cal.id
";

#[tauri::command]
pub fn get_month_events(
    state: State<AppState>,
    year: i32,
    month: u32,
    calendar_id: Option<i64>,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let start_date = format!("{:04}-{:02}-01", year, month);
    let end_day = 31;
    let end_date = format!("{:04}-{:02}-{}", year, month, end_day);

    let mut sql = format!(
        "{} WHERE e.date >= ?1 AND e.date <= ?2",
        EVENT_SELECT
    );
    if calendar_id.is_some() {
        sql.push_str(" AND e.calendar_id = ?3");
    }
    sql.push_str(" ORDER BY e.date, e.start_time");

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;

    let events = if let Some(cal_id) = calendar_id {
        stmt
            .query_map(params![start_date, end_date, cal_id], map_event)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    } else {
        stmt
            .query_map(params![start_date, end_date], map_event)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    };

    Ok(events)
}

#[tauri::command]
pub fn get_day_events(
    state: State<AppState>,
    date: String,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(&format!(
            "{} WHERE e.date = ?1 ORDER BY e.start_time",
            EVENT_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let events = stmt
        .query_map(params![date], map_event)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(events)
}

#[tauri::command]
pub fn create_event(
    state: State<AppState>,
    input: CreateEventInput,
) -> Result<CalendarEvent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO events (title, category_id, calendar_id, date, start_time, end_time, is_all_day,
         note, location, repeat_rule, repeat_end_date, notification_min)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            input.title,
            input.category_id,
            input.calendar_id,
            input.date,
            input.start_time,
            input.end_time,
            input.is_all_day as i32,
            input.note,
            input.location,
            input.repeat_rule,
            input.repeat_end_date,
            input.notification_min,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();

    db.query_row(
        &format!("{} WHERE e.id = ?1", EVENT_SELECT),
        params![id],
        map_event,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_event(
    state: State<AppState>,
    input: UpdateEventInput,
) -> Result<CalendarEvent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE events SET title=?1, category_id=?2, calendar_id=?3, date=?4, start_time=?5,
         end_time=?6, is_all_day=?7, note=?8, location=?9, repeat_rule=?10,
         repeat_end_date=?11, notification_min=?12,
         updated_at=datetime('now', 'localtime')
         WHERE id=?13",
        params![
            input.title,
            input.category_id,
            input.calendar_id,
            input.date,
            input.start_time,
            input.end_time,
            input.is_all_day as i32,
            input.note,
            input.location,
            input.repeat_rule,
            input.repeat_end_date,
            input.notification_min,
            input.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    db.query_row(
        &format!("{} WHERE e.id = ?1", EVENT_SELECT),
        params![input.id],
        map_event,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_event(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM events WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_events(
    state: State<AppState>,
    keyword: String,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", keyword);

    let mut stmt = db
        .prepare(&format!(
            "{} WHERE e.title LIKE ?1 OR e.note LIKE ?1 OR e.location LIKE ?1
             ORDER BY e.date DESC LIMIT 100",
            EVENT_SELECT
        ))
        .map_err(|e| e.to_string())?;

    let events = stmt
        .query_map(params![pattern], map_event)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(events)
}
