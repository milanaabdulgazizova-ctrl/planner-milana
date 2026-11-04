import { createClient, type AuthError } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config';
import { AuthRequiredError, type AuthUser, type Backend, type RemoteRow } from './backend';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'planner.auth',
  },
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
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async push(rows) {
    if (!rows.length) return;
    if (!(await this.hasSession())) throw new AuthRequiredError();
    const { error } = await supabase.from('records').upsert(rows, { onConflict: 'id' });
    if (error) throw toSyncError(error);
  },

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

function toSyncError(e: { message: string; code?: string }): Error {
  if (e.code === 'PGRST301' || e.code === '42501' || /jwt/i.test(e.message)) return new AuthRequiredError();
  return new Error(e.message);
}
