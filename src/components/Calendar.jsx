import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { nodeService } from '../services/nodeService';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, SaveIcon, DeleteIcon, RenameIcon as EditIcon } from '../assets/icons';
import { Modal } from './Modal';
import { useToast } from '../contexts/ToastContext';

import { EditActivityModal } from './EditActivityModal';
import { WeeklyReviewModal } from './WeeklyReviewModal';

export const Calendar = ({ tree, treeLoading, onRefresh }) => {
    const [activities, setActivities] = useState([]);
    const [newRows, setNewRows] = useState({}); // { [weekKey]: [...rows] }
    const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());
    const [activityTypes, setActivityTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});
    const [addedWeeks, setAddedWeeks] = useState(new Set());
    const [showWeekPicker, setShowWeekPicker] = useState(false);

    // Delete/Edit/Review State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, activityId: null });
    const [editModal, setEditModal] = useState({ isOpen: false, activity: null, node: null });
    const [reviewModal, setReviewModal] = useState({ isOpen: false, weekStart: null });

    // ========================================
    // WEEK UTILITIES
    // ========================================

    const getMonday = useCallback((date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const formatWeekLabel = useCallback((start, end) => {
        const formatDate = (d) => {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}.${month}.${year}`;
        };
        return `${formatDate(start)} - ${formatDate(end)}`;
    }, []);

    const getWeekNumber = useCallback((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }, []);

    // Generate available weeks for picker (last 16 weeks)
    const availableWeeks = useMemo(() => {
        const weeks = [];
        const today = new Date();
        const currentMonday = getMonday(today);

        for (let i = 0; i < 16; i++) {
            const weekStart = new Date(currentMonday);
            weekStart.setDate(currentMonday.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            weeks.push({
                key: weekStart.toISOString().split('T')[0],
                start: weekStart,
                end: weekEnd,
                label: formatWeekLabel(weekStart, weekEnd),
                weekNumber: getWeekNumber(weekStart)
            });
        }
        return weeks;
    }, [getMonday, formatWeekLabel, getWeekNumber]);

    // Active weeks shown in the list
    const activeWeeks = useMemo(() => {
        const weekSet = new Map();

        // Add weeks from existing activities
        activities.forEach(act => {
            // Parse date string safely to avoid timezone issues
            const dateParts = act.date.split('-');
            const actDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            const weekStart = getMonday(actDate);
            const key = weekStart.toISOString().split('T')[0];
            if (!weekSet.has(key)) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekSet.set(key, {
                    key,
                    start: weekStart,
                    end: weekEnd,
                    label: formatWeekLabel(weekStart, weekEnd),
                    weekNumber: getWeekNumber(weekStart)
                });
            }
        });

        // Add manually added weeks from picker
        addedWeeks.forEach(key => {
            if (!weekSet.has(key)) {
                const week = availableWeeks.find(w => w.key === key);
                if (week) weekSet.set(key, week);
            }
        });

        // Always include current week
        const currentKey = availableWeeks[0]?.key;
        if (currentKey && !weekSet.has(currentKey)) {
            weekSet.set(currentKey, availableWeeks[0]);
        }

        return Array.from(weekSet.values()).sort((a, b) =>
            new Date(b.key) - new Date(a.key)
        );
    }, [activities, addedWeeks, availableWeeks, getMonday, formatWeekLabel, getWeekNumber]);

    // ========================================
    // HIERARCHICAL NODE HELPERS
    // ========================================

    const buildNodePath = useCallback((nodeId) => {
        const findPath = (nodes, targetId, currentPath) => {
            for (const node of nodes) {
                if (node.id === targetId) {
                    return [...currentPath, node];
                }
                if (node.children?.length) {
                    const found = findPath(node.children, targetId, [...currentPath, node]);
                    if (found) return found;
                }
            }
            return null;
        };
        return findPath(tree, nodeId, []) || [];
    }, [tree]);

    const getChildrenAtLevel = useCallback((parentId = null) => {
        if (!parentId) {
            return tree.filter(n => n.type === 'FOLDER');
        }

        const findNode = (nodes) => {
            for (const n of nodes) {
                if (n.id === parentId) return n;
                if (n.children?.length) {
                    const found = findNode(n.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findNode(tree);
        return parent?.children || [];
    }, [tree]);

    // ========================================
    // ACTIVITY GROUPING
    // ========================================

    const activitiesByWeek = useMemo(() => {
        const grouped = {};
        activeWeeks.forEach(w => { grouped[w.key] = []; });

        activities.forEach(act => {
            // Parse date string safely to avoid timezone issues
            // act.date might be '2026-02-03' - parse as local date, not UTC
            const dateParts = act.date.split('-');
            const actDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            const weekStart = getMonday(actDate);
            const key = weekStart.toISOString().split('T')[0];
            if (grouped[key]) {
                grouped[key].push(act);
            }
        });

        Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => new Date(b.date) - new Date(a.date));
        });

        return grouped;
    }, [activities, activeWeeks, getMonday]);

    // ========================================
    // DATA LOADING
    // ========================================

    useEffect(() => {
        if (!treeLoading) {
            loadData();
        }
    }, [treeLoading, tree]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [types, acts] = await Promise.all([
                nodeService.fetchActivityTypes(),
                fetchAllActivities()
            ]);
            setActivityTypes(types);
            setActivities(acts);
        } catch (err) {
            console.error('Failed to load ledger data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllActivities = async () => {
        const leafNodes = [];
        const stack = [...tree];
        while (stack.length) {
            const node = stack.pop();
            if (node.type === 'LEAF') leafNodes.push(node);
            if (node.children?.length) stack.push(...node.children);
        }

        const allActs = [];
        for (const leaf of leafNodes) {
            try {
                const acts = await nodeService.fetchActivitiesByNode(leaf.id, 100);
                const path = buildNodePath(leaf.id);
                acts.forEach(a => allActs.push({
                    ...a,
                    nodeName: leaf.name,
                    nodePath: path.map(n => n.name).join(' > '),
                    pathNodes: path
                }));
            } catch (err) {
                console.error(`Failed to fetch activities for ${leaf.name}:`, err);
            }
        }
        return allActs;
    };

    // ========================================
    // WEEK & ROW MANAGEMENT
    // ========================================

    const handleAddWeek = (weekKey) => {
        if (weekKey) {
            setAddedWeeks(prev => new Set([...prev, weekKey]));
            // Expand the newly added week
            setCollapsedWeeks(prev => {
                const next = new Set(prev);
                next.delete(weekKey);
                return next;
            });
            // Add an empty row to start entering data
            addNewRow(weekKey);
        }
    };

    const toggleWeek = (weekKey) => {
        setCollapsedWeeks(prev => {
            const next = new Set(prev);
            if (next.has(weekKey)) next.delete(weekKey);
            else next.add(weekKey);
            return next;
        });
    };

    const addNewRow = (weekKey) => {
        const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setNewRows(prev => ({
            ...prev,
            [weekKey]: [...(prev[weekKey] || []), {
                tempId,
                nodePath: [],
                leafId: '',
                typeId: '',
                values: {},
                // focus removed
            }]
        }));
    };

    const updateNewRow = (weekKey, tempId, updates) => {
        setNewRows(prev => ({
            ...prev,
            [weekKey]: (prev[weekKey] || []).map(row =>
                row.tempId === tempId ? { ...row, ...updates } : row
            )
        }));
    };

    const removeNewRow = (weekKey, tempId) => {
        setNewRows(prev => ({
            ...prev,
            [weekKey]: (prev[weekKey] || []).filter(row => row.tempId !== tempId)
        }));
    };

    const { addToast } = useToast();

    // ...

    const saveNewRow = async (weekKey, row) => {
        const errors = {};
        if (!row.leafId) errors.leafId = true;
        if (!row.typeId) errors.typeId = true;

        const type = getActivityType(row.typeId);
        if (type && type.attributes) {
            for (const attr of type.attributes) {
                if (!attr.isNullable) {
                    const val = row.values[attr.id];
                    if (val === undefined || val === '' || val === null) {
                        errors[attr.id] = true;
                    }
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            updateNewRow(weekKey, row.tempId, { errors });
            return;
        }

        setSaving(prev => ({ ...prev, [row.tempId]: true }));
        try {
            const dateParts = weekKey.split('-');
            const monday = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            monday.setDate(monday.getDate() + 3);
            const middleDate = monday.toISOString().split('T')[0];

            await nodeService.saveActivity({
                nodeId: row.leafId,
                typeId: row.typeId,
                date: middleDate,
                // selfAssessment removed
                values: row.values
            });

            removeNewRow(weekKey, row.tempId);
            const acts = await fetchAllActivities();
            setActivities(acts);
            addToast('Activity logged successfully', 'success');
            onRefresh?.();
        } catch (err) {
            console.error(err);
            addToast('Failed to log activity', 'error');
        } finally {
            setSaving(prev => ({ ...prev, [row.tempId]: false }));
        }
    };

    const getActivityType = (typeId) => activityTypes.find(t => t.id === typeId);

    // ========================================
    // DELETE HANDLING
    // ========================================

    const handleDeleteClick = (activityId) => {
        setDeleteModal({ isOpen: true, activityId });
    };

    const confirmDelete = async () => {
        if (!deleteModal.activityId) return;

        try {
            await nodeService.deleteActivity(deleteModal.activityId);
            setActivities(prev => prev.filter(a => a.id !== deleteModal.activityId));
            setDeleteModal({ isOpen: false, activityId: null });
            addToast('Activity deleted', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to delete activity', 'error');
        }
    };

    const handleEditClick = (activity) => {
        // Need to reconstruct the bare minimum node object for the modal
        // activity.nodeId is available
        // We can pass the node ID and let the modal handle it, or pass a mock node object
        // The modal expects { id, name } mainly for history fetching.

        // Find node in tree? Expensive. Simple object is enough for now as Modal fetches data by ID.
        setEditModal({
            isOpen: true,
            activity: activity,
            node: { id: activity.nodeId }
        });
    };

    // ========================================
    // NODE PATH SELECTOR COMPONENT
    // ========================================

    const NodePathSelector = ({ row, weekKey }) => {
        const path = row.nodePath || [];

        // Build display path from IDs
        const displayPath = path.map(id => {
            const findNode = (nodes) => {
                for (const n of nodes) {
                    if (n.id === id) return n;
                    if (n.children?.length) {
                        const found = findNode(n.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            return findNode(tree);
        }).filter(Boolean);

        const handleSelect = (level, nodeId, isLeaf) => {
            const newPath = [...path.slice(0, level), nodeId];
            updateNewRow(weekKey, row.tempId, {
                nodePath: newPath,
                leafId: isLeaf ? nodeId : ''
            });
        };

        // Get options for each level
        const levels = [];
        let currentParent = null;

        for (let i = 0; i <= path.length; i++) {
            const children = getChildrenAtLevel(currentParent);
            if (children.length > 0) {
                levels.push({ index: i, options: children, selectedId: path[i] });
            }
            currentParent = path[i];
            if (!currentParent) break;
        }

        return (
            <div className="node-selector">
                {/* Breadcrumb display */}
                {displayPath.length > 0 && (
                    <div className="node-selector__breadcrumb">
                        {displayPath.map((node, idx) => (
                            <span key={node.id} className="node-selector__segment">
                                <span className={`node-selector__badge ${node.type === 'LEAF' ? 'node-selector__badge--leaf' : ''}`}>
                                    {node.name}
                                </span>
                                {idx < displayPath.length - 1 && <span className="node-selector__arrow">›</span>}
                            </span>
                        ))}
                    </div>
                )}

                {/* Cascading dropdowns */}
                <div className="node-selector__dropdowns">
                    {levels.map((level, idx) => {
                        const isLast = idx === levels.length - 1;
                        if (displayPath[idx] && !isLast) return null;

                        return (
                            <select
                                key={idx}
                                className="node-selector__select"
                                value={level.selectedId || ''}
                                onChange={(e) => {
                                    const selectedNode = level.options.find(n => n.id === e.target.value);
                                    handleSelect(idx, e.target.value, selectedNode?.type === 'LEAF');
                                    // Clear error if any
                                    if (row.errors?.leafId) updateNewRow(weekKey, row.tempId, { errors: { ...row.errors, leafId: false } });
                                }}
                                style={row.errors?.leafId ? { borderColor: 'var(--danger)' } : {}}
                            >
                                <option value="">
                                    {idx === 0 ? 'Select category...' : 'Select...'}
                                </option>
                                {level.options.map(opt => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.type === 'LEAF' ? '📄 ' : '📁 '}{opt.name}
                                    </option>
                                ))}
                            </select>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="ledger">
                <div className="hint">Loading activity ledger...</div>
            </div>
        );
    }

    return (
        <div className="ledger" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <header className="ledger__header">
                <h1 className="ledger__title">Activity Ledger</h1>
                <p className="ledger__subtitle">Hierarchical log of study sessions by week</p>
            </header>

            {/* Week Groups */}
            <div className="ledger__content">
                {activeWeeks.map(week => {
                    const isCollapsed = collapsedWeeks.has(week.key);
                    const weekActivities = activitiesByWeek[week.key] || [];
                    const weekNewRows = newRows[week.key] || [];
                    const totalCount = weekActivities.length + weekNewRows.length;

                    return (
                        <div key={week.key} className="ledger__week">
                            {/* Week Header */}
                            <div className="ledger__week-header" onClick={() => toggleWeek(week.key)}>
                                <span className="ledger__week-chevron">
                                    {isCollapsed ? <ChevronRightIcon size={16} /> : <ChevronDownIcon size={16} />}
                                </span>
                                <span className="ledger__week-label">{week.label}</span>
                                <span className="ledger__week-badge">Week {week.weekNumber}</span>
                                <span className="ledger__week-count">{totalCount} entries</span>
                                <div className="ledger__week-actions">
                                    <button
                                        className="ledger__review-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setReviewModal({ isOpen: true, weekStart: week.key });
                                        }}
                                    >
                                        ★ Make a self assessment
                                    </button>
                                    <button
                                        className="ledger__add-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addNewRow(week.key);
                                        }}
                                    >
                                        <PlusIcon size={12} /> Add Activity
                                    </button>
                                </div>
                            </div>

                            {/* Week Body */}
                            {!isCollapsed && (
                                <div className="ledger__week-body">
                                    {weekActivities.length === 0 && weekNewRows.length === 0 && (
                                        <div className="ledger__empty">No activities this week</div>
                                    )}

                                    {/* Existing Activities */}
                                    {weekActivities.map(act => {
                                        const type = getActivityType(act.typeId);
                                        return (
                                            <div key={act.id} className="ledger__row ledger__row--saved">
                                                <div className="ledger__cell ledger__cell--path">
                                                    <span className="ledger__path-text">{act.nodePath}</span>
                                                </div>
                                                <div className="ledger__cell ledger__cell--type">
                                                    <span className="badge badge--type">{type?.name || 'Unknown'}</span>
                                                </div>
                                                <div className="ledger__cell ledger__cell--attrs">
                                                    {type?.attributes?.map(attr => {
                                                        const val = act.values?.[attr.id] || act.values?.[attr.name];
                                                        if (!val) return null;
                                                        return (
                                                            <span key={attr.id} className="ledger__attr-chip">
                                                                {attr.name}: {val}
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                <div className="ledger__cell ledger__cell--actions">
                                                    <button
                                                        className="ledger__action-btn"
                                                        title="Edit"
                                                        onClick={() => handleEditClick(act)}
                                                    >
                                                        <EditIcon size={14} />
                                                    </button>
                                                    <button
                                                        className="ledger__action-btn ledger__action-btn--delete"
                                                        title="Delete"
                                                        onClick={() => handleDeleteClick(act.id)}
                                                    >
                                                        <DeleteIcon size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* New Rows */}
                                    {weekNewRows.map(row => (
                                        <div key={row.tempId} className="ledger__row ledger__row--new">
                                            <div className="ledger__cell ledger__cell--path-select">
                                                <NodePathSelector row={row} weekKey={week.key} />
                                            </div>
                                            <div className="ledger__cell ledger__cell--type">
                                                <select
                                                    className="ledger__select"
                                                    value={row.typeId}
                                                    onChange={e => updateNewRow(week.key, row.tempId, { typeId: e.target.value, values: {} })}
                                                >
                                                    <option value="">Select type...</option>
                                                    {activityTypes.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="ledger__cell ledger__cell--attrs">
                                                {row.typeId && getActivityType(row.typeId)?.attributes?.map(attr => (
                                                    <input
                                                        key={attr.id}
                                                        type={attr.dataType === 'number' ? 'number' : 'text'}
                                                        className="ledger__input"
                                                        placeholder={`${attr.name}${attr.isNullable ? '' : '*'}`}
                                                        value={row.values[attr.id] || ''}
                                                        onChange={e => updateNewRow(week.key, row.tempId, {
                                                            values: { ...row.values, [attr.id]: e.target.value }
                                                        })}
                                                    />
                                                ))}
                                            </div>
                                            <div className="ledger__cell ledger__cell--actions">
                                                <button
                                                    className="ledger__action-btn ledger__action-btn--save"
                                                    onClick={() => saveNewRow(week.key, row)}
                                                    disabled={saving[row.tempId]}
                                                >
                                                    <SaveIcon size={14} />
                                                </button>
                                                <button
                                                    className="ledger__action-btn ledger__action-btn--delete"
                                                    onClick={() => removeNewRow(week.key, row.tempId)}
                                                >
                                                    <DeleteIcon size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer - Week Picker */}
            <footer className="ledger__footer">
                <span className="ledger__record-count">{activities.length} records</span>
                <div className="ledger__week-picker-wrapper">
                    <button
                        className="ledger__week-picker-btn"
                        onClick={() => setShowWeekPicker(!showWeekPicker)}
                    >
                        <PlusIcon size={14} />
                        Add Week
                        <ChevronDownIcon size={14} />
                    </button>
                    {showWeekPicker && (
                        <div className="ledger__week-picker-dropdown">
                            {availableWeeks
                                .filter(w => !activeWeeks.some(aw => aw.key === w.key))
                                .map(w => (
                                    <button
                                        key={w.key}
                                        className="ledger__week-picker-item"
                                        onClick={() => {
                                            handleAddWeek(w.key);
                                            setShowWeekPicker(false);
                                        }}
                                    >
                                        <span className="ledger__week-picker-item-label">
                                            Week {w.weekNumber}
                                        </span>
                                        <span className="ledger__week-picker-item-date">
                                            {w.label}
                                        </span>
                                    </button>
                                ))}
                            {availableWeeks.filter(w => !activeWeeks.some(aw => aw.key === w.key)).length === 0 && (
                                <div className="ledger__week-picker-empty">All weeks already added</div>
                            )}
                        </div>
                    )}
                </div>
            </footer>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                title="Delete Activity"
                description="Are you sure you want to delete this activity? This action cannot be undone."
                variant="danger"
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ isOpen: false, activityId: null })}
            />


            {/* Edit Modal */}
            {editModal.isOpen && (
                <EditActivityModal
                    isOpen={editModal.isOpen}
                    onClose={() => setEditModal({ isOpen: false, activity: null, node: null })}
                    activity={editModal.activity}
                    activityTypes={activityTypes}
                    onSave={async () => {
                        const acts = await fetchAllActivities();
                        setActivities(acts);
                        onRefresh?.();
                    }}
                />
            )}

            {/* Weekly Review Modal */}
            <WeeklyReviewModal
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal({ isOpen: false, weekStart: null })}
                weekStart={reviewModal.weekStart}
                tree={tree} // Pass tree for dropdown
            />
        </div>
    );
};
