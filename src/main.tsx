import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './styles.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyBgColor } from './data/days';

// Цвет фона, выбранный в прошлый раз, — сразу, до загрузки базы.
applyBgColor(localStorage.getItem('planner.bg') ?? '#EDF1EA');

// Офлайн-режим и автообновление приложения:
// проверяем, нет ли новой версии, при каждом возвращении в приложение и раз в 30 минут.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => {});
    };
    setInterval(check, 30 * 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

// Просим браузер не удалять локальные данные при нехватке места.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
