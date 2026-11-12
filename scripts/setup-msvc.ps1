# 为 rustc 生成 .cargo/config.toml，指定 MSVC 链接器所需的 LIB / INCLUDE 路径。
#
# 什么时候需要跑这个脚本：
#   `cargo build` / `pnpm tauri:dev` 报
#       LINK : fatal error LNK1181: 无法打开输入文件"kernel32.lib"
#   说明 rustc 没能自动识别本机已安装的 VS Build Tools（较新的 VS 大版本常见），
#   于是 link.exe 找不到 Windows SDK 的库目录。此时运行本脚本即可。
#
# 生成的文件是机器相关的，已被 .gitignore 忽略，不会提交到仓库。
# 换机器或升级 VS / Windows SDK 后重新运行一次即可。
#
# 用法：powershell -ExecutionPolicy Bypass -File scripts\setup-msvc.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# 按版本号从新到旧排序，取第一个
function Select-Newest([string[]]$paths) {
  $paths | Where-Object { $_ } | Sort-Object -Property @{ Expression = { try { [version](Split-Path $_ -Leaf) } catch { [version]'0.0' } } } -Descending | Select-Object -First 1
}

# --- 1. 找到 MSVC 工具集（<VS>\<Edition>\VC\Tools\MSVC\<版本>） ---
$msvcCandidates = @()

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (Test-Path -LiteralPath $vswhere) {
  # vswhere 是标准途径，但部分离线/绿色安装没在注册表登记，可能返回空
  $vsPaths = & $vswhere -all -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
  foreach ($vs in $vsPaths) {
    if (-not $vs) { continue }
    $msvcRoot = Join-Path $vs.Trim() 'VC\Tools\MSVC'
    if (Test-Path -LiteralPath $msvcRoot) {
      Get-ChildItem -LiteralPath $msvcRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object { $msvcCandidates += $_.FullName }
    }
  }
}

if ($msvcCandidates.Count -eq 0) {
  # 兜底：直接扫盘上的标准布局 <VS>\<主版本>\<版本>\VC\Tools\MSVC\<工具集>
  #（例如 ...\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.50.35717）
  foreach ($base in @("${env:ProgramFiles(x86)}\Microsoft Visual Studio", "$env:ProgramFiles\Microsoft Visual Studio")) {
    if (-not (Test-Path -LiteralPath $base)) { continue }
    $levels = @(Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue)
    $installRoots = @()
    foreach ($lvl in $levels) {
      $installRoots += $lvl   # 形如 <VS>\18 或 <VS>\2019
      $installRoots += @(Get-ChildItem -LiteralPath $lvl.FullName -Directory -ErrorAction SilentlyContinue)  # 形如 <VS>\18\BuildTools
    }
    foreach ($installRoot in $installRoots) {
      $msvcRoot = Join-Path $installRoot.FullName 'VC\Tools\MSVC'
      if (Test-Path -LiteralPath $msvcRoot) {
        Get-ChildItem -LiteralPath $msvcRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object { $msvcCandidates += $_.FullName }
      }
    }
  }
}

if ($msvcCandidates.Count -eq 0) {
  throw '未找到 MSVC 工具集。请安装 VS Build Tools / Visual Studio，并勾选"使用 C++ 的桌面开发"工作负载。'
}
$msvcBase = Select-Newest $msvcCandidates

# --- 2. 找到 Windows SDK ---
$sdkLibRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\Lib'
if (-not (Test-Path -LiteralPath $sdkLibRoot)) {
  throw "未找到 Windows SDK（$sdkLibRoot 不存在）。请安装 Windows 10/11 SDK。"
}
$sdkVer = Select-Newest @(Get-ChildItem -LiteralPath $sdkLibRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
if (-not $sdkVer) { throw "未找到可用的 Windows SDK 版本（$sdkLibRoot 为空）。" }
$sdkInc = Join-Path (Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\Include') $sdkVer

# --- 3. 组装 LIB / INCLUDE ---
$linker  = Join-Path $msvcBase 'bin\Hostx64\x64\link.exe'
$msvcLib = Join-Path $msvcBase 'lib\x64'
$msvcInc = Join-Path $msvcBase 'include'
$sdkLib  = Join-Path (Join-Path $sdkLibRoot $sdkVer) 'um\x64'
$sdkUcrt = Join-Path (Join-Path $sdkLibRoot $sdkVer) 'ucrt\x64'

$required = @{
  'link.exe'       = $linker
  'MSVC lib'       = $msvcLib
  'MSVC include'   = $msvcInc
  'SDK um lib'     = $sdkLib
  'SDK ucrt lib'   = $sdkUcrt
  'SDK um include' = (Join-Path $sdkInc 'um')
  'SDK ucrt include' = (Join-Path $sdkInc 'ucrt')
}
foreach ($k in $required.Keys) {
  if (-not (Test-Path -LiteralPath $required[$k])) { throw "缺少必需的 $k 路径：$($required[$k])" }
}

$lib     = @($msvcLib, $sdkLib, $sdkUcrt) -join ';'
$include = @($msvcInc, (Join-Path $sdkInc 'ucrt'), (Join-Path $sdkInc 'um'), (Join-Path $sdkInc 'shared')) -join ';'

# TOML 基本字符串里反斜杠要转义
$content = @"
# 由 scripts\setup-msvc.ps1 自动生成，请勿手工编辑（也未被 git 跟踪）。
# 重新生成：powershell -ExecutionPolicy Bypass -File scripts\setup-msvc.ps1

[env]
LIB = "$($lib -replace '\\', '\\')"
INCLUDE = "$($include -replace '\\', '\\')"

[target.x86_64-pc-windows-msvc]
linker = "$($linker -replace '\\', '/')"
"@

$cargoDir = Join-Path $root '.cargo'
New-Item -ItemType Directory -Force -Path $cargoDir | Out-Null
$target = Join-Path $cargoDir 'config.toml'
# 用不带 BOM 的 UTF-8 写入：带 BOM 的 TOML 在部分工具里会解析失败
[System.IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding $false))

Write-Host "已生成 $target"
Write-Host "  MSVC : $msvcBase"
Write-Host "  SDK  : $sdkVer"
Write-Host ''
Write-Host '现在可以运行 pnpm tauri:dev 了。撤销方式：删除该文件。'
