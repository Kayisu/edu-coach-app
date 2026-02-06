import React, { useState, useEffect } from 'react';
import { nodeService } from '../services/nodeService';
import { normalizeToMonday } from '../utils/time';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './Modal';

export const WeeklyReviewModal = ({ isOpen, onClose, weekStart: initialWeekStart }) => {
    const { addToast } = useToast();

    // State
    const [rating, setRating] = useState(3); // Default to middle
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Default to current week if not provided
    const targetWeekStart = initialWeekStart || normalizeToMonday(new Date());

    // Initialize
    useEffect(() => {
        if (isOpen) {
            loadReview();
        }
    }, [isOpen, targetWeekStart]);

    const loadReview = async () => {
        setLoading(true);
        try {
            const review = await nodeService.fetchWeeklyReview(targetWeekStart);
            if (review) {
                setRating(review.rating);
                setNotes(review.notes || '');
            } else {
                setRating(3);
                setNotes('');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await nodeService.saveWeeklyReview({
                weekStart: targetWeekStart,
                rating,
                notes
            });
            addToast('Weekly review saved successfully', 'success');
            onClose();
        } catch (err) {
            console.error(err);
            addToast('Failed to save review', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // Descriptions for rating slider (1-5)
    // Refined labels as requested
    const ratingLabels = {
        1: "Struggling",
        2: "Below Average",
        3: "Steady / Okay",
        4: "Solid Progress",
        5: "Unstoppable"
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 450 }}>
                <div className="modal__header">
                    <h2 className="modal__title">Weekly Reflection</h2>
                    <button className="modal__close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal__content stack" style={{ gap: 24 }}>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <div className="hint" style={{ fontSize: 13 }}>
                            How was your week starting <strong>{targetWeekStart}</strong>?
                        </div>
                    </div>

                    {/* Slider Section */}
                    <div className="form__field" style={{ alignItems: 'center' }}>
                        <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: rating >= 4 ? 'var(--success)' : rating <= 2 ? '#ef4444' : 'var(--accent)',
                            marginBottom: 12
                        }}>
                            {ratingLabels[rating]}
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            className="slider"
                            style={{ width: '100%', maxWidth: 300, cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300, fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="form__field">
                        <label className="label">Reflections & Notes</label>
                        <textarea
                            className="input"
                            rows={4}
                            style={{ resize: 'vertical' }}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="What went well? What obstacles did you face?"
                        />
                    </div>
                </div>

                <div className="modal__footer">
                    <button className="btn btn--text" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn--primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};
