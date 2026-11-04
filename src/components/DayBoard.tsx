import { useEffect, useState } from 'react';
import { addCategory, deleteCategory, renameCategory } from '../data/categories';
import type { DayCategory, DayNote, Sphere, Task } from '../data/db';
import { setDayNote } from '../data/days';
import { TaskGroup } from './TaskGroup';

/** Заголовок категории: нажать — переименовать, × — удалить. */
function CategoryHeader({ cat }: { cat: DayCategory }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  useEffect(() => setName(cat.name), [cat.name]);

  const save = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== cat.name) void renameCategory(cat.id, name);
    else setName(cat.name);
  };

  return (
    <div className="cat-head">
      {editing ? (
        <input
          className="cat-input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      ) : (
        <button className="cat-name" onClick={() => setEditing(true)} title="Переименовать">
          {cat.name}
        </button>
      )}
      <button
        className="icon-btn small"
        aria-label={`Удалить категорию ${cat.name}`}
        onClick={() => {
          if (confirm(`Удалить категорию «${cat.name}»? Задачи из неё останутся в этом дне без категории.`)) void deleteCategory(cat.id);
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

function AddCategory({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open)
    return (
      <button className="add-cat" onClick={() => setOpen(true)}>
        + категория
      </button>
    );
  const done = () => {
    void addCategory(date, name);
    setName('');
    setOpen(false);
  };
  return (
    <form
      className="add-cat-form"
      onSubmit={(e) => {
        e.preventDefault();
        done();
      }}
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={done} placeholder="Название категории" enterKeyHint="done" />
    </form>
  );
}

export function DayNoteField({ date, note, rows = 1 }: { date: string; note?: DayNote; rows?: number }) {
  const [text, setText] = useState(note?.text ?? '');
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(note?.text ?? '');
  }, [note?.text, focused]);
  return (
    <textarea
      className="day-note"
      rows={rows}
      placeholder="Заметка дня…"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (text !== (note?.text ?? '')) void setDayNote(date, text);
      }}
    />
  );
}

/**
 * Содержимое одного дня: задачи без категории сверху, затем категории дня.
 * untimedOnly — показывать только задачи без времени (в виде «День» время — на шкале).
 */
export function DayBoard({
  date,
  tasks,
  categories,
  spheres,
  untimedOnly = false,
}: {
  date: string;
  tasks: Task[];
  categories: DayCategory[];
  spheres: Map<string, Sphere>;
  untimedOnly?: boolean;
}) {
  const shown = untimedOnly ? tasks.filter((t) => !t.start) : tasks;
  const catIds = new Set(categories.map((c) => c.id));
  // Задачи с несуществующей категорией (её удалили на другом устройстве) показываем без категории.
  const uncategorized = shown.filter((t) => !t.categoryId || !catIds.has(t.categoryId));
  return (
    <>
      <TaskGroup tasks={uncategorized} date={date} categoryId={null} spheres={spheres} />
      {categories.map((c) => (
        <section key={c.id} className="category">
          <CategoryHeader cat={c} />
          <TaskGroup tasks={shown.filter((t) => t.categoryId === c.id)} date={date} categoryId={c.id} spheres={spheres} addPlaceholder="Добавить" />
        </section>
      ))}
      <AddCategory date={date} />
    </>
  );
}
