import React from 'react';

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
                const icon = node.type === 'FOLDER' ? '📁' : '📝'; // Simple text icons for now, can be SVGs

                return (
                    <div
                        key={node.id}
                        className={`tab ${isActive ? 'tab--active' : ''}`}
                        onClick={() => onTabClick(node)}
                    >
                        <span className="tab__icon">{icon}</span>
                        <span className="tab__label">{node.name}</span>
                        <button
                            className="tab__close"
                            onClick={(e) => {
                                e.stopPropagation();
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
