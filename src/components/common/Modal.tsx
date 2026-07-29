import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = '420px',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="rounded-lg shadow-lg"
        style={{
          width,
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {title && (
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon text-lg"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
