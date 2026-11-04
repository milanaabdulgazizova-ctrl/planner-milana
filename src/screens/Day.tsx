import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { DayBoard, DayNoteField } from '../components/DayBoard';
import { Timeline } from '../components/Timeline';
import { categoriesForDates } from '../data/categories';
import { notesForDates, useSettings } from '../data/days';
import { useSpheres } from '../data/spheres';
import { tasksForDates } from '../data/tasks';
import { addDays, formatDayMonth, formatWeekday, todayISO } from '../lib/dates';

export function DayScreen({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const tasks = useLiveQuery(() => tasksForDates([date]), [date]) ?? [];
  const categories = useLiveQuery(() => categoriesForDates([date]), [date]) ?? [];
  const note = useLiveQuery(() => notesForDates([date]), [date])?.[0];
  const sphereList = useSpheres();
  const spheres = useMemo(() => new Map(sphereList.map((s) => [s.id, s])), [sphereList]);
  const settings = useSettings();
  const today = todayISO();

  return (
    <section className="day-screen">
      <div className="screen-head">
        <h2>
          {formatWeekday(date)}, {formatDayMonth(date)}
        </h2>
        <div className="pager">
          <button className="icon-btn" aria-label="Предыдущий день" onClick={() => onDateChange(addDays(date, -1))}>
            ‹
          </button>
          <input type="date" className="date-picker" value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} aria-label="Выбрать дату" />
          {date !== today && (
            <button className="chip" onClick={() => onDateChange(today)}>
              Сегодня
            </button>
          )}
          <button className="icon-btn" aria-label="Следующий день" onClick={() => onDateChange(addDays(date, 1))}>
            ›
          </button>
        </div>
      </div>

      <div className="day-layout">
        <div className="day-col">
          <article className={'day-card' + (date === today ? ' today' : '')}>
            <h3 className="card-title">Задачи</h3>
            <DayBoard date={date} tasks={tasks} categories={categories} spheres={spheres} untimedOnly />
            <p className="muted small hint-inline">Совет: напишите «10:00 Созвон» — задача сразу встанет на шкалу.</p>
          </article>
          <article className="day-card">
            <h3 className="card-title">Заметка</h3>
            <DayNoteField key={date} date={date} note={note} rows={4} />
          </article>
        </div>
        <article className="day-card timeline-card">
          <h3 className="card-title">По времени</h3>
          <Timeline tasks={tasks} startHour={settings.dayStartHour} endHour={settings.dayEndHour} isToday={date === today} spheres={spheres} />
        </article>
      </div>
    </section>
  );
}
