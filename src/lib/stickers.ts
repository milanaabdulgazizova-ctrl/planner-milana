// Свои стикеры: простые пастельные рисунки (без чужих персонажей и брендов).
// Каждый — SVG 64×64 с мягкой заливкой и тонким контуром.

const O = 'stroke="#2F3A33" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

export const SVG_STICKERS: Record<string, { name: string; svg: string }> = {
  sun: { name: 'Солнце', svg: `<circle cx="32" cy="32" r="12" fill="#F2D98D" ${O}/><g ${O}><path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M49 15l-5 5M20 44l-5 5"/></g>` },
  moon: { name: 'Луна', svg: `<path d="M40 10a22 22 0 1 0 14 34A18 18 0 0 1 40 10z" fill="#D9D3EE" ${O}/><circle cx="20" cy="18" r="1.6" fill="#2F3A33"/><circle cx="50" cy="16" r="1.4" fill="#2F3A33"/>` },
  star: { name: 'Звезда', svg: `<path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z" fill="#F3DFA2" ${O}/>` },
  heart: { name: 'Сердце', svg: `<path d="M32 53S10 40 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 29-22 29z" fill="#EDB8BE" ${O}/>` },
  flower: { name: 'Цветок', svg: `<g fill="#F1C6CF" ${O}><circle cx="32" cy="18" r="9"/><circle cx="45" cy="28" r="9"/><circle cx="40" cy="43" r="9"/><circle cx="24" cy="43" r="9"/><circle cx="19" cy="28" r="9"/></g><circle cx="32" cy="32" r="7" fill="#F2D98D" ${O}/>` },
  leaf: { name: 'Листик', svg: `<path d="M14 50C14 26 30 12 52 12c0 24-14 40-38 38z" fill="#B9D2B3" ${O}/><path d="M14 50L40 24" ${O} fill="none"/>` },
  cup: { name: 'Чашка', svg: `<path d="M12 26h32v12a14 14 0 0 1-14 14h-4a14 14 0 0 1-14-14z" fill="#E6CDB5" ${O}/><path d="M44 30h4a6 6 0 0 1 0 12h-5" fill="none" ${O}/><path d="M22 12c-2 4 2 6 0 10M32 12c-2 4 2 6 0 10" fill="none" ${O}/>` },
  book: { name: 'Книга', svg: `<path d="M32 18c-6-4-14-5-22-4v34c8-1 16 0 22 4 6-4 14-5 22-4V14c-8-1-16 0-22 4z" fill="#C8D8E6" ${O}/><path d="M32 18v34" ${O}/>` },
  pencil: { name: 'Карандаш', svg: `<path d="M14 50l4-14 26-26 10 10-26 26z" fill="#F2D98D" ${O}/><path d="M18 36l10 10M40 14l10 10" ${O}/><path d="M14 50l4-14 10 10z" fill="#E6CDB5" ${O}/>` },
  dumbbell: { name: 'Гантель', svg: `<rect x="8" y="22" width="9" height="20" rx="3" fill="#A9BFA4" ${O}/><rect x="47" y="22" width="9" height="20" rx="3" fill="#A9BFA4" ${O}/><path d="M17 32h30" ${O}/><rect x="2" y="27" width="6" height="10" rx="2" fill="#A9BFA4" ${O}/><rect x="56" y="27" width="6" height="10" rx="2" fill="#A9BFA4" ${O}/>` },
  sparkle: { name: 'Искорка', svg: `<path d="M32 6c3 14 8 19 22 22-14 3-19 8-22 22-3-14-8-19-22-22 14-3 19-8 22-22z" fill="#D9D3EE" ${O}/><path d="M50 44c1 5 3 7 8 8-5 1-7 3-8 8-1-5-3-7-8-8 5-1 7-3 8-8z" fill="#F3DFA2" ${O}/>` },
  cloud: { name: 'Облако', svg: `<path d="M18 46a10 10 0 0 1 0-20 14 14 0 0 1 27-3 11 11 0 0 1 3 23z" fill="#DDE8F0" ${O}/>` },
  rainbow: { name: 'Радуга', svg: `<g fill="none" stroke-linecap="round" stroke-width="5"><path d="M10 46a22 22 0 0 1 44 0" stroke="#EDB8BE"/><path d="M17 46a15 15 0 0 1 30 0" stroke="#F3DFA2"/><path d="M24 46a8 8 0 0 1 16 0" stroke="#B9D2B3"/></g>` },
  cat: { name: 'Котик', svg: `<path d="M14 26l2-14 10 8h12l10-8 2 14v8c0 10-8 18-18 18s-18-8-18-18z" fill="#E9DCCB" ${O}/><circle cx="25" cy="33" r="2" fill="#2F3A33"/><circle cx="39" cy="33" r="2" fill="#2F3A33"/><path d="M29 39c2 2 4 2 6 0M8 38h8M8 43h8M48 38h8M48 43h8" fill="none" ${O}/>` },
  letter: { name: 'Письмо', svg: `<rect x="8" y="16" width="48" height="34" rx="5" fill="#F6EDE2" ${O}/><path d="M10 19l22 17 22-17" fill="none" ${O}/><path d="M32 46c-4-3-7-5-7-8a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 3-3 5-7 8z" fill="#EDB8BE" ${O} stroke-width="1.6"/>` },
  check: { name: 'Готово', svg: `<circle cx="32" cy="32" r="22" fill="#B9D2B3" ${O}/><path d="M22 33l7 7 14-15" fill="none" ${O} stroke-width="3.2"/>` },
  plane: { name: 'Самолётик', svg: `<path d="M8 30l48-18-14 42-10-14z" fill="#DDE8F0" ${O}/><path d="M32 40l24-28M32 40l-2 12 7-6" fill="none" ${O}/>` },
  note: { name: 'Нота', svg: `<path d="M26 44V14l24-5v30" fill="none" ${O}/><ellipse cx="20" cy="45" rx="7" ry="5.5" fill="#C9A9B8" ${O}/><ellipse cx="44" cy="40" rx="7" ry="5.5" fill="#C9A9B8" ${O}/><path d="M26 22l24-5" ${O}/>` },
  cake: { name: 'Тортик', svg: `<rect x="12" y="30" width="40" height="22" rx="5" fill="#F1C6CF" ${O}/><path d="M12 38c5 4 9 4 13 0s9-4 14 0 9 4 13 0" fill="none" ${O}/><path d="M32 30v-9" ${O}/><path d="M32 12c-3 3-3 6 0 8 3-2 3-5 0-8z" fill="#F2D98D" ${O} stroke-width="1.8"/>` },
  plant: { name: 'Росток', svg: `<path d="M18 40h28l-4 16H22z" fill="#E6CDB5" ${O}/><path d="M32 40V24" ${O}/><path d="M32 28c-10 0-14-6-14-12 8 0 14 4 14 12zM32 24c0-8 6-12 14-12 0 6-4 12-14 12z" fill="#B9D2B3" ${O}/>` },
};

export function stickerSvgUrl(name: string): string | null {
  const s = SVG_STICKERS[name];
  if (!s) return null;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${s.svg}</svg>`);
}
