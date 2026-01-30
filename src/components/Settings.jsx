import { ActivityTypeManager } from './ActivityTypeManager';

export const Settings = ({ theme, onThemeToggle }) => {
  return (
    <div className="settings">
      <div className="settings__section">
        <div className="settings__title">Appearance</div>
        <div className="settings__row">
          <div>
            <div className="settings__label">Theme</div>
            <div className="hint">Toggle between light and dark modes.</div>
          </div>
          <button className="chip" onClick={onThemeToggle}>
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>
      <ActivityTypeManager />
    </div>
  );
};
