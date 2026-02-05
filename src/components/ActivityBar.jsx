import React from 'react';
import { HomeIcon, CalendarIcon, ExplorerIcon } from '../assets/icons';

/**
 * ActivityBar Component
 * Fixed 64px vertical bar with module navigation icons.
 * Inspired by VS Code's activity bar.
 */
export const ActivityBar = ({ activeModule, onModuleChange, onToggleSideBar }) => {
    const buttons = [
        { id: 'home', icon: HomeIcon, label: 'Dashboard' },
        { id: 'calendar', icon: CalendarIcon, label: 'Weekly Grid' },
        { id: 'explorer', icon: ExplorerIcon, label: 'File Tree' },
    ];

    const handleClick = (id) => {
        if (id === 'explorer') {
            // Explorer toggles sidebar visibility when already active
            if (activeModule === 'explorer') {
                onToggleSideBar?.();
            } else {
                onModuleChange('explorer');
            }
        } else {
            onModuleChange(id);
        }
    };

    return (
        <nav className="activity-bar">
            {buttons.map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    className={`activity-bar__btn ${activeModule === id ? 'activity-bar__btn--active' : ''}`}
                    onClick={() => handleClick(id)}
                    title={label}
                    aria-label={label}
                >
                    <Icon size={22} />
                </button>
            ))}
        </nav>
    );
};
