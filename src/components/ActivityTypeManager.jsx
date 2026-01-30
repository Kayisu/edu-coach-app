import React, { useState, useEffect } from 'react';
import { nodeService } from '../services/nodeService';
import { Modal } from './Modal';
import { useDeleteConfirm } from '../hooks/useDeleteConfirm';

// Sub-component for attributes to prevent re-render focus loss
const AttributeRow = ({ attr, updateAttr, requestDeleteAttr }) => {
    return (
        <div className="activity__row" style={{ padding: 8, gap: 8, flexWrap: 'wrap' }}>
            <div className="form__field" style={{ flex: 2, minWidth: 120 }}>
                <input
                    placeholder="Field Name"
                    value={attr.name}
                    onChange={e => updateAttr(attr._tempId, 'name', e.target.value)}
                />
            </div>
            <div className="form__field" style={{ flex: 1, minWidth: 90 }}>
                <select
                    value={attr.dataType}
                    onChange={e => updateAttr(attr._tempId, 'dataType', e.target.value)}
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
                        onChange={e => updateAttr(attr._tempId, 'isNullable', e.target.checked)}
                    />
                    <span title="Can be empty?">Opt</span>
                </label>
                {(attr.dataType === 'number' || attr.dataType === 'duration') && (
                    <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={attr.isInverse}
                            onChange={e => updateAttr(attr._tempId, 'isInverse', e.target.checked)}
                        />
                        <span title="Negative Impact?">Inv</span>
                    </label>
                )}
                <button
                    className="icon-btn"
                    style={{ width: 24, height: 24, padding: 0, color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => requestDeleteAttr(attr)}
                    title="Remove Attribute"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

// Extracted Editor Component to fix focus issues
const ActivityTypeEditor = ({ formName, setFormName, formAttrs, updateAttr, requestDeleteAttr, addAttribute, DeleteAttrModal }) => {
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
                {formAttrs.map((attr) => (
                    <AttributeRow
                        key={attr._tempId}
                        attr={attr}
                        updateAttr={updateAttr}
                        requestDeleteAttr={requestDeleteAttr}
                    />
                ))}
            </div>
            {DeleteAttrModal}
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

    const deleteType = async (type) => {
        try {
            await nodeService.deleteActivityType(type.id);
            loadTypes();
        } catch (err) {
            alert(err.message);
        }
    };

    const { requestDelete: requestDeleteType, DeleteModal: DeleteTypeModal } = useDeleteConfirm({
        onDelete: deleteType,
        itemName: 'Activity Type'
    });

    const handleDeleteClick = (type) => {
        requestDeleteType(type, {
            warning: 'Warning: This is a permanent action. Deleting schemas may lead to inconsistencies in historical activity data. Proceed with caution.'
        });
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
            const attributesToSave = formAttrs.map(({ _tempId, ...rest }) => rest);
            await nodeService.saveActivityType(payloadType, attributesToSave);
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
            id: '', // New ones have empty ID
            name: '',
            dataType: 'text',
            isNullable: false,
            isInverse: false
        }]);
    };

    const updateAttr = (tempId, field, val) => {
        setFormAttrs(prev => prev.map(item => {
            if (item._tempId === tempId) {
                const updated = { ...item, [field]: val };
                // Reset isInverse if type is not number/duration
                if (field === 'dataType' && val !== 'number' && val !== 'duration') {
                    updated.isInverse = false;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeAttr = (attr) => {
        setFormAttrs(prev => prev.filter(a => a._tempId !== attr._tempId));
    };

    const { requestDelete: requestDeleteAttr, DeleteModal: DeleteAttrModal } = useDeleteConfirm({
        onDelete: removeAttr,
        itemName: 'Attribute'
    });

    const handleRequestDeleteAttr = (attr) => {
        // If it's a new attribute (no server ID), delete immediately without confirm
        if (!attr.id) {
            removeAttr(attr);
            return;
        }

        requestDeleteAttr(attr, {
            warning: 'Warning: This is a permanent action. Deleting schemas may lead to inconsistencies in historical activity data. Proceed with caution.'
        });
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
                            <button className="chip chip--tiny chip--ghost" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDeleteClick(t)}>Delete</button>
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
                        requestDeleteAttr={handleRequestDeleteAttr}
                        addAttribute={addAttribute}
                        DeleteAttrModal={DeleteAttrModal}
                    />
                }
            />
            {DeleteTypeModal}
        </div>
    );
};
