import React, { useEffect, useState } from 'react';
import { nodeService } from '../services/nodeService';
import { statsService } from '../services/statsService';
import { formatDate } from '../utils/time';

/**
 * Home Module - Strategic Command Center
 * Displays Active Contexts (root folders as goals) and The Ledger (recent activity).
 */
export const Home = ({ tree, onOpenTab }) => {
    const [contexts, setContexts] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHomeData();
    }, [tree]);

    const loadHomeData = async () => {
        setLoading(true);
        try {
            // Contexts are root-level folders (independent goals like YKS, ALES)
            const rootFolders = tree.filter(n => n.type === 'FOLDER');

            // Fetch stats for each root folder
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

            // Fetch recent activities for the ledger (all nodes, last 20)
            const allActivities = await fetchRecentActivities(20);
            setLedger(allActivities);
        } catch (err) {
            console.error('Failed to load home data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivities = async (limit) => {
        // Fetch activities from all leaf nodes
        try {
            const leafNodes = [];
            const stack = [...tree];
            while (stack.length) {
                const node = stack.pop();
                if (node.type === 'LEAF') leafNodes.push(node);
                if (node.children?.length) stack.push(...node.children);
            }

            // Fetch recent activities from each leaf (limited)
            const allActs = [];
            for (const leaf of leafNodes.slice(0, 10)) {
                const acts = await nodeService.fetchActivitiesByNode(leaf.id, 5);
                acts.forEach(a => allActs.push({ ...a, nodeName: leaf.name, nodePath: leaf.path }));
            }

            // Sort by date descending and take top N
            return allActs
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, limit);
        } catch {
            return [];
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
        <div className="home">
            <header className="home__header">
                <h1 className="home__title">Strategic Command Center</h1>
                <p className="home__subtitle">Your active learning contexts at a glance</p>
            </header>

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

            {/* The Ledger Section */}
            <section className="home__ledger">
                <h2 className="home__section-title">The Ledger</h2>
                {ledger.length === 0 ? (
                    <div className="hint">No recent activity. Start logging sessions to see your progress.</div>
                ) : (
                    <LedgerTable activities={ledger} />
                )}
            </section>
        </div>
    );
};

/**
 * Context Card - Displays a single goal/context with stats
 */
const ContextCard = ({ context, onClick }) => {
    const stats = context.stats || {};

    return (
        <div className="context-card" onClick={onClick}>
            <div className="context-card__header">
                <span className="context-card__icon">📂</span>
                <h3 className="context-card__name">{context.name}</h3>
            </div>
            <div className="context-card__stats">
                <div className="context-card__stat">
                    <span className="context-card__stat-value">{stats.totalActivities || 0}</span>
                    <span className="context-card__stat-label">Sessions</span>
                </div>
                <div className="context-card__stat">
                    <span className="context-card__stat-value">{stats.averageFocus || '—'}</span>
                    <span className="context-card__stat-label">Avg Focus</span>
                </div>
                <div className="context-card__stat">
                    <span className="context-card__stat-value">{context.children?.length || 0}</span>
                    <span className="context-card__stat-label">Topics</span>
                </div>
            </div>
            {stats.weakestLink && (
                <div className="context-card__alert">
                    ⚠ Attention: {stats.weakestLink.name}
                </div>
            )}
        </div>
    );
};

/**
 * Ledger Table - High-contrast activity log
 */
const LedgerTable = ({ activities }) => {
    return (
        <div className="ledger-table-wrapper">
            <table className="ledger-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Topic</th>
                        <th>Focus</th>
                    </tr>
                </thead>
                <tbody>
                    {activities.map((act, idx) => (
                        <tr key={act.id || idx}>
                            <td className="ledger-table__date">{formatDate(act.date)}</td>
                            <td className="ledger-table__topic">
                                <span className="ledger-table__node-name">{act.nodeName}</span>
                            </td>
                            <td className="ledger-table__focus">
                                <span className={`focus-badge focus-badge--${act.selfAssessment || 3}`}>
                                    {act.selfAssessment || '—'}/5
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
