import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import type { AppSettings } from '../../hooks/useSettings';
import type { ThemeMode, Calendar } from '../../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  settings: AppSettings;
  onUpdateSetting: (k: string, v: string) => Promise<void>;
  onToggleHoliday: (id: string, enabled: boolean) => Promise<void>;
  onExport: () => void;
  onImport: () => void;
  calendars: Calendar[];
  onAddCalendar: (name: string, color: string) => Promise<void>;
  onEditCalendar: (id: number, name: string, color: string, isVisible: boolean) => Promise<void>;
  onRemoveCalendar: (id: number) => Promise<void>;
}

type TabKey = 'general' | 'shortcuts' | 'holidays' | 'calendars' | 'data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: '通用' },
  { key: 'shortcuts', label: '快捷键' },
  { key: 'holidays', label: '节假日' },
  { key: 'calendars', label: '日历表' },
  { key: 'data', label: '数据' },
];


function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className="w-9 h-5 rounded-full transition-colors relative flex-shrink-0 border-none outline-none cursor-pointer no-drag"
      style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}>
      <div className="w-3.5 h-3.5 bg-white rounded-full shadow absolute top-0.5 transition-all"
        style={{ left: checked ? '18px' : '3px' }} />
    </button>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="px-2 py-0.5 rounded text-[12px] font-mono"
      style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
      {children}
    </kbd>
  );
}

export default function SettingsModal({
  open, onClose, theme, setTheme, settings, onUpdateSetting, onToggleHoliday, onExport, onImport,
  calendars, onAddCalendar, onEditCalendar, onRemoveCalendar,
}: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('general');
  const [shortcut, setShortcut] = useState(settings.global_shortcut);
  const [recording, setRecording] = useState(false);

  // Calendar editing state
  const [editingCalId, setEditingCalId] = useState<number | null>(null);
  const [editingCalName, setEditingCalName] = useState('');
  const [newCalName, setNewCalName] = useState('');
  const [deleteCalId, setDeleteCalId] = useState<number | null>(null);
  const deleteCalName = deleteCalId ? calendars.find((c) => c.id === deleteCalId)?.name : '';

  useEffect(() => { if (open) setShortcut(settings.global_shortcut); }, [open, settings.global_shortcut]);

  const handleCreateCalendar = async () => {
    if (!newCalName.trim()) return;
    await onAddCalendar(newCalName.trim(), '#3B82F6');
    setNewCalName('');
  };

  const startEditCal = (cal: Calendar) => {
    setEditingCalId(cal.id);
    setEditingCalName(cal.name);
  };

  const saveEditCal = async () => {
    if (editingCalId === null || !editingCalName.trim()) return;
    const cal = calendars.find((c) => c.id === editingCalId);
    if (cal && cal.name === editingCalName.trim()) { setEditingCalId(null); return; }
    await onEditCalendar(editingCalId, editingCalName.trim(), cal?.color || '#3B82F6', cal?.is_visible ?? true);
    setEditingCalId(null);
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');
    const code = e.key;
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(code)) {
      keys.push(code.length === 1 ? code.toUpperCase() : code);
    }
    if (keys.length > 1) {
      setShortcut(keys.join('+'));
      setRecording(false);
      onUpdateSetting('global_shortcut', keys.join('+'));
    }
  };

  const tabBtn = (k: TabKey, label: string) => (
    <button key={k} type="button" onClick={() => setTab(k)}
      className="flex-1 py-1.5 text-[12px] font-medium rounded-sm transition-colors cursor-pointer"
      style={{
        backgroundColor: tab === k ? 'var(--bg-primary)' : 'transparent',
        color: tab === k ? 'var(--accent)' : 'var(--text-secondary)',
        boxShadow: tab === k ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
      }}>{label}</button>
  );

  const holidays = settings.holidays || [];

  return (
    <Modal open={open} onClose={onClose} title="设置" width="480px">
      <div className="flex gap-1 mb-4 rounded-md p-0.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        {TABS.map((t) => tabBtn(t.key, t.label))}
      </div>

      <div className="flex flex-col gap-4">
        {tab === 'general' && (
          <>
            <SettingRow label="主题色" desc="浅色、深色或跟随系统">
              <select className="input w-auto" value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeMode)}>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="system">跟随系统</option>
              </select>
            </SettingRow>

            <SettingRow label="字体大小" desc="调整界面字体">
              <select className="input w-auto" value={settings.font_size}
                onChange={(e) => onUpdateSetting('font_size', e.target.value)}>
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </SettingRow>

            <SettingRow label="农历显示" desc="月视图中显示农历日期">
              <ToggleSwitch checked={settings.show_lunar}
                onChange={(v) => onUpdateSetting('show_lunar', v ? 'true' : 'false')} />
            </SettingRow>

            <SettingRow label="节假日显示" desc="在日历上标记节假日">
              <ToggleSwitch checked={settings.show_holidays}
                onChange={(v) => onUpdateSetting('show_holidays', v ? 'true' : 'false')} />
            </SettingRow>
          </>
        )}

        {tab === 'shortcuts' && (
          <>
            <div>
              <div className="text-[13px] font-medium mb-1">全局快捷键</div>
              <div className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                后台运行时按下快捷键唤出/隐藏窗口
              </div>
              <input className="input text-center text-[14px] font-mono font-bold"
                value={shortcut}
                onFocus={() => { setShortcut('按下组合键...'); setRecording(true); }}
                onBlur={() => { setRecording(false); setShortcut(settings.global_shortcut); }}
                onKeyDown={handleShortcutKeyDown} readOnly
                style={{ cursor: 'pointer', borderColor: recording ? 'var(--accent)' : 'var(--border)' }} />
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {recording ? '请按下组合键...' : '点击后按下组合键即可录制'}
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-[13px] font-medium">搜索</div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>快速定位搜索框</div>
              </div>
              <Kbd>Ctrl+K</Kbd>
            </div>
          </>
        )}

        {tab === 'holidays' && (
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            <div className="text-[12px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
              选择要在日历中显示的节日：
            </div>
            {holidays.length === 0 ? (
              <div className="text-center py-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                加载中...
              </div>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-1.5 px-2 rounded-md"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <span className="text-[13px]">{h.name}</span>
                  <ToggleSwitch checked={h.enabled}
                    onChange={(v) => onToggleHoliday(h.id, v)} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'calendars' && (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            <div className="text-[12px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
              管理你的日历表：
            </div>
            {calendars.map((cal) => (
              <div key={cal.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {editingCalId === cal.id ? (
                  <input
                    className="input flex-1 text-[12px] py-0.5"
                    value={editingCalName}
                    onChange={(e) => setEditingCalName(e.target.value)}
                    onBlur={saveEditCal}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditCal(); if (e.key === 'Escape') setEditingCalId(null); }}
                    autoFocus
                  />
                ) : (
                  <span
                    className="flex-1 text-[13px] cursor-pointer"
                    onDoubleClick={() => startEditCal(cal)}
                    title="双击重命名"
                  >{cal.name}</span>
                )}
                <ToggleSwitch checked={cal.is_visible}
                  onChange={(v) => onEditCalendar(cal.id, cal.name, cal.color, v)} />
                {calendars.length > 1 && (
                  <button
                    className="text-[12px] px-1 py-0.5 rounded cursor-pointer"
                    style={{ color: 'var(--text-tertiary)' }}
                    onClick={() => setDeleteCalId(cal.id)}
                    title="删除"
                  >✕</button>
                )}
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                className="input flex-1 text-[12px]"
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCalendar(); }}
                placeholder="新日历名称"
              />
              <button className="btn btn-primary text-[12px] px-3" onClick={handleCreateCalendar}>新建</button>
            </div>
          </div>
        )}

        {tab === 'data' && (
          <>
            <button className="btn btn-secondary w-full justify-between py-3" onClick={onExport}>
              <div className="text-left">
                <div className="text-[13px] font-medium">导出数据</div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>将所有事件和分类导出为 JSON 文件</div>
              </div>
              <span className="text-[16px]">📤</span>
            </button>
            <button className="btn btn-secondary w-full justify-between py-3" onClick={onImport}>
              <div className="text-left">
                <div className="text-[13px] font-medium">导入数据</div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>从 JSON 文件导入事件和分类</div>
              </div>
              <span className="text-[16px]">📥</span>
            </button>
            <div className="p-3 rounded-md text-[12px]" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              💡 数据库文件：<br />
              <code className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>%APPDATA%/com.tinycalendar.app/calendar.db</code>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteCalId !== null}
        onClose={() => setDeleteCalId(null)}
        onConfirm={() => { if (deleteCalId) onRemoveCalendar(deleteCalId); }}
        title="删除日历"
        message={`确定要删除"${deleteCalName}"及其所有事件吗？此操作不可撤销。`}
        confirmText="删除"
        danger
      />
    </Modal>
  );
}
