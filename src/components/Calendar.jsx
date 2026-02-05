import React, { useEffect, useMemo, useState } from 'react';
import { nodeService } from '../services/nodeService';

/**
 * Calendar Module - Weekly Batch Entry Grid
 * Excel-like grid for quick Duration:Focus logging across the week.
 */
export const Calendar = ({ tree, onRefresh }) => {
    const [selectedParentId, setSelectedParentId] = useState('');
    const [entries, setEntries] = useState({}); // { [nodeId-dayIndex]: { duration: string, focus: number } }
    const [saving, setSaving] = useState(false);
    const [activityTypes, setActivityTypes] = useState([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');

    // Get all folders for parent selection
    const folders = useMemo(() => {
        const result = [];
        const stack = [...tree];
        while (stack.length) {
            const node = stack.pop();
            if (node.type === 'FOLDER') {
                result.push(node);
                if (node.children?.length) stack.push(...node.children);
            }
        }
        return result.sort((a, b) => a.path.localeCompare(b.path));
    }, [tree]);

    // Get leaf children of selected parent
    const leafNodes = useMemo(() => {
        if (!selectedParentId) return [];
        const findNode = (nodes, id) => {
            for (const n of nodes) {
                if (n.id === id) return n;
                if (n.children?.length) {
                    const found = findNode(n.children, id);
                    if (found) return found;
                }
            }
            return null;
        };
        const parent = findNode(tree, selectedParentId);
        return parent?.children?.filter(n => n.type === 'LEAF') || [];
    }, [tree, selectedParentId]);

    // Get current week dates (Mon-Sun)
    const weekDates = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        // Adjust to Monday (Sunday = 0, so we go back 6 days; Monday = 1, go back 0)
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        monday.setDate(today.getDate() - diff);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d);
        }
        return dates;
    }, []);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Load activity types on mount
    useEffect(() => {
        loadActivityTypes();
    }, []);

    const loadActivityTypes = async () => {
        try {
            const types = await nodeService.fetchActivityTypes();
            setActivityTypes(types);
            if (types.length > 0 && !selectedTypeId) {
                setSelectedTypeId(types[0].id);
            }
        } catch (err) {
            console.error('Failed to load activity types:', err);
        }
    };

    const handleCellChange = (nodeId, dayIndex, value) => {
        const key = `${nodeId}-${dayIndex}`;

        // Parse input: expect "HH:MM:Focus" or just minutes
        const parsed = parseEntry(value);

        setEntries(prev => ({
            ...prev,
            [key]: { raw: value, ...parsed }
        }));
    };

    const parseEntry = (value) => {
        if (!value || !value.trim()) return { duration: 0, focus: 3 };

        // Format: "2:30:4" = 2h30m with focus 4
        // Or: "90:4" = 90 minutes with focus 4
        // Or: "90" = 90 minutes with default focus 3
        const parts = value.split(':').map(p => p.trim());

        if (parts.length === 3) {
            // HH:MM:Focus
            const hours = parseInt(parts[0], 10) || 0;
            const minutes = parseInt(parts[1], 10) || 0;
            const focus = Math.min(5, Math.max(1, parseInt(parts[2], 10) || 3));
            return { duration: hours * 60 + minutes, focus };
        } else if (parts.length === 2) {
            // MM:Focus or HH:MM
            const first = parseInt(parts[0], 10) || 0;
            const second = parseInt(parts[1], 10) || 0;
            // If second is <= 5, assume it's focus
            if (second <= 5 && second >= 1) {
                return { duration: first, focus: second };
            }
            // Otherwise, treat as HH:MM with default focus
            return { duration: first * 60 + second, focus: 3 };
        } else {
            // Just minutes
            const minutes = parseInt(parts[0], 10) || 0;
            return { duration: minutes, focus: 3 };
        }
    };

    const handleBatchSave = async () => {
        if (!selectedTypeId) {
            alert('Please select an activity type first.');
            return;
        }

        const activities = [];

        for (const [key, entry] of Object.entries(entries)) {
            if (!entry.duration || entry.duration <= 0) continue;

            const [nodeId, dayIndexStr] = key.split('-');
            const dayIndex = parseInt(dayIndexStr, 10);
            const date = weekDates[dayIndex];

            if (!date || !nodeId) continue;

            activities.push({
                nodeId,
                typeId: selectedTypeId,
                date: date.toISOString().split('T')[0],
                selfAssessment: entry.focus || 3,
                values: {
                    duration: entry.duration
                }
            });
        }

        if (activities.length === 0) {
            alert('No entries to save. Enter duration values first.');
            return;
        }

        setSaving(true);
        try {
            // Save each activity
            for (const activity of activities) {
                await nodeService.saveActivity(activity);
            }

            // Clear entries after successful save
            setEntries({});
            onRefresh?.();
            alert(`Saved ${activities.length} activities successfully!`);
        } catch (err) {
            alert(err?.message || 'Failed to save activities');
        } finally {
            setSaving(false);
        }
    };

    const getCellValue = (nodeId, dayIndex) => {
        const key = `${nodeId}-${dayIndex}`;
        return entries[key]?.raw || '';
    };

    return (
        <div className="calendar">
            <header className="calendar__header">
                <h1 className="calendar__title">Weekly Grid</h1>
                <p className="calendar__subtitle">
                    Batch log your sessions for the week. Format: <code>HH:MM:Focus</code> or <code>Minutes:Focus</code>
                </p>
            </header>

            <div className="calendar__controls">
                <div className="calendar__control">
                    <label>Parent Folder:</label>
                    <select
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        className="calendar__select"
                    >
                        <option value="">Select a folder...</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.path}</option>
                        ))}
                    </select>
                </div>

                <div className="calendar__control">
                    <label>Activity Type:</label>
                    <select
                        value={selectedTypeId}
                        onChange={(e) => setSelectedTypeId(e.target.value)}
                        className="calendar__select"
                    >
                        <option value="">Select type...</option>
                        {activityTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedParentId && leafNodes.length === 0 && (
                <div className="hint" style={{ marginTop: 16 }}>
                    No leaf topics found in this folder. Add topics in the Explorer first.
                </div>
            )}

            {leafNodes.length > 0 && (
                <>
                    <div className="calendar__grid-wrapper">
                        <table className="calendar__grid">
                            <thead>
                                <tr>
                                    <th className="calendar__topic-header">Topic</th>
                                    {weekDates.map((date, i) => (
                                        <th key={i} className="calendar__day-header">
                                            <div className="calendar__day-label">{dayLabels[i]}</div>
                                            <div className="calendar__day-date">
                                                {date.getDate()}/{date.getMonth() + 1}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {leafNodes.map(node => (
                                    <tr key={node.id}>
                                        <td className="calendar__topic-cell">{node.name}</td>
                                        {weekDates.map((_, dayIndex) => (
                                            <td key={dayIndex} className="calendar__input-cell">
                                                <input
                                                    type="text"
                                                    className="calendar__input"
                                                    placeholder="0:0:3"
                                                    value={getCellValue(node.id, dayIndex)}
                                                    onChange={(e) => handleCellChange(node.id, dayIndex, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="calendar__actions">
                        <button
                            className="btn btn--primary"
                            onClick={handleBatchSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Batch Save Week'}
                        </button>
                        <span className="hint" style={{ marginLeft: 12 }}>
                            {Object.keys(entries).filter(k => entries[k]?.duration > 0).length} entries ready
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};
