import { pb } from '../api/pocketbase';
import { Activity } from '../types/node';

export interface ChartData {
    date: string;
    hours: number;
}

export const chartService = {
    /**
     * Aggregates hours_spent for the last 7 days for a given node.
     * Returns an array of objects: { date: 'YYYY-MM-DD', hours: number }
     * sorted by date ascending.
     */
    async getWeeklyHours(nodeId: string): Promise<ChartData[]> {
        if (!nodeId) return [];
        if (!pb.authStore.isValid) return [];

        const userId = pb.authStore.model?.id;
        if (!userId) return [];

        // Calculate date 7 days ago
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6); // 7 days inclusive: today + 6 previous days

        const startStr = start.toISOString().split('T')[0];

        try {
            // Fetch activities for this node since start date
            const records = await pb.collection('activities').getFullList<Activity>({
                filter: `user_id = "${userId}" && node_id = "${nodeId}" && date >= "${startStr}"`,
                sort: 'date',
            });

            // Initialize map for the last 7 days to ensure 0-values are present
            const dailyMap = new Map<string, number>();
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                dailyMap.set(dateStr, 0);
            }

            // Aggregate hours
            records.forEach(record => {
                // record.date is YYYY-MM-DD
                // record.hours_spent is number
                // Support multiple entries per day
                const current = dailyMap.get(record.date) || 0;
                dailyMap.set(record.date, current + (record.hours_spent || 0));
            });

            // Convert map to array
            const result: ChartData[] = Array.from(dailyMap.entries()).map(([date, hours]) => ({
                date,
                hours: Number(hours.toFixed(2)) // rounding for UI
            }));

            return result;

        } catch (error) {
            console.error('[chartService] Error: getWeeklyHours failed', error);
            return [];
        }
    }
};
