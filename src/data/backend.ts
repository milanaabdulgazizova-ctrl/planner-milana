// Интерфейс «облака». Приложение знает только его, поэтому Supabase можно
// заменить (например, на PocketBase), написав другую реализацию этого интерфейса.

export interface RemoteRow {
  id: string;
  kind: string;
  data: Record<string, unknown>;
  /** ISO-время изменения на устройстве. */
  updated_at: string;
  deleted: boolean;
  /** ISO-время, когда запись дошла до сервера (ставит сервер). */
  server_updated_at?: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Backend {
  /** Отправить код на почту. */
  sendCode(email: string): Promise<void>;
  /** Проверить код из письма и войти. */
  verifyCode(email: string, code: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Есть ли действующий вход (без сети может вернуть сохранённый). */
  hasSession(): Promise<boolean>;

  push(rows: RemoteRow[]): Promise<void>;
  /** Записи, дошедшие до сервера строго позже since (по server_updated_at), по возрастанию. */
  pull(since: string | null, limit: number): Promise<RemoteRow[]>;

  /** Файлы (картинки): путь — относительно папки пользователя. */
  uploadFile(path: string, blob: Blob): Promise<void>;
  downloadFile(path: string): Promise<Blob>;
  deleteFile(path: string): Promise<void>;
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Нужно войти заново');
  }
}

/** Нет связи с сервером (авиарежим, плохая сеть, сервер не ответил вовремя). */
export class NetworkError extends Error {
  constructor(message = 'Нет связи с сервером') {
    super(message);
  }
}

/** Похожа ли ошибка на сетевую (браузеры пишут по-разному). */
export function isNetworkLike(e: unknown): boolean {
  if (e instanceof NetworkError) return true;
  if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) return true;
  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  return (
    e instanceof TypeError ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('network') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}
