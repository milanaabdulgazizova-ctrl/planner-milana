import { useRef, useState } from 'react';
import { addToMoodboard, removeFromMoodboard, useAssetUrl, useMoodboard } from '../data/assets';

// Небольшие повороты, чтобы было похоже на коллаж (зависят от позиции — не прыгают).
const TILT = [-2.5, 1.8, -1.2, 2.6, -1.8, 1.1, -2.2, 2];

function MoodImage({ id, i, weekStart }: { id: string; i: number; weekStart: string }) {
  const url = useAssetUrl(id);
  return (
    <figure className="mood-item" style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }}>
      {url ? <img src={url} alt="" /> : <span className="mood-ph">загружается…</span>}
      <button className="mood-del" aria-label="Убрать картинку" onClick={() => confirm('Убрать картинку из мудборда?') && void removeFromMoodboard(weekStart, id)}>
        ×
      </button>
    </figure>
  );
}

/** Мудборд недели: коллаж из своих картинок. */
export function Moodboard({ weekStart }: { weekStart: string }) {
  const ids = useMoodboard(weekStart);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="moodboard">
      {ids.length > 0 && (
        <div className="mood-grid">
          {ids.map((id, i) => (
            <MoodImage key={id} id={id} i={i} weekStart={weekStart} />
          ))}
        </div>
      )}
      <button className="add-cat" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? 'Добавляю…' : ids.length ? '+ ещё картинка' : '+ картинки для настроения'}
      </button>
      {error && <p className="error">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (!files.length) return;
          setBusy(true);
          setError('');
          try {
            await addToMoodboard(weekStart, files.slice(0, 12));
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
