import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useSettings } from '../data/days';
import { planningDue, planningTargetWeek, reviewItems } from '../data/review';
import { todayISO } from '../lib/dates';
import { openOverlay } from './uiStore';

/** Мягкие напоминания сверху экрана: пора разобрать день / спланировать неделю. */
export function DueBanners() {
  const settings = useSettings();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = todayISO();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const reviewTime = hm >= settings.reviewTime && settings.lastReviewDate !== today;
  const count = useLiveQuery(async () => (reviewTime ? (await reviewItems(settings.lastReviewDate)).length : 0), [reviewTime, settings.lastReviewDate]) ?? 0;
  const planning = planningDue(settings.planningDay, settings.lastPlannedWeek, today);

  if (!(reviewTime && count > 0) && !planning) return null;
  return (
    <div className="banners">
      {planning && (
        <button className="banner" onClick={() => openOverlay({ kind: 'planning', weekStart: planningTargetWeek(settings.planningDay, today) })}>
          <span>🗓 Время спланировать неделю</span>
          <span className="banner-go">Начать ›</span>
        </button>
      )}
      {reviewTime && count > 0 && (
        <button className="banner" onClick={() => openOverlay({ kind: 'review' })}>
          <span>🌙 Вечерний разбор: не выполнено {count}</span>
          <span className="banner-go">Разобрать ›</span>
        </button>
      )}
    </div>
  );
}
