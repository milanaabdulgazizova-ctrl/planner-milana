import { createClient, isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config';
import { AuthRequiredError, isNetworkLike, NetworkError, type AuthUser, type Backend, type RemoteRow } from './backend';

/** Сколько ждём ответа сервера. Без этого запрос в авиарежиме на iPhone может висеть бесконечно. */
const REQUEST_TIMEOUT_MS = 15_000;

const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal && 'any' in AbortSignal ? AbortSignal.any([init.signal, timeout]) : (init.signal ?? timeout);
  return fetch(input, { ...init, signal });
};

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'planner.auth',
  },
  global: { fetch: fetchWithTimeout },
});

function friendlyAuthError(e: AuthError): Error {
  const msg = (e.message || '').toLowerCase();
  const code = (e as AuthError & { code?: string }).code ?? '';
  if (code === 'otp_disabled' || msg.includes('signups not allowed') || msg.includes('signup')) {
    return new Error('Эта почта не подключена к планеру. Проверьте адрес.');
  }
  if (code === 'over_email_send_rate_limit' || e.status === 429 || msg.includes('rate limit')) {
    return new Error('Слишком много писем подряд. Подождите немного и попробуйте снова.');
  }
  if (code === 'otp_expired' || msg.includes('expired') || msg.includes('invalid')) {
    return new Error('Код неверный или устарел. Запросите новый.');
  }
  if (msg.includes('fetch') || msg.includes('network')) {
    return new Error('Нет связи с сервером. Проверьте интернет.');
  }
  return new Error(e.message || 'Что-то пошло не так');
}

export const supabaseBackend: Backend = {
  async sendCode(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Новых пользователей не создаём: войти может только заранее добавленный владелец.
      options: { shouldCreateUser: false },
    });
    if (error) throw friendlyAuthError(error);
  },

  async verifyCode(email, code): Promise<AuthUser> {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw friendlyAuthError(error);
    if (!data.user) throw new Error('Не удалось войти');
    return { id: data.user.id, email: data.user.email ?? email };
  },

  async signOut() {
    await supabase.auth.signOut({ scope: 'local' });
  },

  async hasSession() {
    const { data, error } = await supabase.auth.getSession();
    // Без сети вход не «пропал» — просто не удалось обновить его. Это не повод просить войти заново.
    if (error && (isAuthRetryableFetchError(error) || isNetworkLike(error))) throw new NetworkError();
    return !!data.session;
  },

  async push(rows) {
    if (!rows.length) return;
    if (!(await this.hasSession())) throw new AuthRequiredError();
    const { error } = await supabase.from('records').upsert(rows, { onConflict: 'id' });
    if (error) throw toSyncError(error);
  },

  uploadFile: (path, blob) => storageApi.uploadFile(path, blob),
  downloadFile: (path) => storageApi.downloadFile(path),
  deleteFile: (path) => storageApi.deleteFile(path),

  async pull(since, limit) {
    if (!(await this.hasSession())) throw new AuthRequiredError();
    let q = supabase
      .from('records')
      .select('id, kind, data, updated_at, deleted, server_updated_at')
      .order('server_updated_at', { ascending: true })
      .limit(limit);
    if (since) q = q.gt('server_updated_at', since);
    const { data, error } = await q;
    if (error) throw toSyncError(error);
    return (data ?? []) as RemoteRow[];
  },
};

const BUCKET = 'planner';

/** Полный путь в хранилище: каждый пользователь — в своей папке (так устроены правила доступа). */
async function fullPath(path: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new AuthRequiredError();
  return `${data.session.user.id}/${path}`;
}

function toStorageError(e: { message?: string; statusCode?: string | number; name?: string }): Error {
  const msg = e.message ?? String(e);
  if (isNetworkLike(new Error(msg))) return new NetworkError();
  if (/bucket not found/i.test(msg)) return new Error('Хранилище картинок не настроено (нужно выполнить supabase/storage.sql)');
  return new Error(msg);
}

export const storageApi = {
  async uploadFile(path: string, blob: Blob) {
    const { error } = await supabase.storage.from(BUCKET).upload(await fullPath(path), blob, { upsert: true, contentType: blob.type });
    if (error) throw toStorageError(error);
  },
  async downloadFile(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).download(await fullPath(path));
    if (error || !data) throw toStorageError(error ?? { message: 'Файл не найден' });
    return data;
  },
  async deleteFile(path: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([await fullPath(path)]);
    if (error) throw toStorageError(error);
  },
};

function toSyncError(e: { message: string; code?: string }): Error {
  if (isNetworkLike(new Error(e.message))) return new NetworkError();
  if (e.code === 'PGRST301' || e.code === '42501' || /jwt/i.test(e.message)) return new AuthRequiredError();
  return new Error(e.message);
}
