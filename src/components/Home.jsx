import React, { useEffect, useState } from 'react';
import { nodeService } from '../services/nodeService';
import { statsService } from '../services/statsService';
import { formatDate } from '../utils/time';

/**
 * Home Module - Strategic Command Center (Dashboard v2.0)
 * Replaces the old Ledger with a high-level dashboard.
 */
export const Home = ({ tree, onOpenTab }) => {
    const [contexts, setContexts] = useState([]);
    const [weeklySummary, setWeeklySummary] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHomeData();
    }, [tree]);

    const loadHomeData = async () => {
        setLoading(true);
        try {
            // 1. Contexts (Root Folders)
            const rootFolders = tree.filter(n => n.type === 'FOLDER');
            const contextsWithStats = await Promise.all(
                rootFolders.map(async (folder) => {
                    try {
                        const stats = await statsService.getFolderStats(folder);
                        return { ...folder, stats };
                    } catch {
                        return { ...folder, stats: null };
                    }
                })
            );
            setContexts(contextsWithStats);

            // 2. Weekly Summary Mock (To be connected to real aggregation later)
            // This replaces the raw ledger with summarized insights
            setWeeklySummary([
                { id: 1, label: 'Total Hours', value: '12.5', trend: '+20%', isGood: true },
                { id: 2, label: 'Efficiency', value: '8.4', trend: '-2%', isGood: false },
                { id: 3, label: 'Active Topics', value: '4', trend: 'Stable', isNeutral: true },
            ]);

        } catch (err) {
            console.error('Failed to load home data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="home">
                <div className="hint">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="home stack" style={{ gap: 32, paddingBottom: 40 }}>
            <header className="home__header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="home__title">Strategic Command Center</h1>
                        <p className="home__subtitle">Weekly Overview & Active Fronts</p>
                    </div>
                    <div className="date-display" style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Current Week
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {(() => {
                                const d = new Date();
                                const day = d.getDay();
                                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                                const start = new Date(d.setDate(diff));
                                const end = new Date(new Date(start).setDate(start.getDate() + 6));

                                const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                return `${format(start)} - ${format(end)}`;
                            })()}
                        </div>
                    </div>
                </div>
            </header>

            {/* Weekly Overview Section (New) */}
            <section>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16
                }}>
                    {weeklySummary.map(stat => (
                        <div key={stat.id} className="card" style={{ padding: 20 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
                                {stat.label}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {stat.value}
                                </div>
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: stat.isGood ? 'var(--success)' : stat.isNeutral ? 'var(--text-secondary)' : '#ef4444'
                                }}>
                                    {stat.trend}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Placeholder for "Weekly Report Card" summary */}
                    <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--surface) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
                            Latest Review
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                            "Solid Progress"
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Logged 2 days ago
                        </div>
                    </div>
                </div>
            </section>

            {/* Active Contexts Section */}
            <section className="home__contexts">
                <h2 className="home__section-title">Active Contexts</h2>
                {contexts.length === 0 ? (
                    <div className="hint">No contexts yet. Create folders in the Explorer to define your goals.</div>
                ) : (
                    <div className="context-grid">
                        {contexts.map(ctx => (
                            <ContextCard
                                key={ctx.id}
                                context={ctx}
                                onClick={() => onOpenTab?.(ctx)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

/**
 * Context Card - Displays a single goal/context with stats (Refined)
 */
const ContextCard = ({ context, onClick }) => {
    const stats = context.stats || {};

    return (
        <div className="context-card" onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}>
            <div className="context-card__header" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32,
                        borderRadius: 6,
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)'
                    }}>
                        📂
                    </div>
                    <div>
                        <h3 className="context-card__name" style={{ margin: 0, fontSize: 16 }}>{context.name}</h3>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{context.children?.length || 0} Topics</div>
                    </div>
                </div>
            </div>

            <div className="context-card__stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="context-card__stat">
                    <span className="context-card__stat-value" style={{ fontSize: 20 }}>{stats.totalActivities || 0}</span>
                    <span className="context-card__stat-label">Sessions</span>
                </div>
                <div className="context-card__stat">
                    <span className="context-card__stat-value" style={{ fontSize: 20 }}>{stats.averageFocus || '—'}</span>
                    <span className="context-card__stat-label">Avg Focus</span>
                </div>
            </div>

            {stats.weakestLink && (
                <div style={{
                    marginTop: 16,
                    padding: '8px 12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: 6,
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    fontSize: 12,
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                }}>
                    <span>⚠</span> Focus Need: <strong>{stats.weakestLink.name}</strong>
                </div>
            )}
        </div>
    );
};
