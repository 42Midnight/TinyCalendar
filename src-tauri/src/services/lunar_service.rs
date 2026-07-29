use chrono::{Datelike, NaiveDate};

/// Chinese lunar calendar service - simplified computation
/// Uses lunar new year offsets and alternating month lengths

const LUNAR_NEW_YEARS: &[(i32, u32, u32)] = &[
    (2025, 1, 29),
    (2026, 2, 17),
    (2027, 2, 6),
    (2028, 1, 26),
    (2029, 2, 13),
    (2030, 2, 3),
];

const LUNAR_MONTH_NAMES: &[&str] = &[
    "", "正月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "冬月", "腊月",
];

const LUNAR_DAY_NAMES: &[&str] = &[
    "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

/// Chinese holidays (month, day, name)
const CHINESE_HOLIDAYS: &[(u32, u32, &str)] = &[
    (1, 1, "元旦"),
    (2, 14, "情人节"),
    (3, 8, "妇女节"),
    (3, 12, "植树节"),
    (4, 1, "愚人节"),
    (5, 1, "劳动节"),
    (5, 4, "青年节"),
    (6, 1, "儿童节"),
    (7, 1, "建党节"),
    (8, 1, "建军节"),
    (9, 10, "教师节"),
    (10, 1, "国庆节"),
    (12, 25, "圣诞节"),
];

/// Lunar festivals (lunar_month, lunar_day, name)
const LUNAR_FESTIVALS: &[(u32, u32, &str)] = &[
    (1, 1, "春节"),
    (1, 15, "元宵节"),
    (5, 5, "端午节"),
    (7, 7, "七夕"),
    (7, 15, "中元节"),
    (8, 15, "中秋节"),
    (9, 9, "重阳节"),
    (12, 30, "除夕"),
];

/// Mother's Day: 2nd Sunday of May
/// Father's Day: 3rd Sunday of June
fn get_special_holiday(year: i32, month: u32, day: u32) -> Option<String> {
    let date = NaiveDate::from_ymd_opt(year, month, day)?;
    let weekday = date.weekday().num_days_from_sunday();

    // Mother's Day: 2nd Sunday of May
    if month == 5 && weekday == 0 {
        let first = NaiveDate::from_ymd_opt(year, 5, 1)?;
        let first_sunday = (7 - first.weekday().num_days_from_sunday()) % 7 + 1;
        let second_sunday = first_sunday + 7;
        if day == second_sunday {
            return Some("母亲节".into());
        }
    }

    // Father's Day: 3rd Sunday of June
    if month == 6 && weekday == 0 {
        let first = NaiveDate::from_ymd_opt(year, 6, 1)?;
        let first_sunday = (7 - first.weekday().num_days_from_sunday()) % 7 + 1;
        let third_sunday = first_sunday + 14;
        if day == third_sunday {
            return Some("父亲节".into());
        }
    }

    // Thanksgiving: 4th Thursday of November (US)
    // Qingming: around April 4-6

    None
}

pub fn get_lunar_date(year: i32, month: u32, day: u32) -> Option<(u32, u32)> {
    let target = NaiveDate::from_ymd_opt(year, month, day)?;

    // Find the relevant lunar new year
    let lny = LUNAR_NEW_YEARS
        .iter()
        .find(|(y, _, _)| *y == year || (*y == year + 1))
        .map(|(y, m, d)| NaiveDate::from_ymd_opt(*y, *m, *d))
        .flatten()?;

    let mut lunar_year_start = lny;
    if target < lny {
        // Before this year's LNY - use previous year's
        lunar_year_start = LUNAR_NEW_YEARS
            .iter()
            .find(|(y, _, _)| *y == year - 1)
            .map(|(y, m, d)| NaiveDate::from_ymd_opt(*y, *m, *d))
            .flatten()?;
    }

    let days_diff = (target - lunar_year_start).num_days();
    if days_diff < 0 {
        return None;
    }

    let mut lunar_month: u32 = 1;
    let mut remaining = days_diff as u32;

    // Simulate lunar months (alternating 30/29, with occasional adjustment)
    for i in 0..13 {
        // Rough pattern: big month (30) then small month (29), with some adjustments
        let pattern = [30, 29, 30, 29, 30, 29, 30, 30, 29, 30, 29, 30, 29];
        let month_days = pattern[i];

        if remaining < month_days {
            return Some((lunar_month, remaining + 1));
        }
        remaining -= month_days;
        lunar_month += 1;
    }

    Some((12, remaining + 1))
}

pub fn get_lunar_day_name(day: u32) -> &'static str {
    if day == 0 || day > 30 {
        return "";
    }
    LUNAR_DAY_NAMES[day as usize]
}

pub fn get_lunar_month_name(month: u32) -> &'static str {
    if month == 0 || month > 12 {
        return "";
    }
    LUNAR_MONTH_NAMES[month as usize]
}

pub fn get_holiday(year: i32, month: u32, day: u32) -> Option<String> {
    // Check Gregorian holidays
    for (m, d, name) in CHINESE_HOLIDAYS {
        if *m == month && *d == day {
            return Some(name.to_string());
        }
    }

    // Check special holidays
    if let Some(name) = get_special_holiday(year, month, day) {
        return Some(name);
    }

    // Check solar term based holidays (Qingming roughly April 4-6)
    if month == 4 && (day == 4 || day == 5 || day == 6) {
        return Some("清明节".into());
    }

    None
}

pub fn get_lunar_festival(lunar_month: u32, lunar_day: u32) -> Option<String> {
    for (m, d, name) in LUNAR_FESTIVALS {
        if *m == lunar_month && *d == lunar_day {
            return Some(name.to_string());
        }
    }
    None
}
