import { useState } from 'react';
import { backend } from '../data/sync';
import { signIn } from '../data/session';

export function Login() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(() => localStorage.getItem('planner.lastEmail') ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const clean = email.trim().toLowerCase();
      await backend.sendCode(clean);
      localStorage.setItem('planner.lastEmail', clean);
      setEmail(clean);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, code.replace(/\D/g, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>Планер</h1>
        {step === 'email' ? (
          <form onSubmit={send}>
            <p className="muted">Введите почту — пришлём код для входа.</p>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="primary" disabled={busy || !email.includes('@')}>
              {busy ? 'Отправляю…' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="muted">
              Код отправлен на <b>{email}</b>. Письмо может прийти через минуту, загляните в «Спам».
            </p>
            <input
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="код из письма"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
            <button className="primary" disabled={busy || code.length < 6}>
              {busy ? 'Проверяю…' : 'Войти'}
            </button>
            <div className="login-links">
              <button type="button" className="link" disabled={busy} onClick={() => void send()}>
                Отправить ещё раз
              </button>
              <button type="button" className="link" onClick={() => (setStep('email'), setCode(''), setError(''))}>
                Другая почта
              </button>
            </div>
          </form>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
