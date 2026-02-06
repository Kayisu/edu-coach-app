import React, { useEffect, useState } from 'react';
import { NodeBreadcrumbs } from './NodeBreadcrumbs';
import { statsService } from '../../services/statsService';
import { nodeService } from '../../services/nodeService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

import { CreateActivityTypeModal } from '../CreateActivityTypeModal';
import { WeeklyReviewModal } from '../WeeklyReviewModal';
import { minutesToTimeStr, formatDate, normalizeToMonday } from '../../utils/time';

/**
 * LeafView - Laboratory Dashboard
 * Focused on metrics, trends, and focused action.
 */
export const LeafView = ({ node, onRefresh }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activityTypes, setActivityTypes] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [node]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [st, types, acts] = await Promise.all([
                statsService.getLeafStats(node.id),
                nodeService.fetchActivityTypes(),
                nodeService.fetchActivitiesByNode(node.id, 20)
            ]);
            setStats(st);
            setActivityTypes(types);
            setActivities(acts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderValuePreview = (activity, type) => {
        if (!activity.values || !type) return null;
        return type.attributes.map(attr => {
            let val = activity.values[attr.id] || activity.values[attr.name];
            if (val === undefined || val === null) return null;
            let displayVal = val;
            if (attr.dataType === 'duration') displayVal = minutesToTimeStr(Number(val));
            return <span key={attr.id} style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>{attr.name}: <strong style={{ color: 'var(--text-primary)' }}>{displayVal}</strong></span>;
        });
    };

    if (loading) return <div className="hint">Loading analysis...</div>;

    const hasTypes = activityTypes.length > 0;

    return (
        <div className="stack" style={{ gap: 32, paddingBottom: 40 }}>
            {/* Header Area */}
            <div className="card" style={{ padding: '16px 20px', border: 'none', background: 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <NodeBreadcrumbs path={node.path} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <div className="card__title" style={{ margin: 0, fontSize: 24, lineHeight: 1.2, color: 'var(--text-primary)' }}>{node.name}</div>
                            <span className="chip" style={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11, padding: '2px 8px' }}>Topic</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {/* Efficiency Metric */}
                <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>Efficiency Index</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
                        {stats?.efficiency || 0}
                    </div>
                    <div className="hint" style={{ fontSize: 12 }}>Output / Minute</div>
                </div>

                {/* Focus Trend */}
                <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>Success Trend</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
                        {/* Mock trend for now */}
                        ↗ High
                    </div>
                    <div className="hint" style={{ fontSize: 12 }}>Consistent Performance</div>
                </div>

                {/* Last Session */}
                {stats?.daysSinceLastLog > 7 ? (
                    <div className="card" style={{ padding: 20, borderColor: 'var(--warning)', background: 'rgba(234, 179, 8, 0.05)' }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--warning)', fontWeight: 600, letterSpacing: '0.05em' }}>Alert</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--warning)', marginTop: 6 }}>
                            Getting Rusty
                        </div>
                        <div className="hint" style={{ color: 'var(--warning)', fontSize: 12 }}>{stats.daysSinceLastLog} days inactive</div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>Last Session</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>
                            Recently Active
                        </div>
                        <div className="hint" style={{ fontSize: 12 }}>{stats?.daysSinceLastLog === 0 ? 'Today' : `${stats?.daysSinceLastLog} days ago`}</div>
                    </div>
                )}
            </div>

            {/* Success Curve Chart */}
            <div className="card" style={{ padding: 24 }}>
                <div className="card__title" style={{ marginBottom: 24, fontSize: 16 }}>Performance Trajectory</div>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.successCurve || []}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => formatDate(val).slice(0, 5)}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                domain={[1, 5]}
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                labelFormatter={(label) => formatDate(label)}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorVal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <CreateActivityTypeModal
                isOpen={isCreateTypeModalOpen}
                onClose={() => setIsCreateTypeModalOpen(false)}
                onCreated={() => {
                    loadData();
                }}
            />

            <WeeklyReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                node={node}
                weekStart={normalizeToMonday(new Date())}
            />
        </div>
    );
};
