import { useSyncExternalStore } from 'react';
import type { AuthUser } from './backend';
import { db } from './db';
import { backend, syncNow } from './sync';

// Кто вошёл на этом устройстве. Хранится локально, чтобы планер открывался и без интернета.
const KEY = 'planner.user';

function read(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

let user = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useUser(): AuthUser | null {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => user,
  );
}

export async function signIn(email: string, code: string) {
  const u = await backend.verifyCode(email, code);
  // Если на устройстве были данные другого аккаунта — убираем их.
  if (user && user.id !== u.id) await db.delete().then(() => db.open());
  localStorage.setItem(KEY, JSON.stringify(u));
  user = u;
  emit();
  void syncNow();
}

/** Выход: сначала отправляем несохранённое в облако, потом стираем данные с этого устройства. */
export async function signOut() {
  await syncNow();
  await backend.signOut();
  localStorage.removeItem(KEY);
  await db.delete();
  location.reload();
}

/** Вход истёк: показываем экран входа, данные на устройстве не трогаем. */
export function relogin() {
  localStorage.removeItem(KEY);
  user = null;
  emit();
}
