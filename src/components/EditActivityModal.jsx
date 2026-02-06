import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { nodeService } from '../services/nodeService';
import { minutesToTimeStr, timeStrToMinutes } from '../utils/time';

export const EditActivityModal = ({ isOpen, onClose, activity, activityTypes, onSave }) => {
    const [typeId, setTypeId] = useState('');
    const [date, setDate] = useState('');
    const [assessment, setAssessment] = useState(3);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && activity) {
            // Load activity data
            setTypeId(activity.typeId);
            // Handle date string (take YYYY-MM-DD part)
            const dateStr = activity.date.includes('T') ? activity.date.split('T')[0] : activity.date;
            setDate(dateStr);
            setAssessment(activity.selfAssessment || 3);
            setValues(activity.values || {});
        }
    }, [isOpen, activity]);

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
                const rawVal = processedValues[attr.id];

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
                id: activity.id,
                nodeId: activity.nodeId,
                typeId, // Usually we don't change type on edit, but allowing it for flexibility
                date,
                selfAssessment: Number(assessment),
                values: processedValues
            });

            setSaving(false);
            onSave(); // Parent handles refresh
            onClose();

        } catch (err) {
            alert(err.message);
            setSaving(false);
        }
    };

    const renderInput = (attr) => {
        const val = values[attr.id] || '';

        if (attr.dataType === 'duration') {
            return (
                <input
                    type="time"
                    step="60"
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

    if (!activity) return null;

    return (
        <Modal
            isOpen={isOpen}
            title="Edit Activity"
            size="medium"
            onCancel={onClose}
            onConfirm={handleSubmit}
            confirmLabel={saving ? 'Updating...' : 'Update'}
            description={
                <div className="form stack" style={{ marginTop: 10 }}>
                    {/* Activity Type - Disabled/Readonly or Selectable? 
                        Ideally selectable, but changing type might invalidate values. 
                        Let's keep it selectable but be aware values might match poorly.
                    */}
                    <div className="form__field">
                        <span>Activity Type</span>
                        <select
                            value={typeId}
                            onChange={e => {
                                setTypeId(e.target.value);
                                setValues({}); // Reset values on type change to avoid partial mismatch
                            }}
                            className="input"
                        >
                            {activityTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Global Fields */}
                    <div className="row-spaced" style={{ display: 'flex', gap: 12 }}>

                        <div className="form__field" style={{ flex: 1 }}>
                            <span>Self Assessment (1-5)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 38, width: '100%' }}>
                                <div style={{ flex: 1, position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="range"
                                        min="1" max="5" step="1"
                                        value={assessment}
                                        onChange={e => setAssessment(e.target.value)}
                                        style={{ width: '100%' }}
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
            }
        />
    );
};
