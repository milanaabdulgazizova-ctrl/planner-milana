import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db, type Task } from '../data/db';
import { updateSettings, useWeekFocus } from '../data/days';
import { habitsForDate, useHabitChecks, useHabits } from '../data/habits';
import { alive } from '../data/records';
import { useSpheres } from '../data/spheres';
import { compareTasks, moveTask, somedayTasks, tasksForDates } from '../data/tasks';
import { addDays, formatDayMonth, formatWeekRange, todayISO, weekDays } from '../lib/dates';
import { WEEKDAYS_SHORT } from '../lib/repeat';
import { timeLabel } from './TaskRow';
import { closeOverlay } from './uiStore';
import { WeekFocus } from './WeekFocus';

/** Шаг 1: итоги прошлой недели. */
function Summary({ weekStart }: { weekStart: string }) {
  const days = weekDays(weekStart);
  const today = todayISO();
  const tasks = useLiveQuery(() => tasksForDates(days), [weekStart]) ?? [];
  const spheres = useSpheres();
  const habits = useHabits();
  const checks = useHabitChecks(days);
  const goals = useWeekFocus(weekStart);

  const done = tasks.filter((t) => t.done).length;
  const bySphere = spheres
    .map((s) => {
      const list = tasks.filter((t) => t.sphereId === s.id);
      return { s, total: list.length, done: list.filter((t) => t.done).length };
    })
    .filter((x) => x.total > 0);
  const noSphere = tasks.filter((t) => !t.sphereId);
  const habitStats = habits
    .map((h) => {
      const planned = days.filter((d) => d <= today && habitsForDate([h], d).length);
      return { h, planned: planned.length, done: planned.filter((d) => checks.has(`${h.id}|${d}`)).length };
    })
    .filter((x) => x.planned > 0);

  return (
    <div className="plan-step">
      <h3>Итоги недели {formatWeekRange(weekStart)}</h3>
      <p className="big-number">
        {done} <span className="muted">из {tasks.length} задач выполнено</span>
      </p>
      {goals.length > 0 && (
        <div className="plan-block">
          <span className="field-label">Фокус той недели</span>
          <ol className="plain-goals">
            {goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>
        </div>
      )}
      {(bySphere.length > 0 || noSphere.length > 0) && (
        <div className="plan-block">
          <span className="field-label">По сферам</span>
          {bySphere.map(({ s, total, done }) => (
            <div key={s.id} className="bar-row">
              <span className="bar-label">{s.name}</span>
              <span className="bar">
                <span style={{ width: `${(done / total) * 100}%`, background: s.color }} />
              </span>
              <span className="muted small">
                {done}/{total}
              </span>
            </div>
          ))}
          {noSphere.length > 0 && (
            <div className="bar-row">
              <span className="bar-label muted">без сферы</span>
              <span className="bar">
                <span style={{ width: `${(noSphere.filter((t) => t.done).length / noSphere.length) * 100}%`, background: 'var(--muted)' }} />
              </span>
              <span className="muted small">
                {noSphere.filter((t) => t.done).length}/{noSphere.length}
              </span>
            </div>
          )}
        </div>
      )}
      {habitStats.length > 0 && (
        <div className="plan-block">
          <span className="field-label">Привычки</span>
          {habitStats.map(({ h, planned, done }) => (
            <div key={h.id} className="bar-row">
              <span className="bar-label">{h.name}</span>
              <span className="bar">
                <span style={{ width: `${(done / planned) * 100}%`, background: 'var(--accent)' }} />
              </span>
              <span className="muted small">
                {done}/{planned}
              </span>
            </div>
          ))}
        </div>
      )}
      {tasks.length === 0 && habitStats.length === 0 && <p className="muted">На той неделе задач не было.</p>}
    </div>
  );
}

/** Шаг 3: раскидать «Когда-нибудь» и невыполненное по дням недели. */
function Distribute({ weekStart }: { weekStart: string }) {
  const days = weekDays(weekStart);
  const today = todayISO();
  const someday = useLiveQuery(somedayTasks, []) ?? [];
  const overdue =
    useLiveQuery(async () => alive(await db.tasks.filter((t) => !!t.date && t.date < weekStart && t.date <= today && !t.done && !t.repeat && !t.skipped).toArray()).sort(compareTasks), [weekStart]) ?? [];
  const weekTasks = useLiveQuery(() => tasksForDates(days), [weekStart]) ?? [];
  const counts = days.map((d) => weekTasks.filter((t) => t.date === d).length);

  const Row = ({ t, canSomeday }: { t: Task; canSomeday?: boolean }) => (
    <li className="dist-item">
      <span className="dist-title">
        {t.start && <span className="task-time">{timeLabel(t)}</span>}
        {t.title}
        {t.date && <span className="muted small"> · было {formatDayMonth(t.date)}</span>}
      </span>
      <span className="dist-days">
        {days.map((d, i) => (
          <button key={d} className="wd" onClick={() => void moveTask(t, d, null)} title={formatDayMonth(d)}>
            {WEEKDAYS_SHORT[i]} {Number(d.slice(8))}
          </button>
        ))}
        {canSomeday && (
          <button className="chip small-chip" onClick={() => void moveTask(t, null, null)}>
            Когда-нибудь
          </button>
        )}
      </span>
    </li>
  );

  return (
    <div className="plan-step">
      <h3>Раскидать задачи по дням</h3>
      <div className="week-counts">
        {days.map((d, i) => (
          <span key={d} className={'wc' + (counts[i] ? ' has' : '')} title="задач в этот день">
            {WEEKDAYS_SHORT[i]} {Number(d.slice(8))}: <b>{counts[i]}</b>
          </span>
        ))}
      </div>
      {overdue.length > 0 && (
        <div className="plan-block">
          <span className="field-label">Не сделано раньше</span>
          <ul className="dist-list">
            {overdue.map((t) => (
              <Row key={t.id} t={t} canSomeday />
            ))}
          </ul>
        </div>
      )}
      <div className="plan-block">
        <span className="field-label">Когда-нибудь</span>
        {someday.length ? (
          <ul className="dist-list">
            {someday.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </ul>
        ) : (
          <p className="muted small">Список «Когда-нибудь» пуст.</p>
        )}
      </div>
      <p className="muted small">Нажмите на день — задача переедет туда. Остальное можно оставить.</p>
    </div>
  );
}

const STEPS = ['Итоги', 'Фокус', 'По дням'];

export function PlanningWizard({ weekStart }: { weekStart: string }) {
  const [step, setStep] = useState(0);
  const prevWeek = useMemo(() => addDays(weekStart, -7), [weekStart]);
  const finish = () => {
    void updateSettings({ lastPlannedWeek: weekStart });
    closeOverlay();
  };
  return (
    <div className="sheet-backdrop" onClick={closeOverlay}>
      <div className="sheet big" role="dialog" aria-label="Планирование недели" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2>Неделя {formatWeekRange(weekStart)}</h2>
        <div className="steps">
          {STEPS.map((s, i) => (
            <button key={s} className={'step' + (i === step ? ' on' : i < step ? ' past' : '')} onClick={() => setStep(i)}>
              <span>{i + 1}</span> {s}
            </button>
          ))}
        </div>
        {step === 0 && <Summary weekStart={prevWeek} />}
        {step === 1 && (
          <div className="plan-step">
            <h3>Фокус и цели</h3>
            <p className="muted small">2–3 главные цели на неделю. Мудборд из картинок появится на этапе 5.</p>
            <WeekFocus weekStart={weekStart} />
          </div>
        )}
        {step === 2 && <Distribute weekStart={weekStart} />}
        <div className="sheet-actions">
          {step > 0 && (
            <button className="secondary" onClick={() => setStep(step - 1)}>
              Назад
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="primary" onClick={() => setStep(step + 1)}>
              Далее
            </button>
          ) : (
            <button className="primary" onClick={finish}>
              Готово
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
