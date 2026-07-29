import { useState, useMemo, useRef, useCallback } from 'react';
import type { Calendar, Category } from '../../types';
import { todayString } from '../../utils/calendar';
import CategoryEditor from '../category/CategoryEditor';

interface SidebarProps {
  categories: Category[];
  activeFilter: number | null;
  onToggleFilter: (id: number | null) => void;
  onNewEvent: () => void;
  onAddCategory: (name: string, color: string) => Promise<void>;
  onEditCategory: (id: number, name: string, color: string) => Promise<void>;
  onRemoveCategory: (id: number) => Promise<void>;
  onReorderCategories: (orderedIds: number[]) => Promise<void>;
  eventCount: number;
  children?: React.ReactNode;
  calendars: Calendar[];
  activeCalendarId: number | null;
  onSelectCalendar: (id: number) => void;
}

type DropPos = { idx: number; side: 'before' | 'after'; targetCatId: number } | null;

interface DragState {
  origIdx: number;
  pointerId: number;
  startY: number;
  currentY: number;
  offsetY: number;     // cursor offset within item
  height: number;      // item height (for ghost edges)
  width: number;
  ghostLeft: number;
  active: boolean;
}

export default function Sidebar({
  categories, activeFilter, onToggleFilter, onNewEvent,
  onAddCategory, onEditCategory, onRemoveCategory, onReorderCategories,
  eventCount, children,
  calendars, activeCalendarId, onSelectCalendar,
}: SidebarProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dropPosRef = useRef<DropPos>(null);
  const didDragRef = useRef(false);

  const [calDropdownOpen, setCalDropdownOpen] = useState(false);

  const openNew = () => { setEditingCat(null); setEditorOpen(true); };
  const openEdit = (cat: Category) => { setEditingCat(cat); setEditorOpen(true); };
  const handleSave = async (id: number | null, name: string, color: string) => {
    if (id !== null) await onEditCategory(id, name, color);
    else await onAddCategory(name, color);
  };

  // ── Real-time swap preview (uses stable targetCatId) ──
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

  // ── Compute drop position using ghost visual edges (not cursor point) ──
  const computeDropFromGhost = useCallback((ghostTop: number, ghostBottom: number): DropPos => {
    const list = listRef.current;
    if (!list) return null;
    const rows = list.querySelectorAll<HTMLElement>('[data-cat-id]');
    const ghostCenter = (ghostTop + ghostBottom) / 2;
    // Find item whose rect overlaps with the ghost
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (ghostBottom > r.top && ghostTop < r.bottom) {
        const itemCenter = (r.top + r.bottom) / 2;
        const catId = Number(rows[i].dataset.catId);
        return { idx: i, side: ghostCenter < itemCenter ? 'before' : 'after', targetCatId: catId };
      }
    }
    // Find nearest item in gaps
    for (let i = 0; i < rows.length; i++) {
      if (ghostBottom < rows[i].getBoundingClientRect().top) {
        const catId = Number(rows[i].dataset.catId);
        return { idx: i, side: 'before', targetCatId: catId };
      }
    }
    return null; // below all items
  }, []);

  // ── Pointer handlers at CONTAINER level (not per-item) to avoid blocking clicks ──
  const handleContainerPointerDown = (e: React.PointerEvent) => {
    // Find which category item was pressed
    const target = (e.target as HTMLElement).closest('[data-cat-id]') as HTMLElement | null;
    if (!target) return;
    const catId = Number(target.dataset.catId);
    const origIdx = categories.findIndex(c => c.id === catId);
    if (origIdx === -1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    didDragRef.current = false;
    const rect = target.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const ds: DragState = {
      origIdx, pointerId: e.pointerId,
      startY: e.clientY, currentY: e.clientY,
      offsetY: e.clientY - rect.top,
      height: rect.height, width: rect.width,
      ghostLeft: sidebarRect?.left ?? rect.left,
      active: false,
    };
    dragRef.current = ds;
    setDrag(ds);
    // No setPointerCapture — it blocks click events on children.
    // Mouse implicit capture handles out-of-bounds movement.
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
      // If pos is on dragged item itself, keep previous dropPos
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
      onReorderCategories(ids);
    }
    setDrag(null);
    setDropPos(null);
  };

  // Click on a category (filter) — only if not a drag
  const handleFilterClick = (catId: number) => {
    if (didDragRef.current) return;
    onToggleFilter(catId);
  };
  const handleEditClick = (cat: Category) => {
    if (didDragRef.current) return;
    openEdit(cat);
  };

  const draggedCat = drag?.active ? categories[drag.origIdx] : null;

  return (
    <>
      <div ref={sidebarRef} className="flex flex-col h-full"
        style={{ width: '180px', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
        <div className="p-3 pb-1">
          <button className="btn btn-primary w-full text-[13px]" onClick={onNewEvent}>+ 新建事件</button>
        </div>
        {children}
        {/* Container handles all drag events */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-2 touch-none"
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          onPointerCancel={handleContainerPointerUp}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>分类</span>
            <button className="text-[16px] leading-none cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }} onClick={openNew} title="新建分类">+</button>
          </div>

          {/* All */}
          <button onClick={() => onToggleFilter(null)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors mb-0.5"
            style={{ backgroundColor: activeFilter === null ? 'var(--hover)' : 'transparent', color: activeFilter === null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#6b7280' }} />
            <span className="flex-1 text-left">全部</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{eventCount}</span>
          </button>

          {displayCategories.map((cat, displayIdx) => {
            const origIdx = categories.findIndex((c) => c.id === cat.id);
            const isDragging = drag?.active && drag.origIdx === origIdx;
            const showBefore = drag?.active && dropPos?.idx === displayIdx && dropPos.side === 'before' && !isDragging;
            const showAfter  = drag?.active && dropPos?.idx === displayIdx && dropPos.side === 'after'  && !isDragging;

            return (
              <div key={cat.id}>
                {showBefore && <div className="drop-indicator" />}
                {/*
                  data-cat-id used by closest() in pointerdown to find which item was pressed.
                  No pointer handlers on individual items — all handled at container level.
                */}
                <div
                  data-cat-id={cat.id}
                  className="group flex items-center gap-0.5 rounded-md select-none"
                  style={{
                    opacity: isDragging ? 0.4 : 1,
                    cursor: drag?.active ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'opacity 0.12s ease',
                  }}
                >
                  <div
                    onClick={() => handleFilterClick(cat.id)}
                    onDoubleClick={() => openEdit(cat)}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] min-w-0"
                    style={{
                      backgroundColor: activeFilter === cat.id ? 'var(--hover)' : 'transparent',
                      color: activeFilter === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      pointerEvents: drag?.active ? 'none' : 'auto',
                    }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-left truncate">{cat.name}</span>
                  </div>
                  {!drag?.active && (
                    <span
                      className="text-[12px] p-1 rounded hover:bg-[var(--hover)] flex-shrink-0 mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ color: 'var(--text-tertiary)' }}
                      onClick={(e) => { e.stopPropagation(); handleEditClick(cat); }}
                      title="编辑"
                    >✎</span>
                  )}
                </div>
                {showAfter && <div className="drop-indicator" />}
              </div>
            );
          })}

          {drag?.active && dropPos === null && categories.length > 0 && (
            <div className="drop-indicator" />
          )}
        </div>
        <div className="flex flex-col" style={{ borderTop: '1px solid var(--border-light)' }}>
          {/* Calendar switcher — single name, popup upward */}
          <div className="px-2 pt-2 pb-1 relative">
            {(() => {
              const activeCal = calendars.find((c) => c.id === activeCalendarId);
              return (
                <>
                  <button
                    onClick={() => setCalDropdownOpen(!calDropdownOpen)}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] transition-colors cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="flex-1 text-left truncate">{activeCal?.name || '日历'}</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>▴</span>
                  </button>
                  {calDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCalDropdownOpen(false)} />
                      <div
                        className="absolute left-2 right-2 z-20 rounded-md shadow-lg py-1"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          bottom: '100%',
                          marginBottom: '4px',
                        }}
                      >
                        {calendars.filter((c) => c.is_visible).map((cal) => (
                          <button
                            key={cal.id}
                            onClick={() => { onSelectCalendar(cal.id); setCalDropdownOpen(false); }}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] transition-colors cursor-pointer"
                            style={{
                              backgroundColor: activeCalendarId === cal.id ? 'var(--hover)' : 'transparent',
                              color: activeCalendarId === cal.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            <span className="flex-1 text-left truncate">{cal.name}</span>
                            {activeCalendarId === cal.id && <span className="text-[10px]" style={{ color: 'var(--accent)' }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>

          <div className="px-3 pb-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            今日 {todayString()}
          </div>
        </div>
      </div>

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
          className="flex items-center gap-0.5 rounded-md"
        >
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px]"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: draggedCat.color }} />
            <span className="flex-1 text-left truncate">{draggedCat.name}</span>
          </div>
        </div>
      )}

      <CategoryEditor open={editorOpen} category={editingCat}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave} onDelete={onRemoveCategory} />
    </>
  );
}
