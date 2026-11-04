import { describeRepeat, weekdayIndex, WEEKDAYS_SHORT, type RepeatRule } from '../lib/repeat';
import { fromISODate, todayISO } from '../lib/dates';

type Kind = 'none' | 'daily' | 'weekly' | 'monthly';

/** Выбор повтора задачи. date — дата задачи (от неё берём день недели / число). */
export function RepeatPicker({ value, date, onChange }: { value: RepeatRule | null; date: string | null; onChange: (r: RepeatRule | null) => void }) {
  const kind: Kind = value?.type ?? 'none';
  const base = date ?? todayISO();
  const pick = (k: Kind) => {
    if (k === 'none') return onChange(null);
    if (k === 'daily') return onChange({ type: 'daily' });
    if (k === 'weekly') return onChange({ type: 'weekly', days: [weekdayIndex(base)], interval: 1 });
    onChange({ type: 'monthly', day: fromISODate(base).getDate() });
  };
  const opts: [Kind, string][] = [
    ['none', 'нет'],
    ['daily', 'каждый день'],
    ['weekly', 'по дням недели'],
    ['monthly', 'раз в месяц'],
  ];
  return (
    <div className="repeat-picker">
      <div className="chips">
        {opts.map(([k, label]) => (
          <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => kind !== k && pick(k)}>
            {label}
          </button>
        ))}
      </div>

      {value?.type === 'weekly' && (
        <div className="repeat-extra">
          <div className="weekday-toggles">
            {WEEKDAYS_SHORT.map((w, i) => {
              const on = value.days.includes(i);
              return (
                <button
                  key={w}
                  className={'wd' + (on ? ' on' : '')}
                  onClick={() => {
                    const days = on ? value.days.filter((x) => x !== i) : [...value.days, i].sort();
                    if (days.length) onChange({ ...value, days });
                  }}
                >
                  {w}
                </button>
              );
            })}
          </div>
          <label className="field-row">
            каждую
            <select value={value.interval} onChange={(e) => onChange({ ...value, interval: Number(e.target.value) })}>
              <option value={1}>неделю</option>
              <option value={2}>2-ю неделю</option>
              <option value={3}>3-ю неделю</option>
              <option value={4}>4-ю неделю</option>
            </select>
          </label>
        </div>
      )}

      {value?.type === 'monthly' && (
        <div className="repeat-extra field-row">
          <select
            value={value.day === 'lastWorkday' ? 'last' : String(value.day)}
            onChange={(e) => onChange({ ...value, day: e.target.value === 'last' ? 'lastWorkday' : Number(e.target.value) })}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}-го числа
              </option>
            ))}
            <option value="last">в последний будний день</option>
          </select>
          {typeof value.day === 'number' && value.day > 28 && <span className="muted small">если в месяце нет такого числа — в последний день</span>}
        </div>
      )}

      {value && <p className="muted small repeat-desc">Повторяется: {describeRepeat(value)}</p>}
    </div>
  );
}
