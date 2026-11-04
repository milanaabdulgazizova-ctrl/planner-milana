import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './styles.css';
import { App } from './App';

// Офлайн-режим и автообновление приложения.
registerSW({ immediate: true });

// Просим браузер не удалять локальные данные при нехватке места.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
