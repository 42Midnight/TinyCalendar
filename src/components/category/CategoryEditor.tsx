import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import type { Category } from '../../types';

interface Props {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (id: number | null, name: string, color: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const PRESETS = [
  '#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6',
  '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1',
  '#14B8A6','#78716C','#E11D48','#CA8A04','#9333EA',
];

export default function CategoryEditor({ open, category, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [custom, setCustom] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(category?.name || '');
      setColor(category?.color || '#3B82F6');
      setCustom('');
    }
  }, [open, category]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(category?.id ?? null, name.trim(), custom || color);
    onClose();
  };

  const handleDelete = async () => {
    if (!category) return;
    await onDelete(category.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={onClose}
        title={category ? '编辑分类' : '新建分类'} width="380px">
        <div className="flex flex-col gap-3">
          <input className="input" placeholder="分类名称" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            autoFocus />

          <div className="flex gap-1 flex-wrap">
            {PRESETS.map((c) => (
              <button key={c} type="button"
                onClick={() => { setColor(c); setCustom(''); }}
                className="w-6 h-6 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  transform: (!custom && color === c) ? 'scale(1.4)' : 'scale(1)',
                  boxShadow: (!custom && color === c) ? '0 0 0 2px var(--bg-primary), 0 0 0 3px currentColor' : 'none',
                }} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>自定义</span>
            <input className="input w-24 text-[12px]" placeholder="#RRGGBB"
              value={custom} onChange={(e) => setCustom(e.target.value)} />
            {custom && /^#[0-9a-fA-F]{6}$/.test(custom) && (
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: custom, border: '1px solid var(--border)' }} />
            )}
          </div>

          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div>
              {category && (
                <button className="btn btn-danger text-[12px]" onClick={() => setConfirmDelete(true)}>删除</button>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary text-[12px]" onClick={onClose}>取消</button>
              <button className="btn btn-primary text-[12px]" onClick={handleSave} disabled={!name.trim()}>保存</button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete} title="删除分类"
        message={`确定删除"${category?.name ?? ''}"？该分类下的所有事件也将被删除。`}
        confirmText="删除" danger />
    </>
  );
}
