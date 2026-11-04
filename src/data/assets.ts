import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { uuidFrom } from '../lib/uuid';
import { db, type Asset } from './db';
import { alive, putRecord, removeRecord, stamp } from './records';
import { backend, requestSync } from './sync';

// ---------- подготовка картинки ----------

/** Уменьшить картинку перед сохранением: меньше места и быстрее синхронизация. */
async function shrink(file: File, maxSide: number, keepAlpha: boolean): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * k);
  const height = Math.round(bitmap.height * k);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const type = keepAlpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Не удалось обработать картинку'))), type, 0.85));
  return { blob, width, height };
}

/** Добавить картинку: сохраняется на устройстве сразу, в облако — при синхронизации. */
export async function addAsset(file: File, purpose: Asset['purpose']): Promise<string> {
  const isSticker = purpose === 'sticker';
  const { blob, width, height } = await shrink(file, isSticker ? 400 : 1400, isSticker);
  const id = crypto.randomUUID();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  await db.blobs.put({ id, blob, pending: 1 });
  await putRecord(db.assets, id, { purpose, path: `${purpose}/${id}.${ext}`, mime: blob.type, width, height, createdAt: stamp() });
  return id;
}

export async function deleteAsset(id: string) {
  const a = await db.assets.get(id);
  await removeRecord(db.assets, id);
  await db.blobs.delete(id);
  if (a) backend.deleteFile(a.path).catch(() => {}); // если нет сети — файл останется в облаке, не страшно
}

export function useAssets(purpose: Asset['purpose']): Asset[] {
  return useLiveQuery(async () => alive(await db.assets.where('purpose').equals(purpose).toArray()).sort((a, b) => a.createdAt - b.createdAt), [purpose]) ?? [];
}

// ---------- синхронизация файлов (вызывается из общей синхронизации) ----------

export async function syncBlobs() {
  const pending = await db.blobs.where('pending').equals(1).toArray();
  for (const b of pending) {
    const a = await db.assets.get(b.id);
    if (!a || a.deleted) {
      await db.blobs.delete(b.id);
      continue;
    }
    await backend.uploadFile(a.path, b.blob);
    await db.blobs.update(b.id, { pending: 0 });
  }
}

// ---------- показ картинки ----------

const downloading = new Map<string, Promise<void>>();

async function ensureBlob(id: string) {
  if (await db.blobs.get(id)) return;
  if (downloading.has(id)) return downloading.get(id);
  const p = (async () => {
    const a = await db.assets.get(id);
    if (!a || a.deleted) return;
    const blob = await backend.downloadFile(a.path);
    await db.blobs.put({ id, blob, pending: 0 });
  })().finally(() => downloading.delete(id));
  downloading.set(id, p);
  return p;
}

/** Адрес картинки для <img>. Если файла ещё нет на устройстве — скачиваем из облака. */
export function useAssetUrl(id: string | null): string | null {
  const blob = useLiveQuery(async () => (id ? (await db.blobs.get(id))?.blob ?? null : null), [id]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      if (id && blob === null) ensureBlob(id).catch(() => {}); // нет сети — попробуем в следующий раз
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob, id]);
  return url;
}

// ---------- стикеры дня и мудборд ----------

export const dayStickersId = (date: string) => uuidFrom('stickers:' + date);
export const moodboardId = (weekStart: string) => uuidFrom('moodboard:' + weekStart);

export async function stickersForDates(dates: string[]) {
  return alive(await db.dayStickers.where('date').anyOf(dates).toArray());
}

export async function addDaySticker(date: string, item: string) {
  const cur = await db.dayStickers.get(dayStickersId(date));
  const items = cur && !cur.deleted ? cur.items : [];
  await putRecord(db.dayStickers, dayStickersId(date), { date, items: [...items, item] });
}

export async function removeDaySticker(date: string, index: number) {
  const cur = await db.dayStickers.get(dayStickersId(date));
  if (!cur) return;
  await putRecord(db.dayStickers, dayStickersId(date), { date, items: cur.items.filter((_, i) => i !== index) });
}

export function useMoodboard(weekStart: string): string[] {
  return useLiveQuery(async () => {
    const r = await db.moodboards.get(moodboardId(weekStart));
    return r && !r.deleted ? r.assetIds : [];
  }, [weekStart]) ?? [];
}

export async function addToMoodboard(weekStart: string, files: File[]) {
  const ids: string[] = [];
  for (const f of files) ids.push(await addAsset(f, 'moodboard'));
  const cur = await db.moodboards.get(moodboardId(weekStart));
  const list = cur && !cur.deleted ? cur.assetIds : [];
  await putRecord(db.moodboards, moodboardId(weekStart), { weekStart, assetIds: [...list, ...ids] });
  requestSync(300);
}

export async function removeFromMoodboard(weekStart: string, assetId: string) {
  const cur = await db.moodboards.get(moodboardId(weekStart));
  if (!cur) return;
  await putRecord(db.moodboards, moodboardId(weekStart), { weekStart, assetIds: cur.assetIds.filter((x) => x !== assetId) });
  await deleteAsset(assetId);
}
