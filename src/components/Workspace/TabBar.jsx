import React from 'react';
import { Link } from 'react-router-dom';

/**
 * TabBar Component
 * Renders a horizontal list of open tabs.
 * @param {Object} props
 * @param {Array} props.tabs - Array of node objects
 * @param {string} props.activeTabId - ID of the currently active tab
 * @param {Function} props.onTabClick - (node) => void
 * @param {Function} props.onTabClose - (nodeId, e) => void
 */
export const TabBar = ({ tabs, activeTabId, onTabClick, onTabClose }) => {
    return (
        <div className="tab-bar">
            {tabs.map(node => {
                const isActive = node.id === activeTabId;
                // Determine icon based on type
                const icon = node.type === 'FOLDER' ? '📁' : '📝';

                return (
                    <div
                        key={node.id}
                        className={`tab ${isActive ? 'tab--active' : ''}`}
                    // onClick removed in favor of Link
                    >
                        <Link
                            to={`/workspace/${node.id}`}
                            className="tab__link"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs, 6px)',
                                textDecoration: 'none',
                                color: 'inherit',
                                flex: 1,
                                height: '100%',
                                paddingLeft: '8px'
                            }}
                        >
                            <span className="tab__icon">{icon}</span>
                            <span className="tab__label">{node.name}</span>
                        </Link>
                        <button
                            className="tab__close"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onTabClose(node.id);
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
