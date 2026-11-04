import { useLiveQuery } from 'dexie-react-hooks';
import { TaskList } from '../components/TaskList';
import { tasksForDate } from '../data/tasks';
import { addDays, formatDayMonth, formatWeekday, todayISO } from '../lib/dates';

export function DayScreen({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const tasks = useLiveQuery(() => tasksForDate(date), [date]) ?? [];
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
          <input
            type="date"
            className="date-picker"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            aria-label="Выбрать дату"
          />
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
      <article className={'day-card wide' + (date === today ? ' today' : '')}>
        <TaskList tasks={tasks} date={date} />
      </article>
    </section>
  );
}
