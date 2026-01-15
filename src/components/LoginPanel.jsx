import { useState } from 'react';
import { authService } from '../services/authService';

export const LoginPanel = ({ onLogin }) => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await authService.login(identity, password);
      onLogin?.();
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth__card">
        <div className="card__title">Sign In</div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Email or username</span>
            <input value={identity} onChange={(e) => setIdentity(e.target.value)} required />
          </label>
          <label className="form__field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="form__error">{error}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
