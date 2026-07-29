# TinyCalendar — 数据库设计文档

> 版本：v0.1 | 日期：2026-06-21 | 状态：草案待审查

---

## 1. 数据库概述

- **数据库类型**：SQLite 3
- **文件位置**：`%APPDATA%\com.tinycalendar.app\calendar.db`
- **访问方式**：Rust 后端单连接（Mutex 保护），前端不直接访问
- **字符编码**：UTF-8
- **日期时间格式**：ISO 8601 字符串（`YYYY-MM-DD` / `YYYY-MM-DD HH:MM`）

---

## 2. ER 图

```
┌─────────────────┐         ┌──────────────────────┐
│   categories    │         │       events         │
├─────────────────┤         ├──────────────────────┤
│ id (PK)         │◄────────│ category_id (FK)      │
│ name            │         │ id (PK)               │
│ color           │         │ title                 │
│ icon            │         │ date                  │
│ sort_order      │         │ start_time            │
│ created_at      │         │ end_time              │
│ updated_at      │         │ is_all_day            │
└─────────────────┘         │ note                  │
                            │ location              │
                            │ repeat_rule           │
                            │ repeat_end_date       │
                            │ parent_event_id (FK→events.id)
                            │ notification_min      │
                            │ created_at            │
                            │ updated_at            │
                            └──────────────────────┘
```

---

## 3. 表结构定义

### 3.1 categories（分类表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 分类 ID |
| `name` | TEXT | NOT NULL | 分类名称 |
| `color` | TEXT | NOT NULL, DEFAULT '#3B82F6' | 分类颜色（HEX） |
| `icon` | TEXT | DEFAULT '' | 图标标识（预留，P2） |
| `sort_order` | INTEGER | DEFAULT 0 | 排序序号 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

### 3.2 events（事件表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 事件 ID |
| `title` | TEXT | NOT NULL | 事件标题 |
| `category_id` | INTEGER | FOREIGN KEY → categories.id | 所属分类 |
| `date` | TEXT | NOT NULL | 事件日期 `YYYY-MM-DD` |
| `start_time` | TEXT | 可空 | 开始时间 `HH:MM`，全天事件为 NULL |
| `end_time` | TEXT | 可空 | 结束时间 `HH:MM`，全天事件为 NULL |
| `is_all_day` | INTEGER | DEFAULT 0 | 是否全天事件（0=否, 1=是） |
| `note` | TEXT | DEFAULT '' | 备注信息 |
| `location` | TEXT | DEFAULT '' | 地点 |
| `repeat_rule` | TEXT | DEFAULT '' | 重复规则：`''`/`'daily'`/`'weekly'`/`'monthly'`/`'yearly'` |
| `repeat_end_date` | TEXT | 可空 | 重复结束日期 `YYYY-MM-DD`，NULL=无限重复 |
| `parent_event_id` | INTEGER | 可空, FK→events.id | 重复事件的母事件 ID（例外事件使用） |
| `notification_min` | INTEGER | DEFAULT 0 | 提前多少分钟提醒（0=不提醒） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

---

## 4. 索引

```sql
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_parent ON events(parent_event_id);
CREATE INDEX idx_events_date_range ON events(date, start_time);
```

| 索引 | 目的 |
|---|---|
| `idx_events_date` | 加速按日期查询（最高频操作） |
| `idx_events_category` | 加速分类筛选 |
| `idx_events_parent` | 加速重复事件例外查询 |
| `idx_events_date_range` | 加速某日范围内按时间排序 |

---

## 5. 初始化 SQL

```sql
-- 建表
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
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    category_id         INTEGER REFERENCES categories(id),
    date                TEXT NOT NULL,
    start_time          TEXT,
    end_time            TEXT,
    is_all_day          INTEGER DEFAULT 0,
    note                TEXT DEFAULT '',
    location            TEXT DEFAULT '',
    repeat_rule         TEXT DEFAULT '',
    repeat_end_date     TEXT,
    parent_event_id     INTEGER,
    notification_min    INTEGER DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON events(date, start_time);

-- 预设分类
INSERT INTO categories (name, color, sort_order) VALUES
    ('考试', '#EF4444', 1),
    ('见面', '#F59E0B', 2),
    ('课表', '#3B82F6', 3),
    ('工作', '#8B5CF6', 4),
    ('个人', '#10B981', 5),
    ('其他', '#6B7280', 6);
```

---

## 6. 常用查询

### 6.1 获取某月所有事件
```sql
SELECT e.*, c.name AS category_name, c.color AS category_color
FROM events e
LEFT JOIN categories c ON e.category_id = c.id
WHERE e.date >= '2026-06-01' AND e.date <= '2026-06-30'
ORDER BY e.date, e.start_time;
```

### 6.2 按关键词搜索
```sql
SELECT e.*, c.name AS category_name, c.color AS category_color
FROM events e
LEFT JOIN categories c ON e.category_id = c.id
WHERE e.title LIKE '%考试%' OR e.note LIKE '%考试%'
ORDER BY e.date DESC;
```

### 6.3 按分类筛选
```sql
SELECT e.*, c.name AS category_name, c.color AS category_color
FROM events e
LEFT JOIN categories c ON e.category_id = c.id
WHERE e.category_id = 1
ORDER BY e.date, e.start_time;
```

### 6.4 获取需要提醒的事件（当前时间前后 1 分钟）
```sql
SELECT e.*, c.name AS category_name, c.color AS category_color
FROM events e
LEFT JOIN categories c ON e.category_id = c.id
WHERE e.notification_min > 0
  AND e.date = date('now', 'localtime')
  AND e.start_time IS NOT NULL
  AND datetime(e.date || ' ' || e.start_time, '-' || e.notification_min || ' minutes')
      <= datetime('now', 'localtime', '+1 minutes')
  AND datetime(e.date || ' ' || e.start_time)
      > datetime('now', 'localtime');
```

---

## 7. 数据库迁移策略

采用版本号迁移方案：

1. 在 `categories` 表中新增时建立一个 `schema_version` 配置表记录版本号
2. `migrations.rs` 中按版本号顺序排列迁移脚本
3. 启动时检查当前版本，按需执行未应用的迁移

```rust
// 伪代码示意
pub fn run_migrations(conn: &Connection) -> Result<()> {
    let version = get_schema_version(conn)?;
    if version < 1 {
        execute_migration_v1(conn)?; // 初始建表
    }
    // if version < 2 { execute_migration_v2(conn)?; }
    Ok(())
}
```

---

> 📌 **审查要点**：events 表的字段是否满足记事需求？分类预设是否合理？重复事件存储策略是否可接受？
