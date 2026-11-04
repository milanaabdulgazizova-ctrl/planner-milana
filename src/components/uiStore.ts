import { useSyncExternalStore } from 'react';

// Какое большое окно открыто: вечерний разбор или планирование недели.
export type Overlay = { kind: 'review' } | { kind: 'planning'; weekStart: string } | null;

let overlay: Overlay = null;
const listeners = new Set<() => void>();

export function openOverlay(o: Overlay) {
  overlay = o;
  listeners.forEach((l) => l());
}
export const closeOverlay = () => openOverlay(null);
export function useOverlay() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => overlay,
  );
}
