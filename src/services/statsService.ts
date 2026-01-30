import { pb } from '../api/pocketbase';
import { nodeService } from './nodeService';
import { AppNode, Activity } from '../types/node';

export const statsService = {
    /**
     * Aggregates stats for a folder and its sub-nodes.
     * This performs client-side aggregation to avoid complex backend queries for now.
     */
    async getFolderStats(node: AppNode, tree: AppNode[]) {
        if (!node) return null;

        // 1. Find all descendant LEAF node IDs
        const leaves: AppNode[] = [];
        const findLeaves = (n: AppNode) => {
            if (n.type === 'LEAF') leaves.push(n);
            if (n.children) n.children.forEach(findLeaves);
        };
        // We need the full tree structure for this node.
        // If 'node' passed is just the node info, we might need to find it in the 'tree' prop if available,
        // or re-fetch hierarchy. Assuming 'node' has children if it was from the tree.
        findLeaves(node);

        if (leaves.length === 0) {
            return {
                heatmap: {},
                weakestLink: null,
                totalActivities: 0,
                averageFocus: 0
            };
        }

        const leafIds = leaves.map((l: AppNode) => l.id);

        // 2. Fetch recent activities for ALL leaves (limit 500 total for perf)
        // Optimization: In a real app, this should be a backend aggregation.
        const activities = await pb.collection('activities').getFullList({
            filter: leafIds.map((id: string) => `node_id="${id}"`).join(' || '),
            sort: '-date',
            limit: 500,
        });

        // 3. Process Activity Heatmap (Count by Date)
        const heatmap: Record<string, number> = {};
        let totalFocus = 0;
        let count = 0;

        activities.forEach((act: any) => {
            heatmap[act.date] = (heatmap[act.date] || 0) + 1;
            if (act.self_assessment) {
                totalFocus += act.self_assessment;
                count++;
            }
        });

        // 4. Determine Weakest Link (Leaf with lowest average self-assessment)
        // Group by node
        const nodeStats: Record<string, { sum: number; count: number }> = {};
        activities.forEach((act: any) => {
            if (!nodeStats[act.node_id]) nodeStats[act.node_id] = { sum: 0, count: 0 };
            nodeStats[act.node_id].sum += (act.self_assessment || 0);
            nodeStats[act.node_id].count++;
        });

        let weakestLink = null;
        let minAvg = 6; // max is 5

        leaves.forEach((leaf: AppNode) => {
            const stats = nodeStats[leaf.id];
            if (stats && stats.count > 0) {
                const avg = stats.sum / stats.count;
                if (avg < minAvg) {
                    minAvg = avg;
                    weakestLink = {
                        ...leaf,
                        averageRating: avg.toFixed(1)
                    };
                }
            }
        });

        return {
            heatmap, // { "YYYY-MM-DD": count }
            weakestLink, // { name, id, averageRating }
            totalActivities: activities.length,
            averageFocus: count > 0 ? (totalFocus / count).toFixed(1) : 0
        };
    },

    /**
     * Stats for a single Leaf node
     */
    async getLeafStats(nodeId: string) {
        // Fetch last 50 activities
        const activities = await nodeService.fetchActivitiesByNode(nodeId, 50);

        // 1. Success Curve (Assessment over time)
        // We want strict chronological order for the chart
        const sortedActs = [...activities].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const successCurve = sortedActs.map(a => ({
            date: a.date,
            value: a.selfAssessment
        }));

        // 2. Efficiency Index (Total Output / Total Minutes)
        // "Total Output" -> Sum of attributes with 'number' type? 
        // This is tricky without knowing which attribute is "output".
        // Heuristic: Sum ALL numeric values in 'values'. 
        let totalOutput = 0;
        let totalMinutes = 0; // We can't easily track time purely from "date".
        // Assumption: If there is a 'duration' type attribute, use it? 
        // Or assumes 'Activity' implies a session?
        // User said: "Efficiency Index (Total Qs / Time Spent)"
        // We will look for attributes named "Questions", "Qs", "Pages" etc? 
        // Or just sum all numbers. 
        // And for Time Spent, look for 'duration'.

        // We need types to know what is what.
        const types = await nodeService.fetchActivityTypes(); // Cached ideally

        // This is expensive to do every time, but necessary for the "Discovery"
        // Let's iterate activities
        sortedActs.forEach((act: Activity) => {
            const type = types.find(t => t.id === act.typeId);
            if (!type) return;

            // Find duration attr
            const durationAttr = type.attributes.find(a => a.dataType === 'duration');
            if (durationAttr) {
                const val = act.values[durationAttr.id] || act.values[durationAttr.name]; // fallback
                if (val) totalMinutes += Number(val);
            }

            // Find "Output" (Numeric but not duration)
            type.attributes.filter(a => a.dataType === 'number').forEach(attr => {
                const val = act.values[attr.id] || act.values[attr.name];
                if (val) totalOutput += Number(val);
            });
        });

        const efficiency = totalMinutes > 0
            ? (totalOutput / totalMinutes).toFixed(2)
            : 0;

        // 3. Forgetfulness Alert
        // Check days since last log
        let daysSinceLastLog = 0;
        if (sortedActs.length > 0) {
            const lastDate = new Date(sortedActs[sortedActs.length - 1].date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            daysSinceLastLog = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
            successCurve,
            efficiency,
            totalOutput,
            totalMinutes,
            daysSinceLastLog,
            lastActivityDate: sortedActs.length > 0 ? sortedActs[sortedActs.length - 1].date : null
        };
    }
};
