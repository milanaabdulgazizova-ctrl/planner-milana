import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { TaskGroup } from '../components/TaskGroup';
import { useSpheres } from '../data/spheres';
import { somedayTasks } from '../data/tasks';

export function SomedayScreen() {
  const tasks = useLiveQuery(somedayTasks, []) ?? [];
  const sphereList = useSpheres();
  const spheres = useMemo(() => new Map(sphereList.map((s) => [s.id, s])), [sphereList]);
  return (
    <section className="day-screen">
      <div className="screen-head">
        <h2>Когда-нибудь</h2>
      </div>
      <p className="muted hint">
        Задачи без даты. Чтобы назначить день — нажмите на задачу и выберите дату, или перетащите её из блока «Когда-нибудь» на экране «Неделя».
      </p>
      <article className="day-card wide">
        <TaskGroup tasks={tasks} date={null} categoryId={null} spheres={spheres} />
      </article>
    </section>
  );
}
