import React, { useState } from 'react';
import { Modal } from './Modal';
import { nodeService } from '../services/nodeService';
import { useToast } from '../contexts/ToastContext';

// Sub-component for attributes to prevent re-render focus loss (Shared logic)
const AttributeRow = ({ attr, idx, updateAttr, removeAttr }) => {
    return (
        <div className="activity__row" style={{ padding: 8, gap: 8, flexWrap: 'wrap' }}>
            <div className="form__field" style={{ flex: 2, minWidth: 120 }}>
                <input
                    placeholder="Field Name"
                    value={attr.name}
                    onChange={e => updateAttr(idx, 'name', e.target.value)}
                />
            </div>
            <div className="form__field" style={{ flex: 1, minWidth: 90 }}>
                <select
                    value={attr.dataType}
                    onChange={e => updateAttr(idx, 'dataType', e.target.value)}
                >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="duration">Duration</option>
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={attr.isNullable}
                        onChange={e => updateAttr(idx, 'isNullable', e.target.checked)}
                    />
                    <span title="Can be empty?">Opt</span>
                </label>
                {(attr.dataType === 'number' || attr.dataType === 'duration') && (
                    <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={attr.isInverse}
                            onChange={e => updateAttr(idx, 'isInverse', e.target.checked)}
                        />
                        <span title="Negative Impact?">Inv</span>
                    </label>
                )}
                <button
                    className="icon-btn"
                    style={{ width: 24, height: 24, padding: 0, color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => removeAttr(idx)}
                    title="Remove Attribute"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

// Extracted Editor
const SimpleTypeEditor = ({ name, setName, attributes, updateAttr, removeAttr, addAttribute }) => (
    <div className="form stack">
        <p className="hint">Define a new activity category (e.g. "Reading", "Deep Work") to start logging.</p>
        <label className="form__field">
            <span>Type Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Type Name" autoFocus />
        </label>

        <div className="row-spaced" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontWeight: 600 }}>Attributes</span>
            <button className="chip chip--tiny" onClick={addAttribute}>+ Add Field</button>
        </div>

        <div className="stack" style={{ gap: 8 }}>
            {attributes.map((attr, idx) => (
                <AttributeRow
                    key={attr._tempId || idx}
                    attr={attr}
                    idx={idx}
                    updateAttr={updateAttr}
                    removeAttr={removeAttr}
                />
            ))}
        </div>
    </div>
);

export const CreateActivityTypeModal = ({ isOpen, onClose, onCreated }) => {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(false);

    const addAttribute = () => {
        setAttributes([...attributes, {
            _tempId: Math.random().toString(36).substr(2, 9),
            name: '',
            dataType: 'text',
            isNullable: false,
            isInverse: false
        }]);
    };

    const updateAttr = (idx, field, val) => {
        setAttributes(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };

    const removeAttr = (idx) => {
        setAttributes(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            addToast('Type name is required', 'error');
            return;
        }

        try {
            setLoading(true);
            await nodeService.saveActivityType({ name }, attributes);
            addToast('Activity type created successfully', 'success');
            onCreated();
            onClose();
        } catch (err) {
            console.error(err);
            addToast('Failed to create activity type', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            title="Create Activity Type"
            onCancel={onClose}
            onConfirm={handleSave}
            confirmLabel={loading ? 'Creating...' : 'Create Type'}
            description={
                <SimpleTypeEditor
                    name={name}
                    setName={setName}
                    attributes={attributes}
                    updateAttr={updateAttr}
                    removeAttr={removeAttr}
                    addAttribute={addAttribute}
                />
            }
        />
    );
};
