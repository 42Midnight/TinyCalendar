# 📅 TinyCalendar

> 轻量级 Windows 桌面日历记事软件 — 安装包 < 10MB，数据完全本地存储，无需网络。

> **项目状态：已归档（2026-11）** — 短期内不再开发更新，源码以当前提交为准。
> 仓库内是完整可构建的源码（依赖由 `pnpm-lock.yaml` 与 `src-tauri/Cargo.lock` 锁定），
> 按下方「开发环境搭建」即可在任意 Windows 机器上恢复到可开发状态。
> 最后一次验证可用的工具链见文末「环境基线」。

## 功能

- 📅 **三种视图**：月视图、周视图、日视图
- ✏️ **事件管理**：创建、编辑、删除事件，支持分类和颜色标记
- 🔍 **搜索**：按关键词搜索事件，支持分类筛选
- 🔔 **提醒**：到期前 Windows 原生通知
- 🔄 **重复事件**：支持每日/每周/每月/每年重复
- 🎨 **主题切换**：浅色/深色/跟随系统
- ⌨️ **全局快捷键**：`Ctrl+Shift+C` 一键唤出窗口
- 📁 **数据导出**：JSON 格式导出备份
- 📌 **系统托盘**：最小化到托盘后台运行

## 技术栈

- **桌面框架**：Tauri 2.x（Rust + WebView）
- **前端**：React 18 + TypeScript + Tailwind CSS + Vite
- **数据库**：SQLite（本地存储）

## 快速命令

环境已配好的开发者，直接这几条就够了：

```bash
pnpm install          # 安装/更新依赖（锁定 pnpm 11）
pnpm tauri:dev        # 启动开发模式（前端热更新，Rust 用 dev-release 配置）
pnpm tauri:build:nsis # 构建 NSIS 安装包
pnpm build            # 只做前端类型检查 + 打包（不编译 Rust，验证改动最快）
```

## 开发环境搭建

本节介绍如何从零开始搭建 TinyCalendar 的开发环境。如果你只是想使用本软件，请直接下载安装包；如果你想参与开发或从源码构建，请按以下步骤操作。

### 环境要求

| 工具 | 最低版本 | 说明 |
|---|---|---|
| Node.js | >= 18 | 前端运行时 |
| pnpm | **11.x** | 包管理器（推荐，请勿使用 npm/yarn）。`pnpm-lock.yaml` 为 lockfileVersion 9，pnpm 8 及更早版本无法安装 |
| Rust | >= 1.70 | 后端编译工具链 |
| Git | >= 2.30 | 版本控制 |
| VS Build Tools | 2022 | Windows MSVC 链接器（Tauri 编译必需） |
| Windows | 10 1809+ / 11 | 目标平台 |

### 第一步：克隆仓库

```bash
git clone https://github.com/42Midnight/TinyCalendar.git
cd TinyCalendar
```

### 第二步：安装 Node.js 与 pnpm

**安装 Node.js**（推荐使用 nvm-windows 管理版本）：

```bash
# 方式一：直接安装（推荐 LTS 版本）
# 下载安装：https://nodejs.org/

# 方式二：使用 nvm-windows
# 下载安装：https://github.com/coreybutler/nvm-windows/releases
nvm install 22
nvm use 22
```

**安装 pnpm**（版本由 `package.json` 的 `packageManager` 字段锁定为 11.8.0）：

```bash
corepack enable
corepack prepare pnpm@11.8.0 --activate

# 若系统没有 corepack（Node 25+ 已不再内置），改用：
# npm install -g pnpm@11.8.0
```

验证安装：

```bash
node -v   # 应 >= 18
pnpm -v   # 应为 11.x
```

### 第三步：安装 Rust 工具链

访问 [rustup.rs](https://rustup.rs/) 下载并运行安装程序，或使用命令行：

```powershell
# PowerShell
winget install Rustlang.Rustup
```

安装完成后，确保使用 MSVC 工具链（Windows 默认）：

```bash
rustup default stable-x86_64-pc-windows-msvc
rustup update
rustc --version  # 应 >= 1.70
```

### 第四步：安装 VS Build Tools（Windows）

Tauri 在 Windows 上需要 Microsoft Visual Studio C++ 构建工具来编译 Rust 原生代码。

**方式一：安装 Visual Studio 2022 Community**（推荐）
1. 下载 [Visual Studio 2022](https://visualstudio.microsoft.com/zh-hans/downloads/)
2. 安装时勾选"**使用 C++ 的桌面开发**"工作负载
3. 确保安装 Windows SDK

**方式二：仅安装 Build Tools**（体积更小）
1. 下载 [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/zh-hans/downloads/?q=build+tools)
2. 安装时勾选"**使用 C++ 的桌面开发**"工作负载

### 第五步：配置 .cargo/config.toml（仅当链接失败时需要）

正常情况下这一步可以跳过。如果你运行 `cargo build` 或 `pnpm tauri:dev` 时报下面任意一条：

```
LINK : fatal error LNK1181: 无法打开输入文件"kernel32.lib"
error: linker `link.exe` not found
```

说明 rustc 没认出来本机装的 VS Build Tools / Windows SDK（较新的 VS 大版本常见），
link.exe 找不到库目录。此时在项目根目录跑一条命令自动生成配置即可：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-msvc.ps1
```

脚本会通过 vswhere（失败则直接扫盘）找到最新的 MSVC 工具集和 Windows SDK，
写出 `.cargo/config.toml`（内含 `LIB` / `INCLUDE` / 链接器路径），并打印用了哪一组版本。
换机器、升级 VS 或升级 Windows SDK 后重新跑一次即可。

<details>
<summary>手动填写模板（脚本不适用时）</summary>

```toml
[env]
LIB = "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.xx.xxxxx\\lib\\x64;C:\\Program Files (x86)\\Windows Kits\\10\\Lib\\10.0.xxxxx.0\\um\\x64;C:\\Program Files (x86)\\Windows Kits\\10\\Lib\\10.0.xxxxx.0\\ucrt\\x64"
INCLUDE = "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.xx.xxxxx\\include;C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.xxxxx.0\\ucrt;C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.xxxxx.0\\um;C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.xxxxx.0\\shared"

[target.x86_64-pc-windows-msvc]
linker = "C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.xx.xxxxx/bin/Hostx64/x64/link.exe"
```

</details>

> 💡 **提示**：此文件是机器相关的，已加入 `.gitignore`，不会被提交到仓库，克隆下来不会自动带过来 —— 所以换了机器才需要重新生成。

### 第六步：安装依赖

```bash
pnpm install
```

此命令会：
1. 安装前端 npm 依赖（React、Tailwind CSS、Vite 等）
2. 初始化 pnpm workspace

### 第七步：启动开发模式

```bash
pnpm tauri:dev
```

首次启动会编译 Rust 后端（可能花费数分钟），后续热更新会快很多。启动后你会看到：
- 一个无边框的 Tauri 窗口
- Vite 开发服务器运行在 `http://localhost:1420`
- 前端代码修改会自动热更新
- Rust 代码修改需要重新 `pnpm tauri:dev`

> `tauri:dev` 实际执行的是 `tauri dev -- --profile dev-release`，即用 `Cargo.toml` 里的
> `dev-release` 配置（继承 release 但关闭 LTO、提高 parallel codegen），编译比纯 release 快、
> 运行比 debug 流畅。如果想用标准 debug 配置调试 Rust，直接跑 `pnpm tauri dev`。

### 构建安装包

```bash
# 构建 NSIS 安装包（.exe）
pnpm tauri:build:nsis
# 等价于 pnpm tauri:build（tauri.conf.json 里 bundle.targets 只配了 nsis）

# 构建完成后，安装包位于：
# src-tauri/target/release/bundle/nsis/
```

构建产物：
- `TinyCalendar_0.1.0_x64-setup.exe` — NSIS 安装程序
- `TinyCalendar.exe` — 绿色便携版（位于 `src-tauri/target/release/`）

### 项目结构

```
TinyCalendar/
├── src/                  # React 前端源码
│   ├── components/       # UI 组件
│   │   ├── calendar/     # 日历视图组件（月/周/日）
│   │   ├── event/        # 事件管理组件
│   │   ├── category/     # 分类管理组件
│   │   ├── layout/       # 布局组件（标题栏/侧边栏）
│   │   ├── search/       # 搜索组件
│   │   ├── settings/     # 设置组件
│   │   └── common/       # 通用组件（Modal/ConfirmDialog）
│   ├── hooks/            # 自定义 React Hooks
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   └── styles/           # 全局样式
├── src-tauri/            # Rust 后端源码
│   ├── src/
│   │   ├── commands/     # Tauri Commands（前后端 API）
│   │   ├── db/           # 数据库层（连接/迁移/模型）
│   │   ├── services/     # 业务逻辑层
│   │   ├── tray/         # 系统托盘
│   │   └── utils/        # 工具模块
│   ├── Cargo.toml        # Rust 依赖
│   └── tauri.conf.json   # Tauri 配置
├── scripts/              # 辅助脚本
│   └── setup-msvc.ps1    # 生成 .cargo/config.toml（链接失败时用）
├── docs/                 # 项目文档
│   ├── PRD.md            # 产品需求文档
│   ├── DESIGN.md         # UI 设计规范
│   ├── architecture.md   # 技术架构文档
│   ├── database.md       # 数据库设计文档
│   ├── requirements.md   # 需求规格说明书
│   └── development-plan.md # 开发计划与里程碑
├── public/               # 静态资源
├── package.json          # 前端依赖与脚本
├── pnpm-workspace.yaml   # pnpm workspace 配置
├── vite.config.ts        # Vite 构建配置
├── tailwind.config.ts    # Tailwind CSS 配置
└── tsconfig.json         # TypeScript 配置
```

### 常见问题

<details>
<summary><b>pnpm 命令找不到</b></summary>

确保已启用 corepack，或通过 npm 全局安装（版本需 11.x）：
```bash
npm install -g pnpm@11.8.0
```
</details>

<details>
<summary><b>cargo build 报 link.exe / kernel32.lib 找不到</b></summary>

先确认装了 VS Build Tools 且勾选了"使用 C++ 的桌面开发"工作负载；装好后仍报错，就运行第五步的脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-msvc.ps1
```
</details>

<details>
<summary><b>pnpm tauri:dev 窗口白屏/空白</b></summary>

1. 确认 `pnpm dev`（纯前端）能正常运行：浏览器打开 `http://localhost:1420`
2. 检查浏览器控制台是否有 JavaScript 错误
3. 确保 Rust 端编译成功（终端无红色错误）
</details>

<details>
<summary><b>Tauri 编译报 WebView2 找不到</b></summary>

Windows 10 1809+ 和 Windows 11 已内置 WebView2。如果你的系统精简了 WebView2，请下载安装：
https://developer.microsoft.com/microsoft-edge/webview2/
</details>

<details>
<summary><b>如何切换 Rust 工具链到 MSVC？</b></summary>

```bash
rustup default stable-x86_64-pc-windows-msvc
rustup show  # 查看当前工具链
```
TinyCalendar 是 Windows 桌面应用，需要使用 MSVC 工具链。GNU 工具链（`x86_64-pc-windows-gnu`）不保证能正常编译 Tauri。
</details>

### 环境基线

归档前的最后一次提交做过完整回归：从远程仓库**全新克隆**后依次执行
`pnpm install --frozen-lockfile` → `pnpm build` → `cargo build --profile dev-release` → `pnpm tauri:build:nsis`，
全部通过。恢复开发时如果遇到奇怪的编译错误，先把工具链对齐到这一组版本：

| 组件 | 归档时验证版本 |
|---|---|
| Windows | 10 / 11 x64 |
| Node.js | v24.19.0 |
| pnpm | 11.8.0 |
| Rust / Cargo | 1.98.1（`stable-x86_64-pc-windows-msvc`） |
| VS Build Tools | 2022/2026 Build Tools，含"使用 C++ 的桌面开发"工作负载 |

依赖版本无需猜测：前端由 `pnpm-lock.yaml`、Rust 由 `src-tauri/Cargo.lock` 唯一确定，
执行 `pnpm install --frozen-lockfile` 即可还原完全相同的依赖树。
