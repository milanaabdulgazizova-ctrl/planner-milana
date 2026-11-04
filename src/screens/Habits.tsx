import { useEffect, useMemo, useState } from 'react';
import type { Habit } from '../data/db';
import { addHabit, deleteHabit, habitsForDate, updateHabit, useHabitChecks, useHabits } from '../data/habits';
import { fromISODate, startOfWeek, toISODate, todayISO, weekDays } from '../lib/dates';
import { WEEKDAYS_SHORT } from '../lib/repeat';

function DaysToggle({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="weekday-toggles">
      {WEEKDAYS_SHORT.map((w, i) => {
        const on = days.includes(i);
        return (
          <button
            key={w}
            type="button"
            className={'wd' + (on ? ' on' : '')}
            onClick={() => {
              const next = on ? days.filter((x) => x !== i) : [...days, i].sort();
              if (next.length) onChange(next);
            }}
          >
            {w}
          </button>
        );
      })}
    </div>
  );
}

function monthDays(today: string): string[] {
  const d = fromISODate(today);
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => toISODate(new Date(d.getFullYear(), d.getMonth(), i + 1)));
}

/** Сколько раз выполнено из запланированных (будущие дни не считаем). */
function score(h: Habit, dates: string[], checks: Set<string>, today: string) {
  const planned = dates.filter((d) => d <= today && habitsForDate([h], d).length);
  const done = planned.filter((d) => checks.has(`${h.id}|${d}`)).length;
  return { done, planned: planned.length };
}

function HabitCard({ h, week, month, checks, today }: { h: Habit; week: string[]; month: string[]; checks: Set<string>; today: string }) {
  const [name, setName] = useState(h.name);
  const [editDays, setEditDays] = useState(false);
  useEffect(() => setName(h.name), [h.name]);
  const w = score(h, week, checks, today);
  const m = score(h, month, checks, today);
  const daysLabel = h.days.length === 7 ? 'каждый день' : h.days.map((i) => WEEKDAYS_SHORT[i].toLowerCase()).join(', ');

  return (
    <article className="day-card habit-card">
      <div className="habit-head">
        <input
          className="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() && name.trim() !== h.name ? void updateHabit(h.id, { name: name.trim() }) : setName(h.name))}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Название привычки"
        />
        <button className="icon-btn small" aria-label={`Удалить привычку ${h.name}`} onClick={() => confirm(`Удалить привычку «${h.name}» вместе с отметками?`) && void deleteHabit(h.id)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <button className="link small" onClick={() => setEditDays(!editDays)}>
        {daysLabel}
      </button>
      {editDays && <DaysToggle days={h.days} onChange={(days) => void updateHabit(h.id, { days })} />}

      <div className="habit-stats">
        <span>
          Неделя: <b>{w.done}</b> из {w.planned}
        </span>
        <span>
          Месяц: <b>{m.done}</b> из {m.planned}
        </span>
      </div>
      <div className="month-dots" aria-label="Отметки за месяц">
        {month.map((d) => {
          const planned = habitsForDate([h], d).length > 0;
          const done = checks.has(`${h.id}|${d}`);
          const cls = done ? 'done' : !planned ? 'off' : d > today ? 'future' : 'missed';
          return <span key={d} className={'mdot ' + cls + (d === today ? ' today' : '')} title={`${fromISODate(d).getDate()}: ${done ? 'сделано' : planned ? (d > today ? 'впереди' : 'не отмечено') : 'не запланировано'}`} />;
        })}
      </div>
    </article>
  );
}

export function HabitsScreen() {
  const habits = useHabits();
  const today = todayISO();
  const week = weekDays(startOfWeek(today));
  const month = monthDays(today);
  const all = useMemo(() => [...new Set([...month, ...week])], [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const checks = useHabitChecks(all);
  const [name, setName] = useState('');
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  return (
    <section className="day-screen">
      <div className="screen-head">
        <h2>Привычки</h2>
      </div>
      <p className="muted hint">Отмечайте галочками в «Неделе» или «Дне». Здесь — список привычек и статистика.</p>

      <div className="habits-grid">
        {habits.map((h) => (
          <HabitCard key={h.id} h={h} week={week} month={month} checks={checks} today={today} />
        ))}
      </div>

      <article className="day-card wide habit-add">
        <h3 className="card-title">Новая привычка</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addHabit(name, days);
            setName('');
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: испанский 15 минут" />
          <span className="field-label">В какие дни</span>
          <DaysToggle days={days} onChange={setDays} />
          <button className="primary" disabled={!name.trim()}>
            Добавить
          </button>
        </form>
      </article>
    </section>
  );
}
