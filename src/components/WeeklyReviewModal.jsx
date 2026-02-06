import React, { useState, useEffect } from 'react';
import { nodeService } from '../services/nodeService';
import { normalizeToMonday } from '../utils/time';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './Modal';

// ----- Internal Form Component -----
const ReviewFormContent = ({ rating, setRating, notes, setNotes, labels }) => {
    return (
        <div className="stack" style={{ gap: 24 }}>
            {/* Rating Section */}
            <div className="form__field" style={{ alignItems: 'center' }}>
                <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Weekly Score
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = rating === val;
                        return (
                            <button
                                key={val}
                                onClick={() => setRating(val)}
                                className={`btn`}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%', // Circle buttons
                                    padding: 0,
                                    fontSize: 18,
                                    fontWeight: isSelected ? 700 : 500,
                                    border: isSelected ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                                    background: isSelected ? 'var(--surface)' : 'transparent',
                                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    transition: 'all 0.1s ease',
                                    boxShadow: isSelected ? '0 0 0 1px var(--text-primary)' : 'none',
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                }}
                            >
                                {val}
                            </button>
                        );
                    })}
                </div>

                {/* Dynamic Label Display */}
                <div style={{
                    marginTop: 16,
                    height: 24,
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textAlign: 'center',
                    opacity: rating ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                }}>
                    {labels[rating]}
                </div>
            </div>

            {/* Notes Section */}
            <div className="form__field">
                <label className="label" style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600
                }}>
                    Weekly Reflection
                </label>
                <textarea
                    className="input"
                    rows={6}
                    style={{
                        resize: 'vertical',
                        background: 'rgba(255, 255, 255, 0.03)', // Slightly lighter dark background
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)', // Ensure text is visible
                        borderRadius: 8,
                        padding: 16,
                        fontSize: 15,
                        lineHeight: 1.6,
                        fontFamily: 'inherit',
                        minHeight: 120
                    }}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Reflect on your progress. What obstacles did you encounter? What went well?"
                />
            </div>
        </div>
    );
};

// ----- Main Modal Component -----
export const WeeklyReviewModal = ({ isOpen, onClose, node, weekStart: initialWeekStart }) => {
    const { addToast } = useToast();

    // State
    const [rating, setRating] = useState(3);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Default to current week if not provided
    const targetWeekStart = initialWeekStart || normalizeToMonday(new Date());

    // Initialize
    useEffect(() => {
        if (isOpen && node?.id) {
            loadReview();
        }
    }, [isOpen, node, targetWeekStart]);

    const loadReview = async () => {
        setLoading(true);
        try {
            const review = await nodeService.fetchWeeklyReview(node.id, targetWeekStart);
            if (review) {
                setRating(review.rating);
                setNotes(review.notes || '');
            } else {
                setRating(3);
                setNotes('');
            }
        } catch (err) {
            console.error(err);
            addToast('Failed to load previous review', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!node?.id) return;

        setSaving(true);
        try {
            await nodeService.saveWeeklyReview({
                nodeId: node.id,
                weekStart: targetWeekStart,
                rating,
                notes
            });
            addToast('Weekly report card saved successfully', 'success');
            onClose();
        } catch (err) {
            console.error(err);
            addToast('Failed to save review', 'error');
        } finally {
            setSaving(false);
        }
    };

    const ratingLabels = {
        1: "Struggling",
        2: "Below Average",
        3: "Steady / Okay",
        4: "Solid Progress",
        5: "Unstoppable"
    };

    if (!isOpen) return null;

    // Format week start for display (e.g., "Oct 12, 2025")
    const displayDate = new Date(targetWeekStart).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span>Weekly Report Card</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Week of {displayDate}
                    </span>
                </div>
            }
            size="medium" // 4:3 optimization
            footer={
                <>
                    <button className="btn btn--text" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn--primary"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ minWidth: 100, transition: 'all 0.2s' }}
                    >
                        {saving ? 'Saving...' : 'Save Report'}
                    </button>
                </>
            }
        >
            {loading ? (
                <div className="hint" style={{ padding: 24, textAlign: 'center' }}>
                    Loading your report card...
                </div>
            ) : (
                <ReviewFormContent
                    rating={rating}
                    setRating={setRating}
                    notes={notes}
                    setNotes={setNotes}
                    labels={ratingLabels}
                />
            )}
        </Modal>
    );
};
