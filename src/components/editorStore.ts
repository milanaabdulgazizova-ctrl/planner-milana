import { useSyncExternalStore } from 'react';
import type { Task } from '../data/db';

// Какая задача сейчас открыта в окне редактирования (может быть копией повтора «на лету»).
let open: Task | null = null;
const listeners = new Set<() => void>();

export function openTaskEditor(task: Task) {
  open = task;
  listeners.forEach((l) => l());
}
export function closeTaskEditor() {
  open = null;
  listeners.forEach((l) => l());
}
export function useOpenTask() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => open,
  );
}
