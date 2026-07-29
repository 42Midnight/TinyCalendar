# TinyCalendar — 技术架构文档

> 版本：v0.1 | 日期：2026-07-29 | 状态：已发布

---

## 1. 技术栈总览

| 层次 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 桌面框架 | Tauri | 2.x | Rust 后端 + 系统 WebView 前端，安装包 ~5-10MB |
| 后端语言 | Rust | stable (1.70+) | 日历计算、SQLite 操作、系统通知、托盘、快捷键 |
| 前端框架 | React | 18.x | 函数组件 + Hooks，无 class 组件 |
| 前端语言 | TypeScript | 5.x | 全量类型覆盖 |
| UI 样式 | Tailwind CSS | 3.x | 实用优先 CSS 框架 + dark mode class 策略 |
| 构建工具 | Vite | 6.x | Tauri 官方推荐，开发服务器 HMR |
| 数据库 | SQLite | 3.x | 通过 `rusqlite` crate 访问，bundled 编译 |
| 包管理 | pnpm | 9.x | workspace 模式 |
| 日期处理 | chrono (Rust) | 0.4 | Rust 端日期计算 |
| 序列化 | serde + serde_json | 1.x | 前后端 JSON 通信 |

### 1.1 选型理由

#### Tauri vs Electron

| 指标 | Tauri 2.x | Electron |
|---|---|---|
| 安装包大小 | ~8MB | ~150MB+ |
| 内存占用 | ~40MB | ~200MB+ |
| 后端语言 | Rust（编译型，性能高） | Node.js（解释型） |
| 系统 WebView | 是（不打包浏览器） | 否（打包 Chromium） |
| Windows 原生 API | ✅ 完整 | ⚠️ 需 Node 原生模块 |

对于"轻量级"的产品定位，Tauri 是唯一合理的选择。

#### React vs Vue vs Svelte

选择 React 的原因：
- 生态最丰富，第三方库最多
- 社区资源充足，遇到问题容易找到解决方案
- 团队（目前独立开发）对 React 最熟悉

#### Tailwind CSS vs 手写 CSS

- Tailwind 开发效率高，无需在 CSS 文件和组件间跳转
- 经过 tree-shaking 后 bundle 体积极小
- 内置 `dark:` 前缀配合 class 策略实现暗色模式

#### SQLite vs JSON 文件

- SQLite 查询能力（WHERE、LIKE、JOIN、索引）远超 JSON 遍历
- 事务安全，异常退出不损坏数据
- Tauri 生态有成熟的 `rusqlite` crate（bundled 模式，编译时自带 SQLite）

---

## 2. 系统架构

### 2.1 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                      Tauri Shell                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │   WebView (前端)  │  │     Rust Backend             │  │
│  │                  │  │                              │  │
│  │  React App       │  │  Tauri Commands (API 层)      │  │
│  │  ├─ 日历视图      │◄─┤  ├─ event_commands           │  │
│  │  ├─ 事件管理      │  │  ├─ calendar_commands        │  │
│  │  ├─ 搜索筛选      │  │  ├─ category_commands        │  │
│  │  ├─ 分类管理      │  │  ├─ export_commands          │  │
│  │  └─ 设置面板      │  │  └─ settings_commands        │  │
│  │                  │  │                              │  │
│  │  State Management│  │  Services (业务逻辑层)         │  │
│  │  ├─ useCalendar  │  │  ├─ lunar_service             │  │
│  │  ├─ useEvents    │  │  ├─ event_service (planned)   │  │
│  │  ├─ useCategories│  │  └─ export_service (planned)  │  │
│  │  ├─ useSearch    │  │                              │  │
│  │  ├─ useTheme     │  │  DB Layer (数据访问层)         │  │
│  │  ├─ useSettings  │  │  ├─ connection.rs             │  │
│  │  └─ useCalendars │  │  ├─ migrations.rs             │  │
│  └──────────────────┘  │  └─ models.rs                 │  │
│                        │                              │  │
│                        │  System Services (系统服务)    │  │
│                        │  ├─ 系统托盘 (tray/)           │  │
│                        │  ├─ 全局快捷键 (plugin)        │  │
│                        │  ├─ Windows 通知 (plugin)     │  │
│                        │  └─ 多实例锁 (lock file)      │  │
│                        └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层职责

| 层 | 职责 | 关键约束 |
|---|---|---|
| **WebView (React)** | UI 渲染、用户交互、前端状态管理 | 不直接访问文件系统或数据库，不引入 Redux |
| **Tauri Commands** | 前后端通信桥梁，参数校验，JSON 序列化 | 每个 command 是异步函数，返回 `Result<T, String>` |
| **Services** | 业务逻辑：农历计算、节假日数据等 | 纯 Rust 实现，可独立单元测试，不依赖 Tauri State |
| **DB Layer** | SQLite 连接管理、schema 迁移、模型映射 | 单连接 Mutex 保护，启动时自动迁移 |
| **System Services** | Windows 原生能力：托盘、通知、快捷键、多实例锁 | 通过 Tauri plugin 或标准库实现 |

---

## 3. 前端架构

### 3.1 目录结构

```
src/
├── main.tsx              # React 入口，挂载到 #root
├── App.tsx               # 根组件：布局、全局状态分发
├── vite-env.d.ts         # Vite 类型声明
├── components/
│   ├── calendar/         # 日历视图组件
│   │   ├── CalendarHeader.tsx   # 年月切换、今天按钮、视图模式切换
│   │   ├── CalendarCell.tsx     # 月视图中的单个日期格
│   │   ├── MonthView.tsx        # 月视图 (6×7 网格)
│   │   ├── WeekView.tsx         # 周视图 (7列 × 24行时间网格)
│   │   ├── DayView.tsx          # 日视图 (单列时间线)
│   │   └── MiniCalendar.tsx     # 迷你日历组件
│   ├── event/            # 事件相关组件
│   │   ├── EventCard.tsx        # 事件卡片（含分类色条）
│   │   ├── EventEditor.tsx      # 事件编辑/新建弹窗（含重复/提醒设置）
│   │   ├── EventPanel.tsx       # 选中日的事件列表侧面板
│   │   └── DayDetail.tsx        # 双击日期弹出的日详情模态框
│   ├── category/         # 分类管理组件
│   │   ├── CategoryManager.tsx  # 分类管理面板（CRUD）
│   │   └── CategoryEditor.tsx   # 分类编辑弹窗
│   ├── layout/           # 布局组件
│   │   ├── TitleBar.tsx         # 自定义标题栏（最小化/最大化/关闭）
│   │   └── Sidebar.tsx          # 侧边栏（分类筛选 + 搜索 + 日历切换）
│   ├── search/           # 搜索组件
│   │   └── SearchBar.tsx        # 搜索输入框 + 实时结果列表
│   ├── settings/         # 设置组件
│   │   └── SettingsModal.tsx    # 设置模态框（主题/字体/快捷键/假日/日历管理）
│   └── common/           # 通用组件
│       ├── Modal.tsx            # 通用模态框包装器
│       └── ConfirmDialog.tsx    # 确认对话框
├── hooks/                # 自定义 React Hooks
│   ├── useCalendar.ts          # 日历导航（年月、视图模式、选中日期）
│   ├── useEvents.ts            # 事件 CRUD + 数据获取
│   ├── useCategories.ts        # 分类列表、筛选、CRUD
│   ├── useCalendars.ts         # 多日历管理
│   ├── useSearch.ts            # 搜索状态 + 防抖
│   ├── useTheme.ts             # 主题管理（light/dark/system）
│   └── useSettings.ts          # 设置读写（字体、快捷键、农历/假日开关）
├── types/
│   └── index.ts          # 全局 TypeScript 类型定义
├── utils/
│   ├── calendar.ts       # 日期计算工具（天数、周数、农历转换）
│   └── format.ts         # 格式化工具（日期、时间显示）
└── styles/
    └── index.css         # Tailwind 指令 + CSS 变量（主题色）+ 全局样式
```

### 3.2 组件树

```
App
├── TitleBar                     # 自定义标题栏（关闭/最小化/最大化）
├── Sidebar                      # 左侧导航
│   ├── SearchBar                # 搜索框
│   ├── CategoryFilter[]         # 分类筛选列表（可拖拽排序）
│   └── CalendarSwitcher[]       # 日历选择器（多日历）
├── CalendarHeader               # 年月标题 + 视图切换按钮
├── [MonthView | WeekView | DayView]  # 三视图之一
│   ├── CalendarCell[]           # 月视图专用：日期格
│   └── EventIndicator[]         # 事件缩略标记
├── EventPanel                   # 右侧面板：选中日事件列表
│   └── EventCard[]              # 事件卡片
├── EventEditor (Modal)          # 新建/编辑事件弹窗
├── DayDetail (Modal)            # 日详情弹窗（双击日期）
├── SettingsModal (Modal)        # 设置弹窗
└── ConfirmDialog (Modal)        # 确认对话框
```

### 3.3 状态管理

**不引入外部状态管理库**（Redux / Zustand / Jotai）。当前状态复杂度用 React 内置方案完全满足：

| 状态域 | 管理方式 | 传递方式 |
|---|---|---|
| 日历导航（年月、视图、选中日期） | `useCalendar` hook | App 组件内调用，props 下传 |
| 事件数据 | `useEvents` hook | App 内调用，props 下传 |
| 分类数据 | `useCategories` hook | App 内调用，props 下传 |
| 多日历数据 | `useCalendars` hook | App 内调用，props 下传 |
| 搜索状态 | `useSearch` hook | App 内调用，props 下传 |
| 主题设置 | `useTheme` hook | App 内调用，props 下传 |
| 应用设置 | `useSettings` hook | App 内调用，props 下传 |
| 弹窗状态 | `useState` (App.tsx) | 局部状态，事件处理函数通过 props 传递 |

**为什么不用 Context？** 当前组件树只有两层（App → 子组件），props 传递路径很短。如果未来组件嵌套超过 3 层，可以考虑引入轻量 Context。

### 3.4 前端-后端通信

所有前后端通信通过 Tauri 的 `invoke()` API：

```typescript
import { invoke } from '@tauri-apps/api/core';

// 查询某月事件
const events = await invoke<CalendarEvent[]>('get_month_events', {
  year: 2026, month: 7, calendarId: null
});

// 创建事件
const newEvent = await invoke<CalendarEvent>('create_event', {
  input: { title: '示例', date: '2026-07-29', ... }
});
```

数据以 JSON 格式自动序列化/反序列化，前端类型定义在 `src/types/index.ts`，后端对应结构体在 `src-tauri/src/db/models.rs`。

---

## 4. Rust 后端架构

### 4.1 目录结构

```
src-tauri/
├── Cargo.toml             # Rust 依赖声明
├── Cargo.lock             # 依赖版本锁定
├── tauri.conf.json        # Tauri 窗口/打包/权限配置
├── build.rs               # Tauri 构建脚本
├── capabilities/
│   └── default.json       # Tauri v2 权限声明
├── icons/                 # 应用图标（ico/png）
├── gen/                   # Tauri 自动生成的 schema
└── src/
    ├── main.rs            # Rust 入口（调用 lib::run()）
    ├── lib.rs             # Tauri Builder 组装（注册 plugins/commands/state/setup）
    ├── commands/          # Tauri Command 层（API 端点）
    │   ├── mod.rs
    │   ├── event_commands.rs     # 事件 CRUD + 查询 API
    │   ├── calendar_commands.rs  # 日历数据 API（含农历/节假日）
    │   ├── category_commands.rs  # 分类 CRUD + 排序 API
    │   ├── export_commands.rs    # 数据导入导出 API
    │   └── settings_commands.rs  # 设置读写 API
    ├── db/                # 数据库层
    │   ├── mod.rs
    │   ├── connection.rs         # SQLite 连接初始化
    │   ├── migrations.rs         # Schema 迁移（v1→v2→v3）
    │   └── models.rs             # 数据结构体 + FromRow 实现
    ├── services/          # 业务逻辑层
    │   ├── mod.rs
    │   └── lunar_service.rs      # 农历计算 + 节假日数据
    ├── tray/
    │   └── mod.rs               # 系统托盘创建与菜单
    └── utils/
        ├── mod.rs
        ├── error.rs              # 统一错误类型
        └── date_utils.rs         # 日期计算辅助函数
```

### 4.2 模块交互

```
main.rs
  └→ lib.rs::run()
       ├→ init_db(db_path)         # 初始化 SQLite + 运行迁移
       ├→ AppState { db: Mutex<Connection> }  # 全局状态
       ├→ tray::create_tray()      # 系统托盘
       └→ .invoke_handler(         # 注册所有 commands
            event_commands::*
            calendar_commands::*
            category_commands::*
            export_commands::*
            settings_commands::*
          )
```

### 4.3 数据库连接管理

```rust
// lib.rs
pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

// 典型 command 使用
#[tauri::command]
pub fn get_events(state: State<AppState>, ...) -> Result<Vec<Event>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;  // 获取锁
    // ... 执行查询 ...
    // 锁在此处自动释放（离开作用域）
}
```

- **单连接 + Mutex**：桌面应用单用户场景，不需要连接池
- **WAL 模式**：SQLite 默认 WAL 模式，读写不互相阻塞
- **启动迁移**：`init_db()` 自动检测 `schema_version` 并按需执行迁移

### 4.4 数据库迁移版本

| 版本 | 内容 |
|---|---|
| v1 | 创建 `categories` 表 + `events` 表 + 索引 + 6 个预设分类 |
| v2 | 创建 `settings` 表 + 默认设置（字体/快捷键/农历/节假日开关） |
| v3 | 创建 `calendars` 表 + `events` 增加 `calendar_id` 字段 + 默认日历 |

### 4.5 多实例保护

```rust
// lib.rs setup() 中
let lock_path = app_dir.join("instance.lock");
// 启动时检测 lock 文件：
//   - 存在且修改时间 < 10s → 另一个实例正在运行 → exit(1)
//   - 存在但 > 10s → 上次崩溃残留 → 删除后重建
//   - 不存在 → 创建新 lock 文件
// 后台线程每 5s 更新 lock 文件时间戳
```

### 4.6 系统托盘

```rust
// tray/mod.rs
// 创建托盘图标 + 右键菜单：
//   - "显示" → 显示窗口并聚焦
//   - "退出" → 退出应用（关闭 DB 连接 + 删除 lock 文件）
```

---

## 5. 数据库设计

### 5.1 ER 图

```
┌──────────────┐       ┌────────────────────┐       ┌──────────────┐
│  calendars   │       │      events        │       │  categories  │
├──────────────┤       ├────────────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ calendar_id (FK)   │       │ id (PK)      │
│ name         │       │ id (PK)           │◄──────│ name         │
│ color        │       │ title             │       │ color        │
│ sort_order   │       │ category_id (FK)  │       │ icon         │
│ is_visible   │       │ date              │       │ sort_order   │
│ created_at   │       │ start_time        │       │ created_at   │
│ updated_at   │       │ end_time          │       │ updated_at   │
└──────────────┘       │ is_all_day        │       └──────────────┘
                       │ note              │
                       │ location          │       ┌──────────────┐
                       │ repeat_rule       │       │   settings   │
                       │ repeat_end_date   │       ├──────────────┤
                       │ parent_event_id   │       │ key (PK)     │
                       │ notification_min  │       │ value        │
                       │ created_at        │       └──────────────┘
                       │ updated_at        │
                       └────────────────────┘
```

### 5.2 表结构

详见 [database.md](./database.md) — 包含完整的字段定义、索引设计、常用查询 SQL 和迁移策略。

---

## 6. Tauri Command API 参考

### 6.1 事件相关

| Command | 参数 | 返回 | 说明 |
|---|---|---|---|
| `get_month_events` | `year: i32, month: u32, calendar_id: Option<i64>` | `Vec<CalendarEvent>` | 获取某月事件 |
| `get_day_events` | `date: String` | `Vec<CalendarEvent>` | 获取某日事件 |
| `create_event` | `input: CreateEventInput` | `CalendarEvent` | 创建事件 |
| `update_event` | `input: UpdateEventInput` | `CalendarEvent` | 更新事件 |
| `delete_event` | `id: i64` | `()` | 删除事件 |
| `search_events` | `keyword: String` | `Vec<CalendarEvent>` | 关键词搜索 |

### 6.2 日历与分类

| Command | 参数 | 返回 | 说明 |
|---|---|---|---|
| `get_calendar_data` | `year: i32, month: u32` | `CalendarData` | 获取月历数据（含农历/节假日） |
| `get_calendars` | — | `Vec<Calendar>` | 获取所有日历 |
| `create_calendar` | `name: String, color: String` | `Calendar` | 创建日历 |
| `update_calendar` | `id: i64, name: String, color: String` | `Calendar` | 更新日历 |
| `delete_calendar` | `id: i64` | `()` | 删除日历 |
| `get_categories` | — | `Vec<Category>` | 获取所有分类 |
| `create_category` | `name: String, color: String` | `Category` | 创建分类 |
| `update_category` | `id: i64, name: String, color: String` | `Category` | 更新分类 |
| `delete_category` | `id: i64` | `()` | 删除分类 |
| `update_category_order` | `ids: Vec<i64>` | `()` | 更新分类排序 |

### 6.3 设置与导出

| Command | 参数 | 返回 | 说明 |
|---|---|---|---|
| `get_settings` | — | `Vec<Setting>` | 获取所有设置 |
| `update_setting` | `key: String, value: String` | `()` | 更新设置项 |
| `get_holidays` | `year: i32` | `Vec<Holiday>` | 获取节假日列表 |
| `update_holiday_toggle` | `id: String, enabled: bool` | `()` | 切换假日启用状态 |
| `export_to_json` | — | `String` | 导出全量数据 JSON |
| `export_to_file` | `path: String` | `()` | 导出 JSON 到指定路径 |

---

## 7. 构建与打包

### 7.1 开发模式

```bash
pnpm tauri dev
```

- 启动 Vite 开发服务器（端口 1420）
- 编译 Rust 后端（`dev-release` profile：较快编译 + 调试符号）
- 打开 Tauri 窗口加载 `http://localhost:1420`
- 前端热更新（HMR），Rust 修改需重新编译

### 7.2 生产构建

```bash
pnpm tauri build
```

构建流程：
1. `tsc` TypeScript 类型检查
2. `vite build` 打包前端到 `dist/`
3. `cargo build --release` 编译 Rust 后端
4. Tauri bundler 生成 NSIS 安装包

产物位置：
- 安装包：`src-tauri/target/release/bundle/nsis/TinyCalendar_0.1.0_x64-setup.exe`
- 便携版：`src-tauri/target/release/tiny-calendar.exe`

### 7.3 Cargo Profile 配置

| Profile | 用途 | 特点 |
|---|---|---|
| `debug` | 纯 debug 构建 | 最快编译、保留调试信息、无优化 |
| `dev-release` | `pnpm tauri dev` 使用 | 折中：优化级别 2 + 调试符号 + 并行编译 |
| `release` | 生产打包 | 体积优化(s) + LTO + 单代码单元 + 剥离符号 |

---

## 8. 关键设计决策

### 8.1 自定义标题栏

不使用 Windows 原生标题栏，用 React 实现。原因：
- 统一跨主题的视觉风格
- 为未来可能的 macOS 移植打基础（Tauri 支持跨平台）
- 控制按钮行为（关闭 → 隐藏到托盘而非退出）

### 8.2 无状态管理库

不引入 Redux/Zustand。原因：
- 应用状态结构简单，组件树浅（App → 子组件仅 2 层）
- 每个 Hook 管理独立的状态域，互不依赖
- 减少依赖体积，降低学习门槛

### 8.3 重复事件：动态展开策略

- 存储一份"母事件"+ 重复规则（不预展开存储）
- 查询时动态展开重复事件到指定时间范围
- 修改单次重复事件时，创建 `parent_event_id` 指向母事件的例外记录
- 优势：存储节省，修改规则时无需批量更新

### 8.4 单一 SQLite 连接

- `Mutex<Connection>` 保证线程安全
- 每个 command 获取锁 → 执行 SQL → 自动释放锁
- 桌面应用单用户场景无需连接池

### 8.5 农历与节假日

- 农历计算使用查表法（`lunar_service.rs`），数据来源：香港天文台
- 节假日数据内置常见的中国法定节假日（春节、清明、五一、端午、中秋、国庆等）
- 用户可逐个开关节假日显示

---

## 9. 依赖清单

### 9.1 Rust 生产依赖

| Crate | 版本 | 用途 |
|---|---|---|
| `tauri` | 2.x | 桌面框架，含 tray-icon feature |
| `tauri-plugin-opener` | 2 | 打开文件/URL |
| `tauri-plugin-dialog` | 2 | 文件保存对话框 |
| `tauri-plugin-global-shortcut` | 2 | 全局快捷键 |
| `tauri-plugin-notification` | 2 | Windows 原生通知 |
| `rusqlite` | 0.31 | SQLite 驱动（bundled 模式） |
| `serde` | 1 | 序列化/反序列化 |
| `serde_json` | 1 | JSON 处理 |
| `chrono` | 0.4 | 日期时间计算 |
| `image` | 0.25 | PNG 图标处理 |

### 9.2 前端生产依赖

| 包 | 版本 | 用途 |
|---|---|---|
| `@tauri-apps/api` | ^2.0.0 | Tauri 前端 API（invoke/event） |
| `@tauri-apps/plugin-dialog` | ^2.7.1 | 文件保存对话框 |
| `@tauri-apps/plugin-global-shortcut` | ^2.0.0 | 全局快捷键注册 |
| `@tauri-apps/plugin-notification` | ^2.0.0 | 通知触发 |
| `react` | ^18.3.1 | UI 框架 |
| `react-dom` | ^18.3.1 | React DOM 渲染 |

### 9.3 前端开发依赖

| 包 | 版本 | 用途 |
|---|---|---|
| `@tauri-apps/cli` | ^2.0.0 | Tauri CLI |
| `@vitejs/plugin-react` | ^4.3.4 | Vite React 插件 |
| `typescript` | ^5.6.3 | TypeScript 编译器 |
| `vite` | ^6.0.0 | 构建工具 |
| `tailwindcss` | ^3.4.16 | CSS 框架 |
| `postcss` | ^8.4.49 | CSS 后处理 |
| `autoprefixer` | ^10.4.20 | CSS 自动前缀 |

---

> 📄 **关联文档**：[PRD.md](./PRD.md) — 产品需求 | [DESIGN.md](./DESIGN.md) — UI 设计规范 | [database.md](./database.md) — 数据库设计 | [architecture.md](./architecture.md) — 系统架构草案
