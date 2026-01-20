import { pb } from '../api/pocketbase';
import { AppNode, NodeCreateInput, Activity } from '../types/node';

const isNonEmptyString = (value: any): value is string => typeof value === 'string' && value.trim().length > 0;
const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const sanitizeName = (name: string): string => name?.trim().replace(/\s+/g, ' ');

const buildPath = (parentPath: string | undefined | null, name: string): string => {
    const safeName = sanitizeName(name);
    assert(isNonEmptyString(safeName), 'name is required');
    if (isNonEmptyString(parentPath)) return `${parentPath.replace(/\/+$/, '')}/${safeName}`;
    return `/${safeName}`;
};

const normalizePath = (path: string | null | undefined): string => (path || '').replace(/\/+/g, '/');
const joinPath = (parentPath: string | null | undefined, name: string): string => buildPath(normalizePath(parentPath), name);

/**
 * Helper to convert flat list to nested tree using Map.
 * O(n) complexity.
 */
function buildTree(flatList: AppNode[]): AppNode[] {
    if (!Array.isArray(flatList) || flatList.length === 0) return [];

    const byId = new Map<string, AppNode>();
    const roots: AppNode[] = [];

    // 1. Initialize map and children arrays
    flatList.forEach((node) => {
        byId.set(node.id, { ...node, children: [] });
    });

    // 2. Build tree
    byId.forEach((node) => {
        // Handle both null and empty string as "no parent"
        if (node.parent_id && byId.has(node.parent_id)) {
            const parent = byId.get(node.parent_id);
            parent?.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // 3. Sort recursively
    const sortChildren = (nodes: AppNode[]) => {
        nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
        nodes.forEach((n) => sortChildren(n.children));
    };

    sortChildren(roots);
    return roots;
}

export const nodeService = {
    /**
     * Fetches all nodes and converts them into a recursive tree structure.
     * MUST handle auth check to prevent crashes.
     */
    async fetchNodeTree(): Promise<AppNode[]> {
        try {
            if (!pb.authStore.isValid) return [];

            const userId = pb.authStore.model?.id;
            if (!userId) return [];

            const flatList = await pb.collection('nodes').getFullList<AppNode>({
                sort: 'path',
                filter: `user_id = "${userId}"`,
            });

            return buildTree(flatList);
        } catch (error) {
            console.error('[nodeService] Error: fetchNodeTree failed', error);
            return [];
        }
    },

    /**
     * Creates a new node and auto-calculates the Materialized Path.
     */
    async createNode({ name, type, parentNode }: NodeCreateInput): Promise<AppNode> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');

            const userId = pb.authStore.model?.id;
            if (!userId) throw new Error('Missing user context');

            const sanitizedName = sanitizeName(name);
            const path = buildPath(parentNode?.path, sanitizedName);

            const record = {
                name: sanitizedName,
                type,
                parent_id: parentNode?.id ?? null,
                path,
                sort_order: 0,
                user_id: userId,
                metadata: {},
            };

            console.log("PocketBase record:", record); // DEBUG
            const result = await pb.collection('nodes').create<AppNode>(record);
            console.log("Create success:", result); // DEBUG
            return result;
        } catch (err: any) {
            console.error("[nodeService] Error: Create failed", err.data || err);
            throw err;
        }
    },

    /**
     * Renames a node and rewrites paths for all its descendants to maintain materialized paths.
     */
    async renameNode(nodeId: string, newName: string): Promise<void> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            const userId = pb.authStore.model?.id;
            assert(isNonEmptyString(userId), 'Missing user context');
            assert(isNonEmptyString(nodeId), 'nodeId is required');

            const sanitized = sanitizeName(newName);
            assert(isNonEmptyString(sanitized), 'name is required');

            const flatList = await pb.collection('nodes').getFullList<AppNode>({
                sort: 'path',
                filter: `user_id = "${userId}"`,
            });

            const byId = new Map(flatList.map((n) => [n.id, n]));
            const target = byId.get(nodeId);
            if (!target) throw new Error('Node not found');

            const parentPath = target.parent_id ? byId.get(target.parent_id)?.path : null;
            const oldPath = normalizePath(target.path);
            const newPath = joinPath(parentPath, sanitized);

            const descendants = flatList.filter((n) => n.path === target.path || n.path.startsWith(`${oldPath}/`));

            // Update target and descendants
            for (const node of descendants) {
                const relative = node.path === oldPath ? '' : node.path.slice(oldPath.length);
                const nextPath = normalizePath(`${newPath}${relative}`);
                await pb.collection('nodes').update(node.id, {
                    name: node.id === target.id ? sanitized : node.name,
                    path: nextPath,
                });
            }
        } catch (error) {
            console.error('[nodeService] Error: renameNode failed', error);
            throw error;
        }
    },

    /**
     * Recursively deletes a node and its descendants.
     */
    async deleteNodeRecursive(nodeId: string): Promise<void> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            const userId = pb.authStore.model?.id;
            assert(isNonEmptyString(userId), 'Missing user context');
            assert(isNonEmptyString(nodeId), 'nodeId is required');

            const flatList = await pb.collection('nodes').getFullList<AppNode>({
                sort: '-path',
                filter: `user_id = "${userId}"`,
            });
            const target = flatList.find((n) => n.id === nodeId);
            if (!target) return;

            const base = normalizePath(target.path);
            const toDelete = flatList.filter((n) => n.path === base || n.path.startsWith(`${base}/`));

            // delete deeper nodes first
            const ordered = toDelete.sort((a, b) => b.path.length - a.path.length);
            for (const node of ordered) {
                await pb.collection('nodes').delete(node.id);
            }
        } catch (error) {
            console.error('[nodeService] Error: deleteNodeRecursive failed', error);
            throw error;
        }
    },

    /**
     * Duplicates a node subtree under the same parent with a "Copy" suffix.
     * Maintains path integrity for all descendants.
     */
    async duplicateNode(nodeId: string): Promise<void> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            const userId = pb.authStore.model?.id;
            assert(isNonEmptyString(userId), 'Missing user context');
            assert(isNonEmptyString(nodeId), 'nodeId is required');

            const flatList = await pb.collection('nodes').getFullList<AppNode>({
                sort: 'path',
                filter: `user_id = "${userId}"`,
            });

            const byId = new Map(flatList.map((n) => [n.id, n]));
            const target = byId.get(nodeId);
            if (!target) throw new Error('Node not found');

            const parentPath = target.parent_id ? byId.get(target.parent_id)?.path : null;
            const oldBase = normalizePath(target.path);
            const newRootName = `${target.name} Copy`;
            const newBasePath = joinPath(parentPath, newRootName);

            const subtree = flatList.filter((n) => n.path === target.path || n.path.startsWith(`${oldBase}/`));
            // ensure parents are created before children
            subtree.sort((a, b) => a.path.length - b.path.length);

            const created = new Map<string, { id: string; path: string }>(); // oldId -> { id, path }

            for (const node of subtree) {
                const isRoot = node.id === target.id;
                const parentInfo = isRoot
                    ? target.parent_id
                    : created.get(node.parent_id || '')?.id; // strict null check handling
                const parentPathForNode = isRoot
                    ? parentPath
                    : created.get(node.parent_id || '')?.path;

                const nextPath = isRoot
                    ? newBasePath
                    : joinPath(parentPathForNode, node.name);

                const record = {
                    name: isRoot ? newRootName : node.name,
                    type: node.type,
                    parent_id: parentInfo ?? null,
                    path: nextPath,
                    sort_order: node.sort_order ?? 0,
                    user_id: userId,
                    metadata: node.metadata || {},
                };

                const createdRecord = await pb.collection('nodes').create<AppNode>(record);
                created.set(node.id, { id: createdRecord.id, path: nextPath });
            }
        } catch (error) {
            console.error('[nodeService] Error: duplicateNode failed', error);
            throw error;
        }
    },

    /**
     * Fetches activities for a given node, scoped to current user.
     */
    async fetchActivitiesByNode(nodeId: string, limit = 50): Promise<Activity[]> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');

            const userId = pb.authStore.model?.id;
            if (!userId) throw new Error('Missing user context');
            assert(isNonEmptyString(nodeId), 'nodeId is required');

            return pb.collection('activities').getFullList<Activity>({
                filter: `user_id = "${userId}" && node_id = "${nodeId}"`,
                sort: '-date',
                requestKey: null, // manual disable auto-cancel if needed, but we did globally
                batch: limit,
            });
        } catch (error) {
            console.error('[nodeService] Error: fetchActivitiesByNode failed', error);
            return [];
        }
    },

    /**
     * Saves a study activity for a LEAF node.
     */
    async saveActivity(payload: Partial<Activity> & { nodeId?: string; hoursSpent?: number; selfAssessment?: number }): Promise<Activity> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');

            const userId = pb.authStore.model?.id;
            if (!userId) throw new Error('Missing user context');

            const {
                nodeId,
                date,
                hoursSpent,
                selfAssessment,
                // Allow passthrough keys if caller already uses snake_case
                node_id,
                hours_spent,
                self_assessment,
                ...rest
            } = payload ?? {};

            const record = {
                node_id: node_id ?? nodeId,
                user_id: userId,
                date,
                hours_spent: hours_spent ?? hoursSpent,
                self_assessment: self_assessment ?? selfAssessment,
                ...rest,
            };

            assert(isNonEmptyString(record.node_id), 'node_id is required');
            assert(isNonEmptyString(record.date), 'date is required');

            if (record.hours_spent !== undefined && record.hours_spent !== null) {
                const parsedHours = Number(record.hours_spent);
                assert(Number.isFinite(parsedHours) && parsedHours >= 0, 'hours_spent must be a non-negative number');
                record.hours_spent = parsedHours;
            }

            if (record.self_assessment !== undefined && record.self_assessment !== null) {
                const parsedSelf = Number(record.self_assessment);
                assert(Number.isFinite(parsedSelf) && parsedSelf >= 1 && parsedSelf <= 5, 'self_assessment must be between 1 and 5');
                record.self_assessment = parsedSelf;
            }

            return pb.collection('activities').create<Activity>(record);
        } catch (error) {
            console.error('[nodeService] Error: saveActivity failed', error);
            throw error;
        }
    },

    /**
     * Moves a node to a new parent, updating paths for the node and all its descendants.
     */
    async moveNode(nodeId: string, newParentId: string | null): Promise<void> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            const userId = pb.authStore.model?.id;
            assert(isNonEmptyString(userId), 'Missing user context');
            assert(isNonEmptyString(nodeId), 'nodeId is required');

            if (nodeId === newParentId) throw new Error("Cannot move node into itself");

            const flatList = await pb.collection('nodes').getFullList<AppNode>({
                sort: 'path',
                filter: `user_id = "${userId}"`,
            });

            const byId = new Map(flatList.map(n => [n.id, n]));
            const target = byId.get(nodeId);
            if (!target) throw new Error("Node not found");

            // Check if newParent is valid (if provided)
            let parentPath: string | null = null;
            if (newParentId) {
                const newParent = byId.get(newParentId);
                if (!newParent) throw new Error("Target parent not found");

                // Cycle check
                const targetPath = normalizePath(target.path);
                const newParentPath = normalizePath(newParent.path);
                if (newParentPath === targetPath || newParentPath.startsWith(`${targetPath}/`)) {
                    throw new Error("Cannot move node into its own descendant");
                }
                parentPath = newParent.path;
            }

            const oldPath = normalizePath(target.path);
            const newPath = joinPath(parentPath, target.name);

            // Update target node
            await pb.collection('nodes').update(target.id, {
                parent_id: newParentId ?? null,
                path: newPath
            });

            // Update descendants
            const descendants = flatList.filter(n => n.id !== target.id && n.path.startsWith(`${oldPath}/`));

            for (const child of descendants) {
                const relative = child.path.slice(oldPath.length);
                const childNewPath = normalizePath(`${newPath}${relative}`);
                await pb.collection('nodes').update(child.id, {
                    path: childNewPath
                });
            }

        } catch (error) {
            console.error('[nodeService] Error: moveNode failed', error);
            throw error;
        }
    }
};
