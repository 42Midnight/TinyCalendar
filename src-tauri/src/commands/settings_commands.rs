use crate::AppState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct HolidayInfo {
    pub id: String,
    pub name: String,
    pub enabled: bool,
}

fn default_holidays() -> Vec<HolidayInfo> {
    vec![
        HolidayInfo { id: "元旦".into(), name: "元旦".into(), enabled: true },
        HolidayInfo { id: "春节".into(), name: "春节".into(), enabled: true },
        HolidayInfo { id: "元宵节".into(), name: "元宵节".into(), enabled: true },
        HolidayInfo { id: "情人节".into(), name: "情人节".into(), enabled: true },
        HolidayInfo { id: "妇女节".into(), name: "妇女节".into(), enabled: true },
        HolidayInfo { id: "植树节".into(), name: "植树节".into(), enabled: true },
        HolidayInfo { id: "愚人节".into(), name: "愚人节".into(), enabled: true },
        HolidayInfo { id: "清明节".into(), name: "清明节".into(), enabled: true },
        HolidayInfo { id: "劳动节".into(), name: "劳动节".into(), enabled: true },
        HolidayInfo { id: "青年节".into(), name: "青年节".into(), enabled: true },
        HolidayInfo { id: "母亲节".into(), name: "母亲节".into(), enabled: true },
        HolidayInfo { id: "儿童节".into(), name: "儿童节".into(), enabled: true },
        HolidayInfo { id: "建党节".into(), name: "建党节".into(), enabled: true },
        HolidayInfo { id: "建军节".into(), name: "建军节".into(), enabled: true },
        HolidayInfo { id: "端午节".into(), name: "端午节".into(), enabled: true },
        HolidayInfo { id: "父亲节".into(), name: "父亲节".into(), enabled: true },
        HolidayInfo { id: "七夕".into(), name: "七夕".into(), enabled: true },
        HolidayInfo { id: "中元节".into(), name: "中元节".into(), enabled: true },
        HolidayInfo { id: "教师节".into(), name: "教师节".into(), enabled: true },
        HolidayInfo { id: "中秋节".into(), name: "中秋节".into(), enabled: true },
        HolidayInfo { id: "国庆节".into(), name: "国庆节".into(), enabled: true },
        HolidayInfo { id: "重阳节".into(), name: "重阳节".into(), enabled: true },
        HolidayInfo { id: "圣诞节".into(), name: "圣诞节".into(), enabled: true },
        HolidayInfo { id: "除夕".into(), name: "除夕".into(), enabled: true },
    ]
}

#[derive(Serialize)]
pub struct AppSettings {
    pub font_size: String,
    pub show_lunar: bool,
    pub show_holidays: bool,
    pub global_shortcut: String,
    pub holidays: Vec<HolidayInfo>,
}

impl AppSettings {
    fn from_map(map: &HashMap<String, String>) -> Self {
        let mut holidays = default_holidays();
        if let Some(disabled) = map.get("disabled_holidays") {
            let disabled_ids: Vec<&str> = disabled.split(',').filter(|s| !s.is_empty()).collect();
            for h in &mut holidays {
                if disabled_ids.contains(&h.id.as_str()) {
                    h.enabled = false;
                }
            }
        }
        AppSettings {
            font_size: map.get("font_size").cloned().unwrap_or_else(|| "medium".into()),
            show_lunar: map.get("show_lunar").map(|v| v == "true").unwrap_or(false),
            show_holidays: map.get("show_holidays").map(|v| v == "true").unwrap_or(false),
            global_shortcut: map.get("global_shortcut").cloned().unwrap_or_else(|| "Ctrl+Shift+C".into()),
            holidays,
        }
    }
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT key, value FROM settings").map_err(|e| e.to_string())?;
    let map: HashMap<String, String> = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(AppSettings::from_map(&map))
}

#[tauri::command]
pub fn get_holidays(state: State<AppState>) -> Result<Vec<HolidayInfo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let disabled: String = db
        .query_row(
            "SELECT value FROM settings WHERE key='disabled_holidays'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_default();
    let disabled_ids: Vec<&str> = disabled.split(',').filter(|s| !s.is_empty()).collect();
    let mut holidays = default_holidays();
    for h in &mut holidays {
        if disabled_ids.contains(&h.id.as_str()) {
            h.enabled = false;
        }
    }
    Ok(holidays)
}

#[tauri::command]
pub fn update_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_holiday_toggle(state: State<AppState>, holiday_id: String, enabled: bool) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let disabled: String = db
        .query_row("SELECT value FROM settings WHERE key='disabled_holidays'", [], |row| row.get(0))
        .unwrap_or_default();
    let mut disabled_ids: Vec<String> = disabled.split(',').filter(|s| !s.is_empty()).map(|s| s.to_string()).collect();
    if enabled {
        disabled_ids.retain(|s| s != &holiday_id);
    } else if !disabled_ids.contains(&holiday_id) {
        disabled_ids.push(holiday_id);
    }
    db.execute(
        "INSERT INTO settings (key, value) VALUES ('disabled_holidays', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![disabled_ids.join(",")],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
