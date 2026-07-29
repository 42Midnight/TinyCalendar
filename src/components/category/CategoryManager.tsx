import { useState, useMemo, useRef, useCallback } from 'react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import type { Category } from '../../types';

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onAdd: (name: string, color: string) => Promise<void>;
  onEdit: (id: number, name: string, color: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onReorder: (orderedIds: number[]) => Promise<void>;
}

const PRESETS = [
  '#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6',
  '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1',
  '#14B8A6','#78716C','#E11D48','#CA8A04','#9333EA',
];

type DropPos = { idx: number; side: 'before' | 'after'; targetCatId: number } | null;

interface DragState {
  origIdx: number;
  pointerId: number;
  startY: number;
  currentY: number;
  offsetY: number;
  height: number;
  width: number;
  ghostLeft: number;
  active: boolean;
}

export default function CategoryManager({
  open, onClose, categories,
  onAdd, onEdit, onRemove, onReorder,
}: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [customColor, setCustomColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dropPosRef = useRef<DropPos>(null);
  const didDragRef = useRef(false);

  const resetForm = () => { setEditingId(null); setName(''); setColor('#3B82F6'); setCustomColor(''); };
  const startEdit = (cat: Category) => { setEditingId(cat.id); setName(cat.name); setColor(cat.color); setCustomColor(''); };
  const handleSave = async () => {
    if (!name.trim()) return;
    const finalColor = customColor || color;
    if (editingId !== null) await onEdit(editingId, name.trim(), finalColor);
    else await onAdd(name.trim(), finalColor);
    resetForm();
  };
  const handleDelete = async () => {
    if (deleteTarget) { await onRemove(deleteTarget.id); setDeleteTarget(null); if (editingId === deleteTarget.id) resetForm(); }
  };

  // ── Real-time swap preview ──
  const displayCategories = useMemo(() => {
    if (!drag?.active || !dropPos) return categories;
    const targetOrigIdx = categories.findIndex(c => c.id === dropPos.targetCatId);
    if (targetOrigIdx === -1) return categories;
    const targetIdx = dropPos.side === 'before' ? targetOrigIdx : targetOrigIdx + 1;
    if (drag.origIdx === targetIdx || (dropPos.side === 'after' && drag.origIdx === targetIdx - 1)) {
      return categories;
    }
    const reordered = [...categories];
    const [moved] = reordered.splice(drag.origIdx, 1);
    let insertAt = targetIdx;
    if (drag.origIdx < insertAt) insertAt--;
    reordered.splice(insertAt, 0, moved);
    return reordered;
  }, [categories, drag, dropPos]);

  // ── Compute drop using ghost visual edges ──
  const computeDropFromGhost = useCallback((ghostTop: number, ghostBottom: number): DropPos => {
    const list = listRef.current;
    if (!list) return null;
    const rows = list.querySelectorAll<HTMLElement>('[data-cat-id]');
    const ghostCenter = (ghostTop + ghostBottom) / 2;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (ghostBottom > r.top && ghostTop < r.bottom) {
        const itemCenter = (r.top + r.bottom) / 2;
        const catId = Number(rows[i].dataset.catId);
        return { idx: i, side: ghostCenter < itemCenter ? 'before' : 'after', targetCatId: catId };
      }
    }
    for (let i = 0; i < rows.length; i++) {
      if (ghostBottom < rows[i].getBoundingClientRect().top) {
        const catId = Number(rows[i].dataset.catId);
        return { idx: i, side: 'before', targetCatId: catId };
      }
    }
    return null;
  }, []);

  // ── Container-level pointer handlers (avoids click blocking) ──
  const handleContainerPointerDown = (e: React.PointerEvent) => {
    const target = (e.target as HTMLElement).closest('[data-cat-id]') as HTMLElement | null;
    if (!target) return;
    const catId = Number(target.dataset.catId);
    const origIdx = categories.findIndex(c => c.id === catId);
    if (origIdx === -1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    didDragRef.current = false;
    const rect = target.getBoundingClientRect();
    const ds: DragState = {
      origIdx, pointerId: e.pointerId,
      startY: e.clientY, currentY: e.clientY,
      offsetY: e.clientY - rect.top,
      height: rect.height, width: rect.width,
      ghostLeft: rect.left,
      active: false,
    };
    dragRef.current = ds;
    setDrag(ds);
    // No setPointerCapture — it blocks click events on children.
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    const cur = dragRef.current;
    if (!cur || e.pointerId !== cur.pointerId) return;
    const dy = e.clientY - cur.startY;
    const active = cur.active || Math.abs(dy) > 5;
    if (active && !cur.active) didDragRef.current = true;
    const next: DragState = { ...cur, currentY: e.clientY, active };
    dragRef.current = next;
    setDrag(next);
    if (active) {
      const ghostTop = e.clientY - cur.offsetY;
      const ghostBottom = ghostTop + cur.height;
      const pos = computeDropFromGhost(ghostTop, ghostBottom);
      if (pos !== null && pos.targetCatId !== categories[cur.origIdx]?.id) {
        dropPosRef.current = pos;
        setDropPos(pos);
      } else if (pos === null) {
        dropPosRef.current = null;
        setDropPos(null);
      }
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
    const cur = dragRef.current;
    if (!cur || e.pointerId !== cur.pointerId) return;
    dragRef.current = null;

    if (cur.active) {
      const finalPos = dropPosRef.current;
      const ids = categories.map((c) => c.id);
      const [moved] = ids.splice(cur.origIdx, 1);
      if (finalPos) {
        const targetOrigIdx = categories.findIndex(c => c.id === finalPos.targetCatId);
        let insertAt = finalPos.side === 'after' ? targetOrigIdx + 1 : targetOrigIdx;
        if (cur.origIdx < insertAt) insertAt--;
        ids.splice(insertAt, 0, moved);
      } else {
        ids.push(moved);
      }
      onReorder(ids);
    }
    setDrag(null);
    setDropPos(null);
  };

  const draggedCat = drag?.active ? categories[drag.origIdx] : null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="管理分类" width="440px">
        <div className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>拖拽分类项可调整排序</div>

        {/* Container handles all drag events */}
        <div
          ref={listRef}
          className="flex flex-col gap-1.5 max-h-52 overflow-y-auto mb-3 touch-none"
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          onPointerCancel={handleContainerPointerUp}
        >
          {displayCategories.map((cat, displayIdx) => {
            const origIdx = categories.findIndex((c) => c.id === cat.id);
            const isDragging = drag?.active && drag.origIdx === origIdx;
            const showBefore = drag?.active && dropPos?.idx === displayIdx && dropPos.side === 'before' && !isDragging;
            const showAfter  = drag?.active && dropPos?.idx === displayIdx && dropPos.side === 'after'  && !isDragging;

            return (
              <div key={cat.id}>
                {showBefore && <div className="drop-indicator" />}
                <div
                  data-cat-id={cat.id}
                  className="group flex items-center gap-2 p-2 rounded-md select-none"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    opacity: isDragging ? 0.4 : 1,
                    cursor: drag?.active ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'opacity 0.12s ease',
                  }}
                >
                  <span className="text-[11px] flex-shrink-0 opacity-30 group-hover:opacity-60 transition-opacity select-none"
                    style={{ color: 'var(--text-tertiary)' }}>⋮⋮</span>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-[13px]">{cat.name}</span>
                  {!drag?.active && (
                    <>
                      <span className="btn btn-ghost btn-icon text-[12px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => { if (!didDragRef.current) startEdit(cat); }}>✎</span>
                      <span className="btn btn-ghost btn-icon text-[12px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        style={{ color: '#ef4444' }}
                        onClick={() => { if (!didDragRef.current) setDeleteTarget(cat); }}>✕</span>
                    </>
                  )}
                </div>
                {showAfter && <div className="drop-indicator" />}
              </div>
            );
          })}

          {drag?.active && dropPos === null && categories.length > 0 && (
            <div className="drop-indicator" />
          )}

          {categories.length === 0 && (
            <div className="text-center py-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>暂无分类，请新建</div>
          )}
        </div>

        {/* Add / Edit Form */}
        <div className="p-3 rounded-md" style={{ border: '1px solid var(--border)' }}>
          <div className="text-[12px] font-medium mb-2">
            {editingId !== null ? '编辑' : '新建'}
            {editingId !== null && (
              <button className="ml-2 text-[11px] underline" style={{ color: 'var(--text-tertiary)' }}
                onClick={resetForm}>切换为新建</button>
            )}
          </div>
          <div className="flex gap-2 mb-2">
            <input className="input flex-1" placeholder="分类名称" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} />
            <button className="btn btn-primary text-[12px]" onClick={handleSave}>
              {editingId !== null ? '保存' : '添加'}
            </button>
          </div>
          <div className="flex gap-1 flex-wrap mb-2">
            {PRESETS.map((c) => (
              <button key={c} className="w-5 h-5 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  transform: (!customColor && color === c) ? 'scale(1.35)' : 'scale(1)',
                  boxShadow: (!customColor && color === c) ? '0 0 0 2px var(--bg-primary), 0 0 0 3px currentColor' : 'none',
                }}
                onClick={() => { setColor(c); setCustomColor(''); }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>自定义</span>
            <input className="input w-24" placeholder="#RRGGBB" value={customColor}
              onChange={(e) => setCustomColor(e.target.value)} />
            {customColor && /^#[0-9a-fA-F]{6}$/.test(customColor) && (
              <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: customColor }} />
            )}
          </div>
        </div>
      </Modal>

      {/* ── Floating ghost ── */}
      {drag?.active && draggedCat && (
        <div
          style={{
            position: 'fixed',
            left: drag.ghostLeft,
            top: drag.currentY - drag.offsetY,
            width: drag.width,
            zIndex: 9999,
            pointerEvents: 'none',
            opacity: 0.85,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
          }}
          className="flex items-center gap-2 p-2 rounded-md"
          onPointerDown={(e) => e.preventDefault()}
        >
          <span className="text-[11px] flex-shrink-0 opacity-30 select-none"
            style={{ color: 'var(--text-tertiary)' }}>⋮⋮</span>
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: draggedCat.color }} />
          <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{draggedCat.name}</span>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} title="删除分类"
        message={`确定要删除分类"${deleteTarget?.name ?? ''}"吗？该分类下的所有事件也将被删除。`}
        confirmText="删除" danger />
    </>
  );
}
