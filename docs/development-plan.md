# TinyCalendar — 开发计划与里程碑

> 版本：v0.1 | 日期：2026-06-21 | 状态：草案待审查

---

## 1. 开发阶段总览

| 阶段 | 名称 | 预计工期 | 核心产出 |
|---|---|---|---|
| Phase 0 | 项目脚手架 | 1-2 天 | 可运行的空项目骨架 |
| Phase 1 | 核心日历视图 | 5-7 天 | 月/周/日三种视图 |
| Phase 2 | 事件管理 | 5-7 天 | 事件 CRUD + 分类系统 |
| Phase 3 | 搜索与筛选 | 2-3 天 | 关键词搜索 + 分类筛选 |
| Phase 4 | 提醒与托盘 | 2-3 天 | 系统托盘 + Windows 通知 |
| Phase 5 | 导出与优化 | 2-3 天 | JSON 导出 + 性能优化 |
| Phase 6 | 测试与打包 | 2-3 天 | .exe/.msi 安装包 |

---

## 2. 详细任务分解

### Phase 0：项目脚手架搭建

**目标**：初始化项目结构，确保能编译运行

| # | 任务 | 详细说明 |
|---|---|---|
| 0.1 | 创建 Tauri 项目 | `pnpm create tauri-app`，选择 React + TypeScript 模板 |
| 0.2 | 配置 Tailwind CSS | 安装 tailwindcss，配置 `tailwind.config.ts`，开启 `darkMode: 'class'` 策略 |
| 0.3 | 配置 Rust 依赖 | `Cargo.toml` 添加 rusqlite、serde、chrono、tauri-plugin-global-shortcut 等 |
| 0.4 | 搭建 Rust 模块 | 创建 `db/`、`commands/`、`services/`、`utils/` 目录 |
| 0.5 | SQLite 初始化 | `db/connection.rs` 单例连接 + `db/migrations.rs` 建表 |
| 0.6 | 自定义标题栏 | `TitleBar.tsx` 实现最小化/最大化/关闭 |
| 0.7 | 主题基础设施 | `ThemeContext` + `useTheme` hook + Tailwind dark class 切换 + localStorage 持久化 |
| 0.8 | 验证 | `pnpm tauri dev` 启动成功，标题栏可交互，主题可切换 |

**产出物**：可运行的空窗口，标题栏可用，SQLite 已初始化，亮/暗/跟随系统三种主题可用

---

### Phase 1：核心日历视图

**目标**：实现三种日历视图的完整渲染与切换

| # | 任务 | 详细说明 |
|---|---|---|
| 1.1 | 类型定义 | `types/index.ts` 定义 `CalendarEvent`、`Category` 等类型 |
| 1.2 | `useCalendar` hook | 管理 `year/month/viewMode/selectedDate` 状态 |
| 1.3 | `CalendarHeader` | 年月显示、前后翻页、今天按钮、视图切换按钮 |
| 1.4 | `MonthView` | 6×7 网格，正确渲染当月日期（含上月/下月填充） |
| 1.5 | `CalendarCell` | 单个日期格：日期数字 + 事件缩略点 |
| 1.6 | `WeekView` | 7 列 × 24 行时间网格，事件色块覆盖时段 |
| 1.7 | `DayView` | 单日时间线布局，按小时分格 |
| 1.8 | 视图切换 | 月/周/日三种视图平滑切换，保持选中日期 |
| 1.9 | 键盘导航 | 方向键切换日期，空格回到今天 |

**产出物**：三种视图完整可交互，前后翻页正常，今日高亮

---

### Phase 2：事件管理

**目标**：完整的事件 CRUD 流程 + 分类系统

| # | 任务 | 详细说明 |
|---|---|---|
| 2.1 | Rust 数据模型 | `db/models.rs` 定义 `Event`、`Category` struct + FromRow |
| 2.2 | 事件 CRUD Commands | `event_commands.rs` + `event_service.rs` |
| 2.3 | 分类 Commands | `category_commands.rs` 获取分类列表 |
| 2.4 | 日历查询 Commands | `calendar_commands.rs` 按月/周/日查询事件 |
| 2.5 | `useEvents` hook | 封装 `invoke()` 调用，状态管理 |
| 2.6 | `useCategories` hook | 分类数据加载与筛选状态 |
| 2.7 | `EventEditor` | 新建/编辑弹窗：标题、日期、时间、分类下拉、备注、重复、提醒 |
| 2.8 | `EventPanel` | 展示选中日的事件列表 |
| 2.9 | `EventCard` | 事件卡片：分类颜色条 + 标题 + 时间 + 备注摘要 |
| 2.10 | `CategoryTag` | 分类标签组件，显示颜色圆点 + 名称 |
| 2.11 | `Sidebar` | 分类筛选列表 + 新建按钮 |
| 2.12 | 事件在视图中渲染 | MonthView 格内显示小圆点，WeekView/DayView 显示色块 |

**产出物**：完整的创建/编辑/删除事件流程，分类颜色标记，日历视图中的事件展示

---

### Phase 3：搜索与筛选

**目标**：支持关键词搜索和分类筛选

| # | 任务 | 详细说明 |
|---|---|---|
| 3.1 | 搜索 Rust Command | `search_events` 实现 LIKE 查询 |
| 3.2 | `SearchBar` 组件 | 搜索输入框 + 搜索结果列表 |
| 3.3 | `useSearch` hook | 防抖搜索，结果状态管理 |
| 3.4 | 分类筛选联动 | Sidebar 分类点击 → 过滤日历视图中的事件显示 |

**产出物**：可搜索事件，可按分类过滤

---

### Phase 4：提醒与托盘

**目标**：系统托盘运行 + 全局快捷键唤出 + Windows 通知提醒

| # | 任务 | 详细说明 |
|---|---|---|
| 4.1 | 系统托盘 | `tray/mod.rs` 创建托盘图标、右键菜单（显示/退出） |
| 4.2 | 关闭到托盘 | 点击 X → 隐藏窗口而非退出 |
| 4.3 | 全局快捷键 | 集成 `tauri-plugin-global-shortcut`，注册 `Ctrl+Shift+C`，toggle 窗口显隐 |
| 4.4 | 快捷键设置 | 设置页面允许用户自定义快捷键组合 |
| 4.5 | 提醒轮询 | `reminder_service.rs` 每 30 秒查询到期提醒 |
| 4.6 | Windows 通知 | Tauri notification plugin 弹出原生通知 |
| 4.7 | 重复事件处理 | `event_service.rs` 动态展开重复事件 |

**产出物**：托盘运行、快捷键唤出窗口、到期弹出通知、重复事件正确查询

---

### Phase 5：数据导出与优化

**目标**：数据可导出，性能达标

| # | 任务 | 详细说明 |
|---|---|---|
| 5.1 | JSON 导出 | `export_commands.rs` + `export_service.rs` 导出全量数据 |
| 5.2 | 导出 UI | 设置/菜单中的导出按钮，弹出保存路径选择 |
| 5.3 | 多实例保护 | 检测已有实例，防止重复启动 |
| 5.4 | 错误处理 | 统一错误提示（toast/弹窗），优雅降级 |
| 5.5 | 性能检查 | 10000+ 事件下的查询和渲染性能 |

**产出物**：可导出 JSON，错误提示友好，数据量大时不卡顿

---

### Phase 6：测试与打包

**目标**：产物可分发安装

| # | 任务 | 详细说明 |
|---|---|---|
| 6.1 | 功能回归测试 | 所有 P0/P1 功能逐项验证 |
| 6.2 | Windows 打包 | `pnpm tauri build` 生成 .msi/.exe |
| 6.3 | 洁净环境测试 | 在未装开发环境的 Windows 上安装运行 |
| 6.4 | 文档完善 | README.md 用户使用说明 |

**产出物**：可安装的 Windows 安装包，使用说明文档

---

## 3. 依赖关系

```
Phase 0 (脚手架)
    │
    ▼
Phase 1 (日历视图) ──────────────────────┐
    │                                     │
    ▼                                     ▼
Phase 2 (事件管理) ────────────▶ Phase 3 (搜索筛选)
    │                                     │
    └──────────────┬──────────────────────┘
                   ▼
            Phase 4 (提醒托盘)
                   │
                   ▼
            Phase 5 (导出优化)
                   │
                   ▼
            Phase 6 (测试打包)
```

Phase 1 和 Phase 2 之间有一定并行空间（UI 视图和 Rust 后端可以并行开发），但建议顺序推进以降低集成风险。

---

## 4. 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| Tauri 2.x API 不兼容 | 中 | 高 | 锁定版本号，关注 changelog |
| Rust 开发效率不足 | 中 | 中 | 非核心逻辑优先简单实现，后续优化 |
| 农历算法复杂 | 低 | 低 | P2 功能，可用查表法或成熟算法库 |
| Windows 通知权限 | 低 | 中 | Tauri notification plugin 已较成熟 |
| 打包体积超标 | 低 | 中 | Tree-shaking + 移除无用依赖 |
| SQLite 文件损坏 | 低 | 高 | 提供数据库修复/重建功能，定期自动备份 |

---

> 📌 **审查要点**：工期估算是否合理？任务分解粒度是否合适？是否需要增加或调整阶段？
