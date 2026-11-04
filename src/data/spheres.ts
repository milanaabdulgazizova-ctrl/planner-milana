import { useLiveQuery } from 'dexie-react-hooks';
import { uuidFrom } from '../lib/uuid';
import { db, type Sphere } from './db';
import { alive, patchRecord, putRecord, removeRecord, stamp } from './records';

/** Цвета, из которых можно выбрать цвет сферы. */
export const SPHERE_COLORS = [
  '#8EA6BC', '#A9C7C0', '#D8B49A', '#A9BFA4', '#C9A9B8', '#D9CB9C',
  '#B7A6CF', '#E2A9A0', '#9FC3D6', '#BFB8AE',
];

const DEFAULTS: [string, string, string][] = [
  ['work', 'Работа · MIMAY', '#8EA6BC'],
  ['school', 'Онлайн-школа', '#A9C7C0'],
  ['study', 'Учёба', '#D8B49A'],
  ['sport', 'Тренировки', '#A9BFA4'],
  ['lang', 'Языки', '#C9A9B8'],
  ['personal', 'Личное', '#D9CB9C'],
];

/**
 * Стандартные сферы создаём с постоянными id и «нулевым» временем изменения:
 * на всех устройствах они одинаковые, а любая ваша правка их перекроет.
 */
export async function ensureDefaultSpheres() {
  await db.transaction('rw', db.spheres, async () => {
    for (const [i, [key, name, color]] of DEFAULTS.entries()) {
      const id = uuidFrom('sphere:' + key);
      if (!(await db.spheres.get(id))) {
        await db.spheres.put({ id, name, color, order: i, updatedAt: 0, deleted: 0, dirty: 0 });
      }
    }
  });
}

export function useSpheres(): Sphere[] {
  return useLiveQuery(async () => alive(await db.spheres.toArray()).sort((a, b) => a.order - b.order), []) ?? [];
}

export async function addSphere(name: string, color: string) {
  if (!name.trim()) return;
  await putRecord(db.spheres, crypto.randomUUID(), { name: name.trim(), color, order: stamp() });
}

export const updateSphere = (id: string, patch: Partial<Pick<Sphere, 'name' | 'color' | 'order'>>) => patchRecord(db.spheres, id, patch);
export const deleteSphere = (id: string) => removeRecord(db.spheres, id);
