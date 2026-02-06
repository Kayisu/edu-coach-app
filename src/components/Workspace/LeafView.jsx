import React, { useEffect, useState } from 'react';
import { NodeBreadcrumbs } from './NodeBreadcrumbs';
import { statsService } from '../../services/statsService';
import { nodeService } from '../../services/nodeService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { CreateActivityTypeModal } from '../CreateActivityTypeModal';
import { WeeklyReviewModal } from '../WeeklyReviewModal';
import { minutesToTimeStr, formatDate } from '../../utils/time';

export const LeafView = ({ node, onRefresh }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activityTypes, setActivityTypes] = useState([]);
    const [activities, setActivities] = useState([]); // Recent acts for list


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
                nodeService.fetchActivitiesByNode(node.id, 10) // fetch top 10 for list
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

    const handleSaved = () => {
        loadData();
        onRefresh && onRefresh();
    };

    const renderValuePreview = (activity, type) => {
        if (!activity.values || !type) return null;
        return type.attributes.map(attr => {
            let val = activity.values[attr.id] || activity.values[attr.name];
            if (val === undefined || val === null) return null;
            let displayVal = val;
            if (attr.dataType === 'duration') displayVal = minutesToTimeStr(Number(val));
            return <span key={attr.id} className="chip chip--tiny chip--ghost">{attr.name}: {displayVal}</span>;
        });
    };

    if (loading) return <div className="hint">Loading analysis...</div>;

    const hasTypes = activityTypes.length > 0;

    return (
        <div className="stack">
            {/* Header Area */}
            <div className="card card--loose">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="card__title" style={{ margin: 0, fontSize: 18 }}>{node.name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            className="btn btn--small btn--secondary"
                            onClick={() => setIsReviewModalOpen(true)}
                        >
                            Review Week
                        </button>
                        <span className="chip">LEAF</span>
                    </div>
                </div>
                <NodeBreadcrumbs path={node.path} />
            </div>

            {/* Alerts & Metrics */}
            <div className="row-spaced" style={{ display: 'flex', gap: 16 }}>
                {/* Forgetfulness Alert */}
                {stats?.daysSinceLastLog > 7 && (
                    <div className="card" style={{ borderColor: 'var(--warning)', background: 'rgba(234, 179, 8, 0.05)', flex: 1 }}>
                        <div className="card__title" style={{ color: 'var(--warning)' }}>⚠ Getting Rusty?</div>
                        <div className="hint">It's been {stats.daysSinceLastLog} days since you last studied this topic.</div>
                    </div>
                )}

                {/* Efficiency Metric */}
                <div className="card" style={{ flex: 1 }}>
                    <div className="card__title">Efficiency Index</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>
                        {stats?.efficiency || 0}
                    </div>
                    <div className="hint">Output / Minute</div>
                </div>
            </div>

            {/* Success Curve Chart */}
            <div className="card">
                <div className="card__title">Success Curve (Focus Trend)</div>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                        <LineChart data={stats?.successCurve || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => formatDate(val).slice(0, 5)} // Show DD.MM
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis domain={[1, 5]} allowDecimals={false} />
                            <Tooltip labelFormatter={(label) => formatDate(label)} />
                            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Actions (Only for setup now) */}
            {!hasTypes && (
                <div className="card">
                    <div className="card__title">Setup</div>
                    <div className="stack">
                        <div className="empty">No activity types configured.</div>
                        <button className="btn btn--secondary" onClick={() => setIsCreateTypeModalOpen(true)}>Create Type</button>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card__title">Recent Activity</div>
                <ul className="activity">
                    {activities.map((a) => {
                        const type = activityTypes.find(t => t.id === a.typeId);
                        return (
                            <li key={a.id} className="activity__row" style={{ display: 'block' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div className="activity__title">{formatDate(a.date)} <span className="hint" style={{ fontWeight: 400 }}>— {type?.name || 'Unknown'}</span></div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {renderValuePreview(a, type)}
                                </div>
                            </li>
                        );
                    })}
                </ul>
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
            />
        </div>
    );
};
