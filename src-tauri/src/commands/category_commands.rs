use crate::db::models::Category;
use crate::AppState;
use rusqlite::params;
use tauri::State;

fn map_category(row: &rusqlite::Row) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        icon: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

#[tauri::command]
pub fn get_categories(state: State<AppState>) -> Result<Vec<Category>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, name, color, icon, sort_order, created_at, updated_at FROM categories ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let categories = stmt
        .query_map([], map_category)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(categories)
}

#[tauri::command]
pub fn create_category(
    state: State<AppState>,
    name: String,
    color: String,
) -> Result<Category, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Get next sort_order
    let max_order: i32 = db
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM categories",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    db.execute(
        "INSERT INTO categories (name, color, sort_order, updated_at) VALUES (?1, ?2, ?3, datetime('now','localtime'))",
        params![name, color, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();
    db.query_row(
        "SELECT id, name, color, icon, sort_order, created_at, updated_at FROM categories WHERE id=?1",
        params![id],
        map_category,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category(
    state: State<AppState>,
    id: i64,
    name: String,
    color: String,
) -> Result<Category, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE categories SET name=?1, color=?2, updated_at=datetime('now','localtime') WHERE id=?3",
        params![name, color, id],
    )
    .map_err(|e| e.to_string())?;

    db.query_row(
        "SELECT id, name, color, icon, sort_order, created_at, updated_at FROM categories WHERE id=?1",
        params![id],
        map_category,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Cascade delete: remove all events under this category
    db.execute("DELETE FROM events WHERE category_id=?1", params![id])
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM categories WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_category_order(
    state: State<AppState>,
    ordered_ids: Vec<i64>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    for (i, id) in ordered_ids.iter().enumerate() {
        db.execute(
            "UPDATE categories SET sort_order=?1, updated_at=datetime('now','localtime') WHERE id=?2",
            params![(i + 1) as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
