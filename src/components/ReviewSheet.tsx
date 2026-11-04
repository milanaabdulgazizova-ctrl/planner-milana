import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import type { Task } from '../data/db';
import { updateSettings, useSettings } from '../data/days';
import { reviewItems } from '../data/review';
import { useSpheres } from '../data/spheres';
import { deleteOne, moveTask, setDone } from '../data/tasks';
import { addDays, formatDayMonth, todayISO } from '../lib/dates';
import { closeOverlay } from './uiStore';
import { timeLabel } from './TaskRow';

function dayLabel(date: string, today: string) {
  if (date === today) return 'сегодня';
  if (date === addDays(today, -1)) return 'вчера';
  return formatDayMonth(date);
}

function ReviewItem({ task, today, color }: { task: Task; today: string; color?: string }) {
  const [pickDay, setPickDay] = useState(false);
  const tomorrow = addDays(today, 1);
  return (
    <li className="review-item" style={color ? { ['--sphere' as string]: color } : undefined}>
      <div className="review-title">
        {color && <span className="sphere-dot" />}
        <span>
          {task.start && <span className="task-time">{timeLabel(task)}</span>}
          {task.title}
          {task.seriesId && <span className="task-note-mark">↻</span>}
        </span>
        <span className="muted small review-date">{dayLabel(task.date!, today)}</span>
      </div>
      <div className="review-actions">
        <button className="chip" onClick={() => void setDone(task, true)}>
          ✓ Сделано
        </button>
        <button className="chip" onClick={() => void moveTask(task, tomorrow, null)}>
          На завтра
        </button>
        {pickDay ? (
          <input type="date" autoFocus min={today} className="date-picker" onChange={(e) => e.target.value && void moveTask(task, e.target.value, null)} aria-label="Другой день" />
        ) : (
          <button className="chip" onClick={() => setPickDay(true)}>
            Другой день…
          </button>
        )}
        {!task.seriesId && (
          <button className="chip" onClick={() => void moveTask(task, null, null)}>
            Когда-нибудь
          </button>
        )}
        <button className="chip danger" onClick={() => void deleteOne(task)}>
          {task.seriesId ? 'Пропустить' : 'Удалить'}
        </button>
      </div>
    </li>
  );
}

/** Вечерний разбор: что не сделано — решаем, куда это деть. */
export function ReviewSheet() {
  const settings = useSettings();
  const today = todayISO();
  const items = useLiveQuery(() => reviewItems(settings.lastReviewDate), [settings.lastReviewDate]);
  const spheres = useSpheres();
  const colors = useMemo(() => new Map(spheres.map((s) => [s.id, s.color])), [spheres]);

  const finish = () => {
    void updateSettings({ lastReviewDate: today });
    closeOverlay();
  };

  return (
    <div className="sheet-backdrop" onClick={closeOverlay}>
      <div className="sheet big" role="dialog" aria-label="Вечерний разбор" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2>Вечерний разбор</h2>
        {items === undefined ? null : items.length ? (
          <>
            <p className="muted">
              Не выполнено: {items.length}. Для каждой задачи решите, что с ней делать. Можно оставить как есть — задачи останутся на своих днях.
            </p>
            <ul className="review-list">
              {items.map((t) => (
                <ReviewItem key={t.id} task={t} today={today} color={t.sphereId ? colors.get(t.sphereId) : undefined} />
              ))}
            </ul>
          </>
        ) : (
          <p className="review-empty">Всё разобрано. Хорошего вечера 🌙</p>
        )}
        <div className="sheet-actions">
          <button className="primary" onClick={finish}>
            {items?.length ? 'Закончить, остальное оставить' : 'Готово'}
          </button>
        </div>
      </div>
    </div>
  );
}
