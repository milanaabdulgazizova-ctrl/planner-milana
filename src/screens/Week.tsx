import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { DayBoard, DayNoteField } from '../components/DayBoard';
import { TaskGroup } from '../components/TaskGroup';
import { WeekFocus } from '../components/WeekFocus';
import { categoriesForDates } from '../data/categories';
import { notesForDates } from '../data/days';
import { useSpheres } from '../data/spheres';
import { somedayTasks, tasksForDates } from '../data/tasks';
import { addDays, formatDayMonth, formatWeekday, formatWeekRange, startOfWeek, todayISO, weekDays } from '../lib/dates';

export function WeekScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const days = weekDays(weekStart);
  const tasks = useLiveQuery(() => tasksForDates(days), [weekStart]) ?? [];
  const categories = useLiveQuery(() => categoriesForDates(days), [weekStart]) ?? [];
  const notes = useLiveQuery(() => notesForDates(days), [weekStart]) ?? [];
  const someday = useLiveQuery(somedayTasks, []) ?? [];
  const sphereList = useSpheres();
  const spheres = useMemo(() => new Map(sphereList.map((s) => [s.id, s])), [sphereList]);
  const isCurrent = weekStart === startOfWeek(today);
  const [somedayOpen, setSomedayOpen] = useState(() => localStorage.getItem('planner.somedayOpen') === '1');
  const toggleSomeday = () => {
    localStorage.setItem('planner.somedayOpen', somedayOpen ? '0' : '1');
    setSomedayOpen(!somedayOpen);
  };

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

      <div className="week-top">
        <WeekFocus weekStart={weekStart} />
        <section className={'someday-card' + (somedayOpen ? ' open' : '')}>
          <button className="someday-toggle" onClick={toggleSomeday} aria-expanded={somedayOpen}>
            <h3>Когда-нибудь</h3>
            <span className="muted">{someday.length || ''}</span>
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </button>
          {somedayOpen && (
            <>
              <p className="muted small hint-inline">Перетащите задачу на нужный день.</p>
              <TaskGroup tasks={someday} date={null} categoryId={null} spheres={spheres} />
            </>
          )}
        </section>
      </div>

      <div className="week-grid">
        {days.map((d) => (
          <article key={d} className={'day-card' + (d === today ? ' today' : '')}>
            <header className="day-head">
              <button className="day-link" onClick={() => onOpenDay(d)}>
                <span className="weekday">{formatWeekday(d)}</span>
                <span className="date muted">{formatDayMonth(d)}</span>
              </button>
            </header>
            <DayBoard date={d} tasks={tasks.filter((t) => t.date === d)} categories={categories.filter((c) => c.date === d)} spheres={spheres} />
            <DayNoteField date={d} note={notes.find((n) => n.date === d)} />
          </article>
        ))}
      </div>
    </section>
  );
}
