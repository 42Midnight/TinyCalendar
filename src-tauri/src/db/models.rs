use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Calendar {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub is_visible: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: i64,
    pub title: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub calendar_id: Option<i64>,
    pub calendar_name: Option<String>,
    pub calendar_color: Option<String>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub is_all_day: bool,
    pub note: String,
    pub location: String,
    pub repeat_rule: String,
    pub repeat_end_date: Option<String>,
    pub parent_event_id: Option<i64>,
    pub notification_min: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventInput {
    pub title: String,
    pub category_id: Option<i64>,
    pub calendar_id: Option<i64>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub is_all_day: bool,
    pub note: String,
    pub location: String,
    pub repeat_rule: String,
    pub repeat_end_date: Option<String>,
    pub notification_min: i32,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEventInput {
    pub id: i64,
    pub title: String,
    pub category_id: Option<i64>,
    pub calendar_id: Option<i64>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub is_all_day: bool,
    pub note: String,
    pub location: String,
    pub repeat_rule: String,
    pub repeat_end_date: Option<String>,
    pub notification_min: i32,
}
