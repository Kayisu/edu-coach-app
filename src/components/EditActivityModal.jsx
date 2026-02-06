import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { nodeService } from '../services/nodeService';
import { minutesToTimeStr, timeStrToMinutes } from '../utils/time';
import { useToast } from '../contexts/ToastContext';

export const EditActivityModal = ({ isOpen, onClose, activity, activityTypes, onSave }) => {
    const { addToast } = useToast();
    const [typeId, setTypeId] = useState('');
    const [date, setDate] = useState('');
    const [values, setValues] = useState({});
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && activity) {
            setTypeId(activity.typeId);
            const dateStr = activity.date.includes('T') ? activity.date.split('T')[0] : activity.date;
            setDate(dateStr);
            setValues(activity.values || {});
            setErrors({});
        }
    }, [isOpen, activity]);

    const selectedType = activityTypes.find(t => t.id === typeId);

    const handleValueChange = (attrId, val) => {
        setValues(prev => ({ ...prev, [attrId]: val }));
        if (errors[attrId]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[attrId];
                return next;
            });
        }
    };

    const handleSubmit = async () => {
        if (!selectedType) return;

        const newErrors = {};
        const processedValues = { ...values };

        // Validate
        for (const attr of selectedType.attributes) {
            const rawVal = processedValues[attr.id];

            // Required check
            if (!attr.isNullable && (rawVal === undefined || rawVal === '' || rawVal === null)) {
                newErrors[attr.id] = `Field "${attr.name}" cannot be empty.`;
            }

            // Type conversion
            if (attr.dataType === 'number') {
                if (rawVal !== '' && rawVal !== undefined && rawVal !== null) {
                    const num = Number(rawVal);
                    if (isNaN(num)) newErrors[attr.id] = `"${attr.name}" must be a number`;
                    else processedValues[attr.id] = num;
                }
            } else if (attr.dataType === 'duration') {
                if (typeof rawVal === 'string' && rawVal.includes(':')) {
                    processedValues[attr.id] = timeStrToMinutes(rawVal);
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSaving(true);
        try {
            await nodeService.saveActivity({
                id: activity.id,
                nodeId: activity.nodeId,
                typeId,
                date,
                // selfAssessment removed
                values: processedValues
            });

            addToast('Activity updated successfully', 'success');
            setSaving(false);
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            addToast('Failed to update activity', 'error');
            setSaving(false);
        }
    };

    const renderInput = (attr) => {
        const val = values[attr.id] || '';
        const hasError = !!errors[attr.id];
        const style = hasError ? { borderColor: 'var(--danger)' } : {};

        let input = (
            <input
                type="text"
                value={val}
                onChange={e => handleValueChange(attr.id, e.target.value)}
                className="input"
                style={style}
            />
        );

        if (attr.dataType === 'duration') {
            input = (
                <input
                    type="time"
                    step="60"
                    value={val || '00:00'}
                    onChange={e => handleValueChange(attr.id, e.target.value)}
                    className="input"
                    style={style}
                />
            );
        } else if (attr.dataType === 'number') {
            input = (
                <input
                    type="number"
                    value={val}
                    onChange={e => handleValueChange(attr.id, e.target.value)}
                    className="input"
                    style={style}
                />
            );
        }

        return (
            <div className="stack" style={{ gap: 4 }}>
                {input}
                {hasError && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors[attr.id]}</span>}
            </div>
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
                    <div className="form__field">
                        <span>Activity Type</span>
                        <select
                            value={typeId}
                            onChange={e => {
                                setTypeId(e.target.value);
                                setValues({});
                                setErrors({});
                            }}
                            className="input"
                        >
                            {activityTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Self Assessment Removed */}

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
