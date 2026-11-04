import { useEffect, useState } from 'react';
import { Login } from './screens/Login';
import { WeekScreen } from './screens/Week';
import { DayScreen } from './screens/Day';
import { SomedayScreen } from './screens/Someday';
import { SettingsScreen } from './screens/Settings';
import { HabitsScreen } from './screens/Habits';
import { SyncBadge } from './components/SyncBadge';
import { PlannerDnd } from './components/dnd';
import { TaskEditor } from './components/TaskEditor';
import { ReviewSheet } from './components/ReviewSheet';
import { PlanningWizard } from './components/PlanningWizard';
import { DueBanners } from './components/DueBanners';
import { useOverlay } from './components/uiStore';
import { TaskRowView } from './components/TaskRow';
import { ensureDefaultSpheres } from './data/spheres';
import { applyTheme, useSettings } from './data/days';
import { useUser } from './data/session';
import { startAutoSync } from './data/sync';
import { todayISO } from './lib/dates';

export type Tab = 'week' | 'day' | 'someday' | 'habits' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'week', label: 'Неделя', icon: 'M4 6h16M4 12h16M4 18h16' },
  { id: 'day', label: 'День', icon: 'M5 5h14v14H5zM5 9h14M9 3v4M15 3v4' },
  { id: 'someday', label: 'Когда-нибудь', icon: 'M12 4v16M4 12h16' },
  { id: 'habits', label: 'Привычки', icon: 'M5 12l4 4 10-10M5 20h14' },
  { id: 'settings', label: 'Настройки', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2' },
];

export function App() {
  const user = useUser();
  // Стартовый экран из настроек (копия хранится локально, чтобы не мигало при запуске).
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('planner.startScreen') as Tab) || 'week');
  const [dayDate, setDayDate] = useState(todayISO);

  const settings = useSettings();
  const overlay = useOverlay();
  useEffect(() => applyTheme(settings.bgColor, settings.accentColor), [settings.bgColor, settings.accentColor]);

  useEffect(() => {
    if (!user) return;
    void ensureDefaultSpheres();
    startAutoSync();
  }, [user]);

  if (!user) return <Login />;

  const openDay = (date: string) => {
    setDayDate(date);
    setTab('day');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Планер</span>
        <nav className="topnav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <SyncBadge />
      </header>

      <PlannerDnd renderOverlay={(t) => <TaskRowView task={t} dragging />}>
        <main className="content">
          {(tab === 'week' || tab === 'day') && <DueBanners />}
          {tab === 'week' && <WeekScreen onOpenDay={openDay} />}
          {tab === 'day' && <DayScreen date={dayDate} onDateChange={setDayDate} />}
          {tab === 'someday' && <SomedayScreen />}
          {tab === 'habits' && <HabitsScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </main>
      </PlannerDnd>
      <TaskEditor />
      {overlay?.kind === 'review' && <ReviewSheet />}
      {overlay?.kind === 'planning' && <PlanningWizard weekStart={overlay.weekStart} />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
