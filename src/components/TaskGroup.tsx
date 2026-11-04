import { useState } from 'react';
import type { Sphere, Task } from '../data/db';
import { addTask } from '../data/tasks';
import { useGroupDrop } from './dnd';
import { TaskRow } from './TaskRow';

export function AddTask({ date, categoryId = null, placeholder = 'Добавить задачу' }: { date: string | null; categoryId?: string | null; placeholder?: string }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="add-task"
      onSubmit={(e) => {
        e.preventDefault();
        void addTask(value, date, categoryId);
        setValue('');
      }}
    >
      <span className="plus" aria-hidden="true">+</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} enterKeyHint="done" aria-label={placeholder} />
    </form>
  );
}

/** Список задач, в который можно бросить задачу перетаскиванием. */
export function TaskGroup({
  tasks,
  date,
  categoryId,
  spheres,
  addPlaceholder,
}: {
  tasks: Task[];
  date: string | null;
  categoryId: string | null;
  spheres: Map<string, Sphere>;
  addPlaceholder?: string;
}) {
  const drop = useGroupDrop(date, categoryId);
  return (
    <div ref={drop.setNodeRef} className={'task-group' + (drop.isOver ? ' over' : '')}>
      <ul className="tasks">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} sphere={t.sphereId ? spheres.get(t.sphereId) : undefined} />
        ))}
      </ul>
      <AddTask date={date} categoryId={categoryId} placeholder={addPlaceholder} />
    </div>
  );
}
