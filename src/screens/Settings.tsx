import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { SpheresEditor } from '../components/SpheresEditor';
import { openOverlay } from '../components/uiStore';
import { planningTargetWeek } from '../data/review';
import { WEEKDAYS_SHORT } from '../lib/repeat';
import { startOfWeek, todayISO } from '../lib/dates';
import { SYNC_LABELS } from '../components/SyncBadge';
import { APP_VERSION } from '../config';
import { SYNCED } from '../data/db';
import { applyBgColor, BG_COLORS, updateSettings, useSettings } from '../data/days';
import { relogin, signOut, useUser } from '../data/session';
import { syncNow, useSyncStatus } from '../data/sync';

/** «Свой цвет»: палитра браузера. Цвет меняется сразу, сохраняется с небольшой задержкой. */
function CustomBgSwatch({ value, active }: { value: string; active: boolean }) {
  const [color, setColor] = useState(value);
  useEffect(() => setColor(value), [value]);
  useEffect(() => {
    if (color.toLowerCase() === value.toLowerCase()) return;
    applyBgColor(color);
    const t = setTimeout(() => void updateSettings({ bgColor: color }), 400);
    return () => clearTimeout(t);
  }, [color, value]);
  return (
    <label className={'swatch custom' + (active ? ' on' : '')} style={{ background: color }} title="Свой цвет">
      <span aria-hidden="true">+</span>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Свой цвет фона" />
    </label>
  );
}

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function SettingsScreen() {
  const user = useUser();
  const s = useSyncStatus();
  const settings = useSettings();
  const pending =
    useLiveQuery(async () => {
      let n = 0;
      for (const t of Object.values(SYNCED)) n += await t.where('dirty').equals(1).count();
      return n;
    }, []) ?? 0;
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    const warn =
      pending > 0
        ? `Есть ${pending} изменений, которые ещё не дошли до облака. Если выйти без интернета, они потеряются. Всё равно выйти?`
        : 'Выйти? Данные останутся в облаке, на этом устройстве они будут удалены до следующего входа.';
    if (!confirm(warn)) return;
    setBusy(true);
    await signOut();
  };

  return (
    <section className="day-screen settings-screen">
      <div className="screen-head">
        <h2>Настройки</h2>
      </div>

      <article className="day-card wide settings">
        <h3 className="card-title">Сферы жизни</h3>
        <p className="muted small">Цветные метки задач. Нажмите на кружок, чтобы сменить цвет, или на название — чтобы переименовать.</p>
        <SpheresEditor />
      </article>

      <article className="day-card wide settings">
        <h3 className="card-title">Вид</h3>
        <div className="row bg-row">
          <span>Цвет фона</span>
          <span className="color-picker">
            {BG_COLORS.map(([c, name]) => (
              <button
                key={c}
                className={'swatch' + (settings.bgColor.toLowerCase() === c.toLowerCase() ? ' on' : '')}
                style={{ background: c }}
                title={name}
                aria-label={name}
                onClick={() => void updateSettings({ bgColor: c })}
              />
            ))}
            <CustomBgSwatch value={settings.bgColor} active={!BG_COLORS.some(([c]) => c.toLowerCase() === settings.bgColor.toLowerCase())} />
          </span>
        </div>
        <div className="row">
          <span>Стартовый экран</span>
          <span className="chips">
            <button className={'chip' + (settings.startScreen === 'week' ? ' on' : '')} onClick={() => void updateSettings({ startScreen: 'week' })}>
              Неделя
            </button>
            <button className={'chip' + (settings.startScreen === 'day' ? ' on' : '')} onClick={() => void updateSettings({ startScreen: 'day' })}>
              День
            </button>
          </span>
        </div>
        <div className="row">
          <span>Шкала часов в «Дне»</span>
          <span className="field-row">
            с
            <select value={settings.dayStartHour} onChange={(e) => void updateSettings({ dayStartHour: Number(e.target.value) })}>
              {HOURS.filter((h) => h < settings.dayEndHour).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
            до
            <select value={settings.dayEndHour} onChange={(e) => void updateSettings({ dayEndHour: Number(e.target.value) })}>
              {HOURS.filter((h) => h > settings.dayStartHour).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </span>
        </div>
      </article>

      <article className="day-card wide settings">
        <h3 className="card-title">Разбор и планирование</h3>
        <div className="row">
          <span>Вечерний разбор с</span>
          <input type="time" className="date-picker" value={settings.reviewTime} onChange={(e) => e.target.value && void updateSettings({ reviewTime: e.target.value })} aria-label="Время вечернего разбора" />
        </div>
        <div className="row">
          <span>День планирования недели</span>
          <span className="weekday-toggles">
            {WEEKDAYS_SHORT.map((w, i) => (
              <button key={w} className={'wd' + (settings.planningDay === i ? ' on' : '')} onClick={() => void updateSettings({ planningDay: i })}>
                {w}
              </button>
            ))}
          </span>
        </div>
        <p className="muted small">В это время на экранах «Неделя» и «День» появится мягкое напоминание. Ничего не переносится само.</p>
        <div className="buttons">
          <button className="secondary" onClick={() => openOverlay({ kind: 'review' })}>
            Провести разбор сейчас
          </button>
          <button
            className="secondary"
            onClick={() => {
              const today = todayISO();
              const target = planningTargetWeek(settings.planningDay, today);
              openOverlay({ kind: 'planning', weekStart: target < startOfWeek(today) ? startOfWeek(today) : target });
            }}
          >
            Спланировать неделю
          </button>
        </div>
      </article>

      <article className="day-card wide settings">
        <h3 className="card-title">Аккаунт и синхронизация</h3>
        <div className="row">
          <span className="muted">Вход</span>
          <span>{user?.email}</span>
        </div>
        <div className="row">
          <span className="muted">Синхронизация</span>
          <span>
            {SYNC_LABELS[s.state]}
            {s.lastOk && <span className="muted"> · {new Date(s.lastOk).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
        </div>
        {s.message && s.state !== 'ok' && <p className="error">{s.message}</p>}
        {s.state === 'auth' && (
          <button className="primary" onClick={relogin}>
            Войти заново
          </button>
        )}
        <div className="row">
          <span className="muted">Не отправлено</span>
          <span>{pending}</span>
        </div>
        <div className="buttons">
          <button className="secondary" onClick={() => void syncNow()} disabled={s.state === 'syncing'}>
            Синхронизировать сейчас
          </button>
          <button className="secondary danger" onClick={() => void logout()} disabled={busy}>
            Выйти
          </button>
        </div>
        <p className="muted small">Версия {APP_VERSION}</p>
      </article>
    </section>
  );
}
