import { syncNow, useSyncStatus, type SyncState } from '../data/sync';

const LABELS: Record<SyncState, string> = {
  idle: 'Ожидание',
  syncing: 'Синхронизация…',
  ok: 'Сохранено в облаке',
  offline: 'Без сети — всё сохраняется на устройстве',
  error: 'Ошибка синхронизации',
  auth: 'Нужно войти заново',
};

export function SyncBadge() {
  const s = useSyncStatus();
  return (
    <button className={'sync-badge ' + s.state} title={s.message ?? LABELS[s.state]} onClick={() => void syncNow()}>
      <span className="dot" />
      <span className="sync-label">{s.state === 'ok' ? 'Синхр.' : s.state === 'offline' ? 'Офлайн' : s.state === 'syncing' ? '…' : s.state === 'idle' ? '' : '!'}</span>
    </button>
  );
}

export { LABELS as SYNC_LABELS };
