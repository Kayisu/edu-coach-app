import React, { useEffect, useState } from 'react';
import { statsService } from '../../services/statsService';
import { NodeBreadcrumbs } from './NodeBreadcrumbs';

export const FolderView = ({ node }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (node) loadStats();
    }, [node]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await statsService.getFolderStats(node);
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderHeatmap = () => {
        if (!stats?.heatmap) return null;
        // Generate last 60 days
        const days = [];
        const today = new Date();
        for (let i = 59; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const str = d.toISOString().split('T')[0];
            days.push({ date: str, count: stats.heatmap[str] || 0 });
        }

        return (
            <div className="heatmap-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(20, 1fr)',
                gap: 4,
                marginTop: 16
            }}>
                {days.map(d => {
                    // 0-4 scale: 0=Empty, 1-4=Intensity
                    const intensity = Math.min(d.count, 4);
                    let bg = 'var(--surface)'; // Default empty (Slate-900/White)

                    if (intensity === 0) bg = 'var(--bg)'; // Slightly distinct from card bg
                    if (intensity === 1) bg = 'var(--muted)'; // Low activity
                    if (intensity === 2) bg = 'var(--accent)'; // Medium
                    if (intensity === 3) bg = 'var(--accent-strong)'; // High
                    if (intensity >= 4) bg = 'var(--text)'; // Peak (White/Slate-900)

                    return (
                        <div
                            key={d.date}
                            title={`${d.date}: ${d.count} activities`}
                            style={{
                                aspectRatio: '1',
                                borderRadius: 3,
                                backgroundColor: bg,
                                opacity: intensity === 0 ? 0.5 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        />
                    );
                })}
            </div>
        );
    };

    if (loading) return <div className="hint">Loading dashboard...</div>;

    return (
        <div className="stack">
            <div className="card card--loose">
                <div className="card__title">Strategic Dashboard</div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{node.name}</div>
                <NodeBreadcrumbs path={node.path} />
                <div className="hint" style={{ marginTop: 4 }}>
                    Aggregated stats for {node.children?.length || 0} topics
                </div>
            </div>

            <div className="row-spaced" style={{ display: 'flex', gap: 16 }}>
                <div className="card" style={{ flex: 1 }}>
                    <div className="card__title">Activity Heatmap (Last 60 Days)</div>
                    {renderHeatmap()}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                        <span>Less</span>
                        <span>More</span>
                    </div>
                </div>

                <div className="stack" style={{ flex: 1 }}>
                    <div className="card">
                        <div className="card__title text-xs uppercase tracking-wide text-muted mb-2">Overview</div>
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div>
                                <div className="text-sm text-muted">Total Activities</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{stats?.totalActivities || 0}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted">Avg Focus</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{stats?.averageFocus || 0}<span className="text-muted text-sm" style={{ fontWeight: 400 }}>/5</span></div>
                            </div>
                        </div>
                    </div>

                    {stats?.weakestLink && (
                        <div className="card">
                            <div className="card__title text-xs uppercase tracking-wide text-muted mb-2">Attention Needed</div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{stats.weakestLink.name}</div>
                            <div className="text-sm text-muted" style={{ marginTop: 4 }}>Average Focus: {stats.weakestLink.averageRating}/5</div>
                        </div>
                    )}

                    {!stats?.weakestLink && stats?.totalActivities > 0 && (
                        <div className="card">
                            <div className="card__title text-xs uppercase tracking-wide text-muted mb-2">Status</div>
                            <div style={{ color: 'var(--success)' }}>On Track</div>
                            <div className="text-sm text-muted" style={{ marginTop: 4 }}>Consistent performance across all topics.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
