import React, { useState, useEffect } from 'react';
import { nodeService } from '../services/nodeService';
import { Modal } from './Modal';

// Sub-component for attributes to prevent re-render focus loss
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

// Extracted Editor Component to fix focus issues
const ActivityTypeEditor = ({ formName, setFormName, formAttrs, updateAttr, removeAttr, addAttribute }) => {
    return (
        <div className="form stack">
            <label className="form__field">
                <span>Type Name</span>
                <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g., Reading, Coding, Workout"
                    autoFocus
                />
            </label>

            <div className="row-spaced" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Attributes</div>
                <button className="chip chip--tiny" onClick={addAttribute}>+ Add Field</button>
            </div>

            <div className="stack" style={{ gap: 8 }}>
                {formAttrs.length === 0 && <div className="hint">No custom attributes.</div>}
                {formAttrs.map((attr, idx) => (
                    <AttributeRow
                        key={attr._tempId || attr.id || idx} // Prefer unique ID
                        attr={attr}
                        idx={idx}
                        updateAttr={updateAttr}
                        removeAttr={removeAttr}
                    />
                ))}
            </div>
        </div>
    );
};

export const ActivityTypeManager = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null); // null = new

    // Form State
    const [formName, setFormName] = useState('');
    const [formAttrs, setFormAttrs] = useState([]);

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        setLoading(true);
        try {
            const res = await nodeService.fetchActivityTypes();
            setTypes(res);
        } catch (err) {
            setError(err.message || 'Failed to load types');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (type) => {
        setEditingType(type);
        setFormName(type.name);
        // Deep copy attributes to avoid mutating original state before save
        // Ensure some unique ID for key if possible, use _tempId if new
        setFormAttrs(type.attributes.map(a => ({ ...a, _tempId: a.id || Math.random().toString(36).substr(2, 9) })));
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingType(null);
        setFormName('');
        setFormAttrs([]);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this Activity Type?')) return;
        try {
            await nodeService.deleteActivityType(id);
            loadTypes();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            alert('Type Name is required');
            return;
        }

        // Validate duplicates in attributes
        const names = formAttrs.map(a => a.name.trim().toLowerCase());
        if (new Set(names).size !== names.length) {
            alert('Attribute names must be unique');
            return;
        }
        if (formAttrs.some(a => !a.name.trim())) {
            alert('All attributes must have a name');
            return;
        }

        try {
            const payloadType = {
                id: editingType?.id,
                name: formName
            };
            await nodeService.saveActivityType(payloadType, formAttrs);
            setIsModalOpen(false);
            loadTypes();
        } catch (err) {
            alert(err.message);
        }
    };

    // Attribute Helpers
    const addAttribute = () => {
        setFormAttrs([...formAttrs, {
            _tempId: Math.random().toString(36).substr(2, 9),
            id: '',
            name: '',
            dataType: 'text',
            isNullable: false,
            isInverse: false
        }]);
    };

    const updateAttr = (idx, field, val) => {
        // Correctly update state using map
        setFormAttrs(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };

    const removeAttr = (idx) => {
        setFormAttrs(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="settings__section">
            <div className="settings__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Activity Types</span>
                <button className="chip chip--accent" onClick={handleCreate}>+ New Type</button>
            </div>

            {loading && <div className="hint">Loading...</div>}
            {error && <div className="form__error">{error}</div>}

            <div className="stack">
                {!loading && types.length === 0 && <div className="empty">No activity types defined.</div>}
                {types.map(t => (
                    <div key={t.id} className="activity__row">
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="chip chip--tiny" onClick={() => handleEdit(t)}>Edit</button>
                            <button className="chip chip--tiny chip--ghost" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(t.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                title={editingType ? 'Edit Activity Type' : 'Create Activity Type'}
                onCancel={() => setIsModalOpen(false)}
                onConfirm={handleSave}
                confirmLabel="Save Type"
                description={
                    <ActivityTypeEditor
                        formName={formName}
                        setFormName={setFormName}
                        formAttrs={formAttrs}
                        updateAttr={updateAttr}
                        removeAttr={removeAttr}
                        addAttribute={addAttribute}
                    />
                }
            />
        </div>
    );
};
