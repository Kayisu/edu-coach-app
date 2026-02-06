import React, { useEffect, useState } from 'react';
import { statsService } from '../../services/statsService';
import { NodeBreadcrumbs } from './NodeBreadcrumbs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

    const renderDistributionChart = () => {
        if (!stats?.topicDistribution || stats.topicDistribution.length === 0) {
            return (
                <div className="empty" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    No activity data available yet.
                </div>
            );
        }

        return (
            <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={stats.topicDistribution}
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--surface)' }}
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                            {stats.topicDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--accent)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
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
                <div className="card" style={{ flex: 1.5 }}>
                    <div className="card__title">Most Active Topics</div>
                    {renderDistributionChart()}
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
                                <div className="text-sm text-muted">Topics Engaged</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                                    {stats?.activeTopics || 0}
                                    <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 4 }}>/ {stats?.totalTopics || 0}</span>
                                </div>
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
