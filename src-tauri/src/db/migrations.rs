use rusqlite::{Connection, Result};

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)",
        [],
    )?;

    let version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if version < 1 {
        migrate_v1(conn)?;
    }
    if version < 2 {
        migrate_v2(conn)?;
    }
    if version < 3 {
        migrate_v3(conn)?;
    }

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS categories (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            color       TEXT NOT NULL DEFAULT '#3B82F6',
            icon        TEXT DEFAULT '',
            sort_order  INTEGER DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        CREATE TABLE IF NOT EXISTS events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT NOT NULL,
            category_id     INTEGER REFERENCES categories(id),
            date            TEXT NOT NULL,
            start_time      TEXT,
            end_time        TEXT,
            is_all_day      INTEGER DEFAULT 0,
            note            TEXT DEFAULT '',
            location        TEXT DEFAULT '',
            repeat_rule     TEXT DEFAULT '',
            repeat_end_date TEXT,
            parent_event_id INTEGER,
            notification_min INTEGER DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
        CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
        CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id);
        CREATE INDEX IF NOT EXISTS idx_events_date_range ON events(date, start_time);
        INSERT INTO categories (name, color, sort_order) VALUES
            ('考试','#EF4444',1),('见面','#F59E0B',2),('课表','#3B82F6',3),
            ('工作','#8B5CF6',4),('个人','#10B981',5),('其他','#6B7280',6);
        INSERT INTO schema_version (version) VALUES (1);
        ",
    )?;
    Ok(())
}

fn migrate_v2(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        INSERT OR IGNORE INTO settings (key, value) VALUES
            ('font_size', 'medium'),
            ('show_lunar', 'false'),
            ('show_holidays', 'false'),
            ('global_shortcut', 'Ctrl+Shift+C');
        INSERT INTO schema_version (version) VALUES (2);
        ",
    )?;
    Ok(())
}

fn migrate_v3(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS calendars (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            color      TEXT NOT NULL DEFAULT '#3B82F6',
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_visible INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        INSERT OR IGNORE INTO calendars (name, color, sort_order) VALUES ('默认日历', '#3B82F6', 0);
        ALTER TABLE events ADD COLUMN calendar_id INTEGER DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_events_calendar ON events(calendar_id);
        INSERT INTO schema_version (version) VALUES (3);
        ",
    )?;
    Ok(())
}
