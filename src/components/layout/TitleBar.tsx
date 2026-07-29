import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitleBarProps {
  onOpenSettings: () => void;
}

export default function TitleBar({ onOpenSettings }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
  }, [appWindow]);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between select-none"
      style={{
        height: '36px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        paddingLeft: '14px',
        flexShrink: 0,
      }}
    >
      {/* Title */}
      <div
        className="flex items-center gap-2 text-[12px] font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span style={{ color: 'var(--accent)', fontSize: '14px' }}>📅</span>
        TinyCalendar
      </div>

      {/* Control buttons — no-drag so they remain clickable */}
      <div className="flex items-center h-full no-drag">
        <button
          onClick={onOpenSettings}
          className="btn btn-ghost btn-icon text-[14px]"
          title="设置"
        >
          ⚙
        </button>

        <button
          onClick={() => appWindow.minimize()}
          className="btn btn-ghost btn-icon text-[15px]"
          style={{ width: '42px', borderRadius: 0 }}
        >
          ─
        </button>
        <button
          onClick={() =>
            appWindow.toggleMaximize().then(() =>
              appWindow.isMaximized().then(setIsMaximized)
            )
          }
          className="btn btn-ghost btn-icon text-[13px]"
          style={{ width: '42px', borderRadius: 0 }}
        >
          {isMaximized ? '❐' : '□'}
        </button>
        <button
          onClick={() => appWindow.hide()}
          className="btn btn-ghost btn-icon text-[15px]"
          style={{ width: '42px', borderRadius: 0 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = '';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
