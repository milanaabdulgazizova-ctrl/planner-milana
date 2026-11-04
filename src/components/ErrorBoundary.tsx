import { Component, type ReactNode } from 'react';

/** Если что-то сломалось — показываем понятное сообщение вместо белой страницы. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="login">
        <div className="login-card">
          <h1>Ой</h1>
          <p>Что-то пошло не так. Пришлите, пожалуйста, этот текст:</p>
          <pre className="error-text">{String(this.state.error?.stack || this.state.error)}</pre>
          <button className="primary" onClick={() => location.reload()}>
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}
