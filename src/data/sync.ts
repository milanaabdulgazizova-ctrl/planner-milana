import { useSyncExternalStore } from 'react';
import { AuthRequiredError, isNetworkLike, type Backend, type RemoteRow } from './backend';
import { db, getMeta, setMeta, SYNCED, SYNCED_KINDS_SIGNATURE, type SyncFields } from './db';
import { supabaseBackend } from './supabaseBackend';

export const backend: Backend = supabaseBackend;

// ---------- статус синхронизации (для значка в шапке) ----------

export type SyncState = 'idle' | 'syncing' | 'ok' | 'offline' | 'error' | 'auth';
export interface SyncStatus {
  state: SyncState;
  lastOk: number | null;
  message?: string;
}

let status: SyncStatus = { state: 'idle', lastOk: null };
const listeners = new Set<() => void>();
function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => status,
  );
}

// ---------- сам обмен данными ----------

const PULL_PAGE = 500;
const PUSH_CHUNK = 200;
/** Запас по времени при скачивании, чтобы не пропустить одновременные записи. */
const PULL_OVERLAP_MS = 10_000;

const DATA_EXCLUDE = new Set(['id', 'updatedAt', 'deleted', 'dirty']);

function toRemote(kind: string, row: SyncFields & Record<string, unknown>): RemoteRow {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!DATA_EXCLUDE.has(k)) data[k] = v;
  return { id: row.id, kind, data, updated_at: new Date(row.updatedAt).toISOString(), deleted: row.deleted === 1 };
}

async function pushAll() {
  for (const [kind, table] of Object.entries(SYNCED)) {
    const dirty: (SyncFields & Record<string, unknown>)[] = await table.where('dirty').equals(1).toArray();
    for (let i = 0; i < dirty.length; i += PUSH_CHUNK) {
      const chunk = dirty.slice(i, i + PUSH_CHUNK);
      await backend.push(chunk.map((r) => toRemote(kind, r)));
      // Снимаем отметку «не отправлено», только если запись не успели снова изменить.
      await db.transaction('rw', table, async () => {
        for (const r of chunk) {
          await table
            .where('id')
            .equals(r.id)
            .and((x: SyncFields) => x.updatedAt === r.updatedAt)
            .modify({ dirty: 0 });
        }
      });
    }
  }
}

async function applyRemote(rows: RemoteRow[]) {
  const tables = Object.values(SYNCED);
  await db.transaction('rw', tables, async () => {
    for (const r of rows) {
      const table = SYNCED[r.kind];
      if (!table) continue;
      const remoteTs = Date.parse(r.updated_at);
      const local: SyncFields | undefined = await table.get(r.id);
      if (local && local.updatedAt > remoteTs) continue; // у нас версия новее — она уйдёт в облако
      await table.put({ ...r.data, id: r.id, updatedAt: remoteTs, deleted: r.deleted ? 1 : 0, dirty: 0 });
    }
  });
}

async function pullAll() {
  // Если в приложении появились новые виды записей — скачиваем всё заново.
  if ((await getMeta<string>('kinds')) !== SYNCED_KINDS_SIGNATURE) {
    await setMeta('cursor', null);
    await setMeta('kinds', SYNCED_KINDS_SIGNATURE);
  }
  const cursor = await getMeta<string | null>('cursor');
  let since: string | null = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString() : null;
  let newest = cursor ?? null;
  for (;;) {
    const rows = await backend.pull(since, PULL_PAGE);
    if (rows.length) {
      await applyRemote(rows);
      const last = rows[rows.length - 1].server_updated_at!;
      since = last;
      if (!newest || last > newest) newest = last;
      await setMeta('cursor', newest); // сохраняем после каждой порции, чтобы не начинать сначала
    }
    if (rows.length < PULL_PAGE) break;
  }
}

let running = false;
let again = false;
/** Номер текущей попытки: результат «зависшей» старой попытки игнорируем. */
let generation = 0;
/** Если синхронизация не закончилась за это время — считаем её зависшей и разрешаем новую. */
const SYNC_WATCHDOG_MS = 45_000;

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  if (!navigator.onLine) {
    setStatus({ state: 'offline' });
    return;
  }
  const gen = ++generation;
  running = true;
  setStatus({ state: 'syncing', message: undefined });
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = (async () => {
      do {
        again = false;
        await pushAll();
        await pullAll();
      } while (again && gen === generation);
    })();
    const timeout = new Promise<never>((_, reject) => {
      watchdog = setTimeout(() => reject(new DOMException('Сервер долго не отвечает', 'TimeoutError')), SYNC_WATCHDOG_MS);
    });
    await Promise.race([work, timeout]);
    if (gen === generation) setStatus({ state: 'ok', lastOk: Date.now() });
  } catch (e) {
    if (gen !== generation) return;
    if (e instanceof AuthRequiredError) setStatus({ state: 'auth', message: e.message });
    else if (!navigator.onLine || isNetworkLike(e)) setStatus({ state: 'offline', message: undefined });
    else setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e) });
  } finally {
    clearTimeout(watchdog);
    if (gen === generation) {
      running = false;
      // Пока шла попытка, что-то изменилось или вернулась сеть — пробуем ещё раз.
      if (again) {
        again = false;
        requestSync(500);
      }
    }
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Попросить синхронизацию чуть позже (после серии правок отправим всё разом). */
export function requestSync(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

let started = false;
export function startAutoSync() {
  if (started) return;
  started = true;
  void syncNow();
  const onBack = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => setStatus({ state: 'offline' }));
  // Вернулись в приложение / на вкладку — сразу проверяем, нет ли нового.
  document.addEventListener('visibilitychange', onBack);
  window.addEventListener('focus', onBack);
  window.addEventListener('pageshow', onBack);
  // Пока приложение открыто — проверяем новое каждые 15 секунд.
  setInterval(onBack, 15_000);
}
