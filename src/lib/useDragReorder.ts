import { useState, type DragEvent } from 'react';

// Minimal drag-to-reorder for a vertical list, no dependencies.
// Only a dedicated handle is draggable (so text selection inside inputs
// doesn't start a drag); the whole row is the drop target. The new order is
// committed once on drop, not on every dragover, to avoid write thrashing.
export function useDragReorder(
  ids: string[],
  onReorder: (orderedIds: string[]) => void,
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function commit(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
  }

  function reset() {
    setDragId(null);
    setOverId(null);
  }

  return {
    dragId,
    overId,
    handleProps: (id: string) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Firefox needs data set for a drag to start.
        e.dataTransfer.setData('text/plain', id);
      },
      onDragEnd: reset,
    }),
    rowProps: (id: string) => ({
      onDragOver: (e: DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        if (overId !== id) setOverId(id);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        commit(id);
        reset();
      },
    }),
  };
}
