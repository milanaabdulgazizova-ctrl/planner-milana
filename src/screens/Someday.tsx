import { useLiveQuery } from 'dexie-react-hooks';
import { TaskList } from '../components/TaskList';
import { somedayTasks } from '../data/tasks';

export function SomedayScreen() {
  const tasks = useLiveQuery(somedayTasks, []) ?? [];
  return (
    <section className="day-screen">
      <div className="screen-head">
        <h2>Когда-нибудь</h2>
      </div>
      <p className="muted hint">Задачи без даты. Позже их можно будет перетащить на нужный день.</p>
      <article className="day-card wide">
        <TaskList tasks={tasks} date={null} />
      </article>
    </section>
  );
}
