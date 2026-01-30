import React, { useEffect, useState } from 'react';
import { statsService } from '../../services/statsService';

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
                marginTop: 12
            }}>
                {days.map(d => {
                    const intensity = Math.min(d.count, 4); // 0-4 scale
                    return (
                        <div
                            key={d.date}
                            title={`${d.date}: ${d.count} activities`}
                            style={{
                                aspectRatio: '1',
                                borderRadius: 2,
                                background: intensity === 0 ? 'var(--bg-secondary)' :
                                    intensity === 1 ? 'rgba(100, 108, 255, 0.3)' :
                                        intensity === 2 ? 'rgba(100, 108, 255, 0.5)' :
                                            intensity === 3 ? 'rgba(100, 108, 255, 0.7)' :
                                                'rgba(100, 108, 255, 1)'
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
                        <div className="card__title">Overview</div>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <div>
                                <div className="hint">Total Activities</div>
                                <div style={{ fontSize: 20, fontWeight: 600 }}>{stats?.totalActivities || 0}</div>
                            </div>
                            <div>
                                <div className="hint">Avg Focus</div>
                                <div style={{ fontSize: 20, fontWeight: 600 }}>{stats?.averageFocus || 0}/5</div>
                            </div>
                        </div>
                    </div>

                    {stats?.weakestLink && (
                        <div className="card" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <div className="card__title" style={{ color: 'var(--danger)' }}>⚠ Weakest Link</div>
                            <div style={{ fontWeight: 600 }}>{stats.weakestLink.name}</div>
                            <div className="hint">Average Focus: {stats.weakestLink.averageRating}/5</div>
                        </div>
                    )}

                    {!stats?.weakestLink && stats?.totalActivities > 0 && (
                        <div className="card" style={{ borderColor: 'var(--success)', background: 'rgba(34, 197, 94, 0.05)' }}>
                            <div className="card__title" style={{ color: 'var(--success)' }}>✓ All Good</div>
                            <div className="hint">Consistent performance across all topics.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
