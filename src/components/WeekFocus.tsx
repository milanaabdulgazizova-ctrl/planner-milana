import { useEffect, useState } from 'react';
import { setWeekGoals, useWeekFocus } from '../data/days';
import { Moodboard } from './Moodboard';

/** Фокус недели: 2–3 главные цели и мудборд из своих картинок. */
export function WeekFocus({ weekStart }: { weekStart: string }) {
  const saved = useWeekFocus(weekStart);
  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setGoals([0, 1, 2].map((i) => saved[i] ?? ''));
  }, [saved, editing]);

  const commit = () => {
    setEditing(false);
    const clean = goals.map((g) => g.trim());
    while (clean.length && !clean[clean.length - 1]) clean.pop();
    if (JSON.stringify(clean) !== JSON.stringify(saved)) void setWeekGoals(weekStart, clean);
  };

  return (
    <section className="focus-card">
      <h3>Фокус недели</h3>
      <div className="focus-body">
      <ol className="focus-goals">
        {goals.map((g, i) => (
          <li key={i}>
            <input
              value={g}
              placeholder={i === 0 ? 'Главная цель недели' : i === 1 ? 'Ещё одна цель' : 'И ещё (необязательно)'}
              onFocus={() => setEditing(true)}
              onChange={(e) => setGoals(goals.map((x, j) => (j === i ? e.target.value : x)))}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </li>
        ))}
      </ol>
      <Moodboard weekStart={weekStart} />
      </div>
    </section>
  );
}
