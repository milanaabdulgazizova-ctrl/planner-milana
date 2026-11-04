import type { Habit } from '../data/db';
import { habitsForDate, setHabitDone } from '../data/habits';
import { Checkbox } from './Checkbox';

/** Привычки на день — просто галочки. */
export function HabitChecks({ date, habits, checks }: { date: string; habits: Habit[]; checks: Set<string> }) {
  const list = habitsForDate(habits, date);
  if (!list.length) return null;
  return (
    <div className="habit-checks">
      <div className="cat-head">
        <span className="cat-name static">Привычки</span>
      </div>
      <ul className="tasks">
        {list.map((h) => {
          const done = checks.has(`${h.id}|${date}`);
          return (
            <li key={h.id} className={'task habit' + (done ? ' done' : '')}>
              <Checkbox checked={done} label={h.name} onChange={(v) => void setHabitDone(h.id, date, v)} />
              <span className="task-body" onClick={() => void setHabitDone(h.id, date, !done)}>
                <span className="task-title">{h.name}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
