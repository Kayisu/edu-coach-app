import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { nodeService } from '../services/nodeService';
import { minutesToTimeStr, timeStrToMinutes, formatDate } from '../utils/time';

export const LogActivityModal = ({ isOpen, onClose, node, activityTypes, onSave }) => {
    const [typeId, setTypeId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [assessment, setAssessment] = useState(3);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

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

                // Strict Casting based on DataType
                if (attr.dataType === 'number') {
                    if (rawVal !== '' && rawVal !== undefined && rawVal !== null) {
                        const num = Number(rawVal);
                        if (isNaN(num)) throw new Error(`"${attr.name}" must be a valid number`);
                        processedValues[attr.id] = num;
                    }
                } else if (attr.dataType === 'duration') {
                    // Expect "HH:MM" string, convert to minutes
                    if (typeof rawVal === 'string' && rawVal.includes(':')) {
                        const mins = timeStrToMinutes(rawVal);
                        processedValues[attr.id] = mins;
                    } else if (typeof rawVal === 'number') {
                        processedValues[attr.id] = rawVal;
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

            // Show Success UI (user dismisses manually)
            setSuccess(true);
            setSaving(false);
            // Reset form for next entry
            setValues({});
            setAssessment(3);

        } catch (err) {
            alert(err.message);
            setSaving(false);
        }
    };

    const handleSuccessDismiss = () => {
        setSuccess(false);
        onSave();
        loadHistory();
        onClose();
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
                        <div style={{ fontWeight: 600 }}>{formatDate(act.date)} <span className="hint">— {type.name}</span></div>
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
            size="large"
            onCancel={onClose}
            onConfirm={handleSubmit}
            confirmLabel={saving ? 'Saving...' : 'Add Entry'}
            description={
                success ? (
                    <div style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 200, margin: '0 auto' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: 'var(--success)',
                            color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20
                        }}>
                            ✓
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Saved</div>
                        <button className="btn" onClick={handleSuccessDismiss} style={{ marginTop: 8 }}>OK</button>
                    </div>
                ) : (
                    <div className="stack" style={{ gap: 20 }}>
                        {/* Recent History Section */}
                        {history.length > 0 && (
                            <div className="card card--loose" style={{ background: 'var(--bg)', border: 'none', padding: 12 }}>
                                <div className="card__title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Recent Logs</div>
                                <ul className="activity">
                                    {history.map(renderHistoryItem)}
                                </ul>
                            </div>
                        )}

                        <div className="separator" style={{ height: 1, background: 'var(--border)' }} />

                        {/* New Entry Form */}
                        <div className="form stack">
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 38, width: '100%' }}>
                                        <div style={{ flex: 1, position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="range"
                                                min="1" max="5" step="1"
                                                value={assessment}
                                                onChange={e => setAssessment(e.target.value)}
                                            // Removed inline styles to let CSS take over
                                            />
                                        </div>
                                        <span style={{ fontWeight: 'bold', width: 20, textAlign: 'center' }}>{assessment}</span>
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
                )
            }
        />
    );
};
