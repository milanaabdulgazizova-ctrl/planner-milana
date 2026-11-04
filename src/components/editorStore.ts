import { useSyncExternalStore } from 'react';

// Какая задача сейчас открыта в окне редактирования.
let openId: string | null = null;
const listeners = new Set<() => void>();

export function openTaskEditor(id: string) {
  openId = id;
  listeners.forEach((l) => l());
}
export function closeTaskEditor() {
  openId = null;
  listeners.forEach((l) => l());
}
export function useOpenTaskId() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => openId,
  );
}
