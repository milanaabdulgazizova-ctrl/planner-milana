import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { SYNC_LABELS } from '../components/SyncBadge';
import { APP_VERSION } from '../config';
import { db } from '../data/db';
import { relogin, signOut, useUser } from '../data/session';
import { syncNow, useSyncStatus } from '../data/sync';

export function SettingsScreen() {
  const user = useUser();
  const s = useSyncStatus();
  const pending = useLiveQuery(() => db.tasks.where('dirty').equals(1).count(), []) ?? 0;
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
    <section className="day-screen">
      <div className="screen-head">
        <h2>Настройки</h2>
      </div>

      <article className="day-card wide settings">
        <div className="row">
          <span className="muted">Вход</span>
          <span>{user?.email}</span>
        </div>
        <div className="row">
          <span className="muted">Синхронизация</span>
          <span>
            {SYNC_LABELS[s.state]}
            {s.lastOk && (
              <span className="muted">
                {' '}
                · {new Date(s.lastOk).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
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
