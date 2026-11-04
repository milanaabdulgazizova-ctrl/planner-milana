import { useRef, useState } from 'react';
import { addAsset, addDaySticker, deleteAsset, removeDaySticker, useAssetUrl, useAssets } from '../data/assets';
import { requestSync } from '../data/sync';
import { stickerSvgUrl, SVG_STICKERS } from '../lib/stickers';

/** Один стикер: свой SVG или загруженная картинка. */
export function Sticker({ item, size = 44 }: { item: string; size?: number }) {
  const [kind, ref] = item.split(':');
  const imgUrl = useAssetUrl(kind === 'img' ? ref : null);
  const src = kind === 'svg' ? stickerSvgUrl(ref) : imgUrl;
  if (!src) return <span className="sticker-ph" style={{ width: size, height: size }} />;
  return <img className="sticker" src={src} width={size} height={size} alt="" draggable={false} />;
}

/** Стикеры дня: нажать на стикер — убрать. */
export function DayStickersRow({ date, items, onAdd, size = 44 }: { date: string; items: string[]; onAdd?: () => void; size?: number }) {
  return (
    <div className="stickers-row">
      {items.map((it, i) => (
        <button key={i + it} className="sticker-btn" title="Убрать стикер" onClick={() => void removeDaySticker(date, i)}>
          <Sticker item={it} size={size} />
        </button>
      ))}
      {onAdd && (
        <button className="add-sticker" onClick={onAdd}>
          + стикер
        </button>
      )}
    </div>
  );
}

function UploadedSticker({ id, onPick, editing }: { id: string; onPick: () => void; editing: boolean }) {
  const url = useAssetUrl(id);
  return (
    <span className="picker-cell">
      <button className="picker-item" onClick={onPick} title="Добавить">
        {url ? <img src={url} alt="" /> : <span className="sticker-ph" />}
      </button>
      {editing && (
        <button className="picker-del" aria-label="Удалить загруженный стикер" onClick={() => confirm('Удалить этот стикер из набора?') && void deleteAsset(id)}>
          ×
        </button>
      )}
    </span>
  );
}

/** Окно выбора стикера. */
export function StickerPicker({ date, onClose }: { date: string; onClose: () => void }) {
  const uploaded = useAssets('sticker');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const pick = (item: string) => {
    void addDaySticker(date, item);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Стикеры" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2>Стикеры</h2>
        <div className="picker-grid">
          {Object.entries(SVG_STICKERS).map(([key, s]) => (
            <button key={key} className="picker-item" title={s.name} onClick={() => pick('svg:' + key)}>
              <img src={stickerSvgUrl(key)!} alt={s.name} />
            </button>
          ))}
        </div>
        <div className="picker-head">
          <span className="field-label">Мои картинки</span>
          {uploaded.length > 0 && (
            <button className="link small" onClick={() => setEditing(!editing)}>
              {editing ? 'готово' : 'изменить'}
            </button>
          )}
        </div>
        <div className="picker-grid">
          {uploaded.map((a) => (
            <UploadedSticker key={a.id} id={a.id} editing={editing} onPick={() => pick('img:' + a.id)} />
          ))}
          <button className="picker-item upload" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? '…' : '+ PNG'}
          </button>
        </div>
        <p className="muted small">Лучше всего — PNG с прозрачным фоном. Картинка уменьшится до 400 px.</p>
        {error && <p className="error">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/webp,image/gif,image/jpeg"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            setError('');
            try {
              await addAsset(f, 'sticker');
              requestSync(300);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}
