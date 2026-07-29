mod commands;
mod db;
mod services;
mod tray;
mod utils;

use db::connection::init_db;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Initialize database
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");

            // Multi-instance protection via lock file
            let lock_path = app_dir.join("instance.lock");
            if lock_path.exists() {
                // Check if the lock is stale (>10 seconds old, might be from crash)
                if let Ok(metadata) = std::fs::metadata(&lock_path) {
                    if let Ok(modified) = metadata.modified() {
                        let age = std::time::SystemTime::now()
                            .duration_since(modified)
                            .unwrap_or_default();
                        if age.as_secs() < 10 {
                            eprintln!("TinyCalendar is already running.");
                            std::process::exit(1);
                        }
                        // Stale lock - remove and recreate
                        let _ = std::fs::remove_file(&lock_path);
                    }
                }
            }
            // Touch lock file with current timestamp
            std::fs::write(&lock_path, &[]).expect("Failed to create lock file");

            // Update lock timestamp periodically
            let lock_heartbeat = lock_path.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(5));
                let _ = std::fs::write(&lock_heartbeat, &[]);
            });

            let db_path = app_dir.join("calendar.db");
            let conn = init_db(&db_path).expect("Failed to initialize database");

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            // Setup system tray
            #[cfg(desktop)]
            {
                let window = app.get_webview_window("main").unwrap();
                tray::create_tray(app.handle(), window)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::event_commands::get_month_events,
            commands::event_commands::get_day_events,
            commands::event_commands::create_event,
            commands::event_commands::update_event,
            commands::event_commands::delete_event,
            commands::event_commands::search_events,
            commands::calendar_commands::get_calendar_data,
            commands::calendar_commands::get_calendars,
            commands::calendar_commands::create_calendar,
            commands::calendar_commands::update_calendar,
            commands::calendar_commands::delete_calendar,
            commands::category_commands::get_categories,
            commands::category_commands::create_category,
            commands::category_commands::update_category,
            commands::category_commands::delete_category,
            commands::category_commands::update_category_order,
            commands::export_commands::export_to_json,
            commands::export_commands::export_to_file,
            commands::settings_commands::get_settings,
            commands::settings_commands::update_setting,
            commands::settings_commands::get_holidays,
            commands::settings_commands::update_holiday_toggle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
