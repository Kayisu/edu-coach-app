import { useState } from 'react';
import { authService } from '../services/authService';

export const AppHeader = ({ title, user, onLogout = authService.logout, onThemeToggle, onOpenSettings }) => {
  const [open, setOpen] = useState(false);
  const initial = user?.email?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U';

  return (
    <header className="app-header">
      <div className="app-header__title">{title}</div>
      <div className="app-header__user">
        <div className="user-menu">
          <button className="avatar" onClick={() => setOpen((v) => !v)}>
            {initial}
          </button>
          {open && (
            <div className="user-menu__dropdown">
              {onOpenSettings && (
                <button className="user-menu__item" onClick={() => { setOpen(false); onOpenSettings(); }}>Settings</button>
              )}
              {onThemeToggle && (
                <button className="user-menu__item" onClick={() => { setOpen(false); onThemeToggle(); }}>
                  Toggle Theme
                </button>
              )}
              <button className="user-menu__item" onClick={onLogout}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
