import { useState } from 'react';
import type { Task } from '../data/db';
import { addTask, deleteTask, updateTask } from '../data/tasks';
import { Checkbox } from './Checkbox';

function TaskRow({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const save = () => {
    setEditing(false);
    const t = title.trim();
    if (!t) return setTitle(task.title);
    if (t !== task.title) void updateTask(task.id, { title: t });
  };

  return (
    <li className={'task' + (task.done ? ' done' : '')}>
      <Checkbox checked={task.done} label={task.title} onChange={(v) => void updateTask(task.id, { done: v })} />
      {editing ? (
        <input
          className="task-edit"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setTitle(task.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="task-title" onClick={() => setEditing(true)}>
          {task.title}
        </span>
      )}
      <button className="icon-btn" aria-label="Удалить" onClick={() => void deleteTask(task.id)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </li>
  );
}

export function AddTask({ date, placeholder = 'Добавить задачу' }: { date: string | null; placeholder?: string }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="add-task"
      onSubmit={(e) => {
        e.preventDefault();
        void addTask(value, date);
        setValue('');
      }}
    >
      <span className="plus" aria-hidden="true">+</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} enterKeyHint="done" />
    </form>
  );
}

export function TaskList({ tasks, date }: { tasks: Task[]; date: string | null }) {
  return (
    <>
      <ul className="tasks">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
      <AddTask date={date} />
    </>
  );
}
