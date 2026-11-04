import { useEffect, useState } from 'react';
import type { Sphere, Task } from '../data/db';
import { openTaskEditor } from './editorStore';
import { timeLabel } from './TaskRow';

const HOUR_PX = 56;
const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/** Раскладываем пересекающиеся по времени задачи по колонкам. */
function layout(tasks: Task[]) {
  const items = tasks
    .map((t) => {
      const s = toMin(t.start!);
      const e = t.end ? Math.max(toMin(t.end), s + 15) : s + 30;
      return { t, s, e, col: 0, cols: 1 };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);
  let cluster: typeof items = [];
  let clusterEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...cluster.map((x) => x.col + 1));
    cluster.forEach((x) => (x.cols = n));
    cluster = [];
  };
  for (const it of items) {
    if (it.s >= clusterEnd) flush();
    const used = new Set(cluster.filter((x) => x.e > it.s).map((x) => x.col));
    let c = 0;
    while (used.has(c)) c++;
    it.col = c;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.e);
  }
  flush();
  return items;
}

export function Timeline({ tasks, startHour, endHour, isToday, spheres }: { tasks: Task[]; startHour: number; endHour: number; isToday: boolean; spheres: Map<string, Sphere> }) {
  const timed = tasks.filter((t) => t.start);
  // если задача вне выбранных часов — расширяем шкалу, чтобы её было видно
  const minH = Math.min(startHour, ...timed.map((t) => Math.floor(toMin(t.start!) / 60)));
  const maxH = Math.max(endHour, ...timed.map((t) => Math.ceil((t.end ? toMin(t.end) : toMin(t.start!) + 30) / 60)));
  const hours = Array.from({ length: Math.max(1, maxH - minH) }, (_, i) => minH + i);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="timeline" style={{ height: hours.length * HOUR_PX }}>
      {hours.map((h, i) => (
        <div key={h} className="tl-hour" style={{ top: i * HOUR_PX }}>
          <span>{String(h).padStart(2, '0')}:00</span>
        </div>
      ))}
      {isToday && nowMin >= minH * 60 && nowMin <= maxH * 60 && <div className="tl-now" style={{ top: ((nowMin - minH * 60) / 60) * HOUR_PX }} />}
      <div className="tl-events">
        {layout(timed).map(({ t, s, e, col, cols }) => {
          const sphere = t.sphereId ? spheres.get(t.sphereId) : undefined;
          return (
            <button
              key={t.id}
              className={'tl-event' + (t.done ? ' done' : '')}
              style={{
                top: ((s - minH * 60) / 60) * HOUR_PX,
                height: Math.max(((e - s) / 60) * HOUR_PX - 2, 22),
                left: `${(col / cols) * 100}%`,
                width: `calc(${100 / cols}% - 4px)`,
                ['--sphere' as string]: sphere?.color ?? 'var(--accent)',
              }}
              onClick={() => openTaskEditor(t)}
            >
              <span className="tl-time">{timeLabel(t)}</span> {t.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
