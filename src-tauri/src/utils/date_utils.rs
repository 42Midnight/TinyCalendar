use chrono::{Datelike, NaiveDate};

/// Get the number of days in a given month
#[allow(dead_code)]
pub fn days_in_month(year: i32, month: u32) -> u32 {
    if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .map(|d| {
        let first = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
        d.signed_duration_since(first).num_days() as u32
    })
    .unwrap_or(30)
}

/// Get the ISO week number
#[allow(dead_code)]
pub fn week_number(date: NaiveDate) -> u32 {
    date.iso_week().week()
}
