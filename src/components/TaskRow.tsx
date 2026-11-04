import type { Sphere, Task } from '../data/db';
import { setDone } from '../data/tasks';
import { Checkbox } from './Checkbox';
import { useTaskDnd } from './dnd';
import { openTaskEditor } from './editorStore';

export function timeLabel(t: Pick<Task, 'start' | 'end'>) {
  if (!t.start) return '';
  return t.end ? `${t.start}–${t.end}` : t.start;
}

export function TaskRowView({ task, sphere, dragging }: { task: Task; sphere?: Sphere; dragging?: boolean }) {
  return (
    <div className={'task' + (task.done ? ' done' : '') + (dragging ? ' overlay' : '')} style={sphere ? { ['--sphere' as string]: sphere.color } : undefined}>
      <Checkbox checked={task.done} label={task.title} onChange={(v) => void setDone(task, v)} />
      <span className="task-body">
        {task.start && <span className="task-time">{timeLabel(task)}</span>}
        <span className="task-title">{task.title}</span>
        {task.seriesId ? <span className="task-note-mark" title="Повторяется">↻</span> : null}
        {task.note ? <span className="task-note-mark" title="Есть заметка">✎</span> : null}
      </span>
      {sphere && <span className="sphere-dot" title={sphere.name} />}
    </div>
  );
}

export function TaskRow({ task, sphere }: { task: Task; sphere?: Sphere }) {
  const dnd = useTaskDnd(task);
  return (
    <li
      ref={dnd.setRef}
      className={'task-item' + (dnd.isDragging ? ' dragging' : '') + (dnd.isOver ? ' drop-before' : '')}
      {...dnd.handleProps}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.check')) return;
        openTaskEditor(task);
      }}
    >
      <TaskRowView task={task} sphere={sphere} />
    </li>
  );
}
