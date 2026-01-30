import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { nodeService } from '../services/nodeService';
import { minutesToTimeStr, timeStrToMinutes } from '../utils/time';

export const LogActivityModal = ({ isOpen, onClose, node, activityTypes, onSave }) => {
    const [typeId, setTypeId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [assessment, setAssessment] = useState(3);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);

    // History
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
            if (activityTypes.length > 0) {
                // Default to first type if not set or invalid
                if (!typeId || !activityTypes.find(t => t.id === typeId)) {
                    setTypeId(activityTypes[0].id);
                }
                // Reset form
                setValues({});
                setAssessment(3);
                setDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, activityTypes, node]); // Removing typeId dependency to avoid reset loops

    const loadHistory = async () => {
        if (!node) return;
        setLoadingHistory(true);
        try {
            const res = await nodeService.fetchActivitiesByNode(node.id, 5); // Limit to last 5
            setHistory(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const selectedType = activityTypes.find(t => t.id === typeId);

    const handleValueChange = (attrId, val) => {
        setValues(prev => ({ ...prev, [attrId]: val }));
    };

    const handleSubmit = async () => {
        if (!selectedType) return;
        setSaving(true);
        try {
            const processedValues = { ...values };

            // Validate & Convert
            for (const attr of selectedType.attributes) {
                const rawVal = processedValues[attr.id]; // Usign ID now

                // Check required
                if (!attr.isNullable && (rawVal === undefined || rawVal === '' || rawVal === null)) {
                    throw new Error(`Field "${attr.name}" is required`);
                }

                if (attr.dataType === 'number') {
                    if (rawVal !== '' && rawVal !== undefined) {
                        const num = Number(rawVal);
                        if (isNaN(num)) throw new Error(`"${attr.name}" must be a number`);
                        processedValues[attr.id] = num;
                    }
                } else if (attr.dataType === 'duration') {
                    // Expect "HH:MM" string, convert to minutes
                    if (rawVal) {
                        const mins = timeStrToMinutes(rawVal);
                        processedValues[attr.id] = mins;
                    }
                }
            }

            await nodeService.saveActivity({
                nodeId: node.id,
                typeId,
                date,
                selfAssessment: Number(assessment),
                values: processedValues
            });

            onSave();
            loadHistory(); // Refresh local history
            // Don't close immediately? User said "Users should see their previous data and add new data in the same modal view."
            // But usually submitting closes. Let's keep it open or notify success? 
            // "Action Section: Provide the 'New Entry' form" implies persistent view.
            // Let's reset the form but keep modal open, effectively "Add Another".
            // Or maybe just close. The user prompt says "It must open a comprehensive modal... Provide the 'New Entry' form... Users should see their previous data and add new data".
            // I'll clear values and show success toast (simulated) or just refresh history.
            setValues({});
            setAssessment(3);
            alert('Activity Logged!');
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const renderInput = (attr) => {
        const val = values[attr.id] || '';

        if (attr.dataType === 'duration') {
            return (
                <input
                    type="time"
                    step="60" // Dakika hassasiyeti için
                    value={val || '00:00'}
                    onChange={e => handleValueChange(attr.id, e.target.value)}
                    className="input"
                    required={!attr.isNullable}
                />
            );
        }



        if (attr.dataType === 'number') {
            return (
                <input
                    type="number"
                    value={val}
                    onChange={e => handleValueChange(attr.id, e.target.value)}
                    className="input"
                    required={!attr.isNullable}
                />
            );
        }

        return (
            <input
                type="text"
                value={val}
                onChange={e => handleValueChange(attr.id, e.target.value)}
                className="input"
                required={!attr.isNullable}
            />
        );
    };

    // Helper to render history row
    const renderHistoryItem = (act) => {
        const type = activityTypes.find(t => t.id === act.typeId);
        if (!type) return null;

        let summaryParts = [];
        type.attributes.forEach(attr => {
            let val = act.values[attr.id];
            // Fallback for legacy data using name keys?
            if (val === undefined) val = act.values[attr.name];

            if (val !== undefined && val !== null && val !== '') {
                if (attr.dataType === 'duration') val = minutesToTimeStr(val);
                summaryParts.push(`${attr.name}: ${val}`);
            }
        });

        return (
            <li key={act.id} className="activity__row">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{act.date} <span className="hint">— {type.name}</span></div>
                        <div className="hint" style={{ fontSize: 12 }}>{summaryParts.join(', ')}</div>
                    </div>
                    <div className="chip chip--tiny">Focus: {act.selfAssessment}/5</div>
                </div>
            </li>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            title="Activity Log"
            onCancel={onClose}
            onConfirm={handleSubmit}
            confirmLabel={saving ? 'Saving...' : 'Add Entry'}
            description={
                <div className="stack" style={{ gap: 20 }}>

                    {/* Recent History Section */}
                    <div className="card card--loose" style={{ background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                        <div className="card__title" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Logs</div>
                        {loadingHistory && <div className="hint">Loading history...</div>}
                        {!loadingHistory && history.length === 0 && <div className="hint">No recent activity.</div>}
                        <ul className="activity">
                            {history.map(renderHistoryItem)}
                        </ul>
                    </div>

                    <div className="separator" style={{ height: 1, background: 'var(--border)' }} />

                    {/* New Entry Form */}
                    <div className="form stack">
                        <div className="card__title" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Entry</div>

                        {/* Activity Type Selector */}
                        <div className="form__field">
                            <span>Activity Type</span>
                            <select
                                value={typeId}
                                onChange={e => {
                                    setTypeId(e.target.value);
                                    setValues({}); // Reset values on type change
                                }}
                            >
                                {activityTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Global Fields */}
                        <div className="row-spaced" style={{ display: 'flex', gap: 12 }}>
                            <div className="form__field" style={{ flex: 1 }}>
                                <span>Date</span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form__field" style={{ flex: 1 }}>
                                <span>Self Assessment (1-5)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                                    <input
                                        type="range"
                                        min="1" max="5" step="1"
                                        value={assessment}
                                        onChange={e => setAssessment(e.target.value)}
                                        style={{
                                            flex: 1,
                                            accentColor: 'var(--accent)',
                                            width: '100%',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{ fontWeight: 'bold' }}>{assessment}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Attributes */}
                        {selectedType?.attributes.map(attr => (
                            <div key={attr.id} className="form__field">
                                <span>{attr.name} {attr.isNullable && <span className="hint">(Optional)</span>}</span>
                                {renderInput(attr)}
                            </div>
                        ))}
                    </div>
                </div>
            }
        />
    );
};
