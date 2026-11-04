import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState, type ReactNode } from 'react';
import type { Task } from '../data/db';
import { moveTask } from '../data/tasks';

// Перетаскивание задач между днями, категориями и «Когда-нибудь».
// Мышь: потянуть задачу. Телефон: зажать задачу ~0,3 с и тянуть.

export interface GroupTarget {
  type: 'group';
  date: string | null;
  categoryId: string | null;
}
export interface TaskTarget {
  type: 'task';
  task: Task;
}

// iOS Safari: без «активного» обработчика touchmove страница прокручивается прямо во время перетаскивания.
window.addEventListener('touchmove', () => {}, { passive: false });

export const groupDropId = (date: string | null, categoryId: string | null) => `group:${date ?? 'someday'}:${categoryId ?? 'none'}`;

/** Сначала цель «задача» (вставить перед ней), иначе — «список». */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const tasks = hits.filter((h) => h.data?.droppableContainer?.data?.current?.type === 'task');
  return tasks.length ? tasks : hits;
};

export function PlannerDnd({ children, renderOverlay }: { children: ReactNode; renderOverlay: (t: Task) => ReactNode }) {
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );

  const onStart = (e: DragStartEvent) => {
    setActive((e.active.data.current?.task as Task) ?? null);
    navigator.vibrate?.(10);
  };

  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const task = e.active.data.current?.task as Task | undefined;
    const target = e.over?.data.current as GroupTarget | TaskTarget | undefined;
    if (!task || !target) return;
    if (target.type === 'task') {
      if (target.task.id === task.id) return;
      void moveTask(task.id, target.task.date, target.task.categoryId ?? null, target.task.id);
    } else {
      if (target.date === task.date && target.categoryId === (task.categoryId ?? null)) return;
      void moveTask(task.id, target.date, target.categoryId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)} autoScroll={{ threshold: { x: 0.1, y: 0.15 } }}>
      {children}
      <DragOverlay dropAnimation={null}>{active ? renderOverlay(active) : null}</DragOverlay>
    </DndContext>
  );
}

export function useTaskDnd(task: Task) {
  const drag = useDraggable({ id: 'drag:' + task.id, data: { task } });
  const drop = useDroppable({ id: 'task:' + task.id, data: { type: 'task', task } satisfies TaskTarget });
  return {
    setRef: (el: HTMLElement | null) => {
      drag.setNodeRef(el);
      drop.setNodeRef(el);
    },
    handleProps: { ...drag.attributes, ...drag.listeners },
    isDragging: drag.isDragging,
    isOver: drop.isOver && !drag.isDragging,
  };
}

export function useGroupDrop(date: string | null, categoryId: string | null) {
  return useDroppable({ id: groupDropId(date, categoryId), data: { type: 'group', date, categoryId } satisfies GroupTarget });
}
