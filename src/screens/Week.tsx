import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { TaskList } from '../components/TaskList';
import { tasksForDates } from '../data/tasks';
import { addDays, formatDayMonth, formatWeekday, formatWeekRange, startOfWeek, todayISO, weekDays } from '../lib/dates';

export function WeekScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const days = weekDays(weekStart);
  const tasks = useLiveQuery(() => tasksForDates(days), [weekStart]) ?? [];
  const isCurrent = weekStart === startOfWeek(today);

  return (
    <section>
      <div className="screen-head">
        <h2>{formatWeekRange(weekStart)}</h2>
        <div className="pager">
          <button className="icon-btn" aria-label="Предыдущая неделя" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ‹
          </button>
          {!isCurrent && (
            <button className="chip" onClick={() => setWeekStart(startOfWeek(today))}>
              Сегодня
            </button>
          )}
          <button className="icon-btn" aria-label="Следующая неделя" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            ›
          </button>
        </div>
      </div>

      <div className="week-grid">
        {days.map((d) => (
          <article key={d} className={'day-card' + (d === today ? ' today' : '')}>
            <header className="day-head" onClick={() => onOpenDay(d)}>
              <span className="weekday">{formatWeekday(d)}</span>
              <span className="date muted">{formatDayMonth(d)}</span>
            </header>
            <TaskList tasks={tasks.filter((t) => t.date === d)} date={d} />
          </article>
        ))}
      </div>
    </section>
  );
}
