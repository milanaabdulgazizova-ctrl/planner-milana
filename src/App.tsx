import { useEffect, useState } from 'react';
import { Login } from './screens/Login';
import { WeekScreen } from './screens/Week';
import { DayScreen } from './screens/Day';
import { SomedayScreen } from './screens/Someday';
import { SettingsScreen } from './screens/Settings';
import { SyncBadge } from './components/SyncBadge';
import { useUser } from './data/session';
import { startAutoSync } from './data/sync';
import { todayISO } from './lib/dates';

export type Tab = 'week' | 'day' | 'someday' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'week', label: 'Неделя', icon: 'M4 6h16M4 12h16M4 18h16' },
  { id: 'day', label: 'День', icon: 'M5 5h14v14H5zM5 9h14M9 3v4M15 3v4' },
  { id: 'someday', label: 'Когда-нибудь', icon: 'M12 4v16M4 12h16' },
  { id: 'settings', label: 'Настройки', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2' },
];

export function App() {
  const user = useUser();
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('planner.tab') as Tab) || 'week');
  const [dayDate, setDayDate] = useState(todayISO);

  useEffect(() => {
    if (user) startAutoSync();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('planner.tab', tab);
  }, [tab]);

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

      <main className="content">
        {tab === 'week' && <WeekScreen onOpenDay={openDay} />}
        {tab === 'day' && <DayScreen date={dayDate} onDateChange={setDayDate} />}
        {tab === 'someday' && <SomedayScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

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
