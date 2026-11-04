import { useEffect, useState } from 'react';
import type { Sphere } from '../data/db';
import { addSphere, deleteSphere, SPHERE_COLORS, updateSphere, useSpheres } from '../data/spheres';

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-picker">
      {SPHERE_COLORS.map((c) => (
        <button key={c} className={'swatch' + (c.toLowerCase() === value.toLowerCase() ? ' on' : '')} style={{ background: c }} aria-label={`Цвет ${c}`} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

function SphereRow({ s }: { s: Sphere }) {
  const [name, setName] = useState(s.name);
  const [open, setOpen] = useState(false);
  useEffect(() => setName(s.name), [s.name]);
  return (
    <li className="sphere-row">
      <div className="sphere-row-main">
        <button className="swatch big" style={{ background: s.color }} aria-label="Сменить цвет" onClick={() => setOpen(!open)} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() && name.trim() !== s.name ? void updateSphere(s.id, { name: name.trim() }) : setName(s.name))}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Название сферы"
        />
        <button
          className="icon-btn small"
          aria-label={`Удалить сферу ${s.name}`}
          onClick={() => confirm(`Удалить сферу «${s.name}»? Задачи останутся, просто без цветной метки.`) && void deleteSphere(s.id)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      {open && (
        <ColorPicker
          value={s.color}
          onChange={(c) => {
            void updateSphere(s.id, { color: c });
            setOpen(false);
          }}
        />
      )}
    </li>
  );
}

export function SpheresEditor() {
  const spheres = useSpheres();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SPHERE_COLORS[6]);
  return (
    <>
      <ul className="sphere-list">
        {spheres.map((s) => (
          <SphereRow key={s.id} s={s} />
        ))}
      </ul>
      <form
        className="sphere-add"
        onSubmit={(e) => {
          e.preventDefault();
          void addSphere(name, color);
          setName('');
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая сфера" />
        <ColorPicker value={color} onChange={setColor} />
        <button className="secondary" disabled={!name.trim()}>
          Добавить
        </button>
      </form>
    </>
  );
}
