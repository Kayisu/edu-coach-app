import { pb } from '../api/pocketbase';
import { AppNode, NodeCreateInput, Activity, ActivityType, ActivityAttribute, WeeklyReview } from '../types/node';

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
     * Fetches a single node by ID.
     */
    async fetchNodeById(nodeId: string): Promise<AppNode | null> {
        try {
            if (!pb.authStore.isValid) return null;
            const record = await pb.collection('nodes').getOne<AppNode>(nodeId);
            return record;
        } catch (error) {
            // It's common to return null if not found
            console.warn('[nodeService] fetchNodeById failed or not found', nodeId);
            return null;
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

            const result = await pb.collection('nodes').create<AppNode>(record);
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
     * Fetches all activity types with their attributes.
     */
    async fetchActivityTypes(): Promise<ActivityType[]> {
        try {
            if (!pb.authStore.isValid) return [];
            const userId = pb.authStore.model?.id;
            if (!userId) return [];

            // Fetch types with their attributes expanded
            const typesExpanded = await pb.collection('activity_types').getFullList({
                filter: `user_id = "${userId}"`,
                sort: 'name',
                expand: 'activity_attributes_via_type_id'
            });

            // Map to interface, handling DB snake_case -> App camelCase
            return typesExpanded.map((record: any) => {
                const attrs = record.expand?.['activity_attributes_via_type_id'] || [];
                return {
                    id: record.id,
                    userId: record.user_id,
                    name: record.name,
                    attributes: attrs.map((a: any) => ({
                        id: a.id,
                        typeId: record.id, // Use parent ID since we are expanding from parent
                        name: a.name,
                        dataType: a.data_type,     // CRITICAL: DB is data_type
                        isNullable: a.is_nullable, // CRITICAL: DB is is_nullable
                        isInverse: a.is_inverse    // CRITICAL: DB is is_inverse
                    })).sort((a: any, b: any) => a.name.localeCompare(b.name)) // Keep consistent order
                };
            });
        } catch (error) {
            console.error('[nodeService] Error: fetchActivityTypes failed', error);
            return [];
        }
    },

    /**
     * Saves an activity type and syncs its attributes.
     */
    async saveActivityType(type: Partial<ActivityType>, attributes: ActivityAttribute[]): Promise<ActivityType> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            const userId = pb.authStore.model?.id;
            assert(isNonEmptyString(userId), 'Missing user context');
            assert(isNonEmptyString(type.name), 'Type Name is required');

            // 1. Save/Update Type
            let typeRecord;
            const typePayload = {
                name: sanitizeName(type.name!),
                user_id: userId
            };

            if (type.id) {
                typeRecord = await pb.collection('activity_types').update(type.id, typePayload);
            } else {
                typeRecord = await pb.collection('activity_types').create(typePayload);
            }

            // 2. Sync Attributes
            const existingAttrs = await pb.collection('activity_attributes').getFullList({
                filter: `type_id = "${typeRecord.id}"`
            });

            const inputIds = new Set(attributes.filter(a => !!a.id).map(a => a.id));
            const toDelete = existingAttrs.filter(a => !inputIds.has(a.id));
            await Promise.all(toDelete.map(a => pb.collection('activity_attributes').delete(a.id)));

            const savedAttributes = await Promise.all(attributes.map(async attr => {
                const payload = {
                    type_id: typeRecord.id, // Foreign Key
                    user_id: userId,
                    name: sanitizeName(attr.name),
                    data_type: attr.dataType,     // Map to DB snake_case
                    is_nullable: attr.isNullable, // Map to DB snake_case
                    is_inverse: attr.isInverse    // Map to DB snake_case
                };

                if (attr.id) {
                    return await pb.collection('activity_attributes').update(attr.id, payload);
                } else {
                    return await pb.collection('activity_attributes').create(payload);
                }
            }));

            return {
                id: typeRecord.id,
                userId: typeRecord.user_id,
                name: typeRecord.name,
                attributes: savedAttributes.map((a: any) => ({
                    id: a.id,
                    typeId: a.type_id,
                    name: a.name,
                    dataType: a.data_type,
                    isNullable: a.is_nullable,
                    isInverse: a.is_inverse
                }))
            };
        } catch (error) {
            console.error('[nodeService] Error: saveActivityType failed', error);
            throw error;
        }
    },

    /**
     * Deletes an activity type. Prevents deletion if activities exist.
     */
    async deleteActivityType(typeId: string): Promise<void> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');

            // Check usage
            const usage = await pb.collection('activities').getList(1, 1, {
                filter: `type_id = "${typeId}"`
            });

            if (usage.totalItems > 0) {
                throw new Error('Cannot delete this Activity Type because actual activities are logged against it. Delete the activities first.');
            }

            // Delete type (PB should cascade attributes if setup, but safe to delete)
            await pb.collection('activity_types').delete(typeId);
        } catch (error) {
            console.error('[nodeService] Error: deleteActivityType failed', error);
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

            const records = await pb.collection('activities').getFullList({
                filter: `user_id = "${userId}" && node_id = "${nodeId}"`,
                sort: '-date',
                batch: limit || 50
            });

            // Map keys
            return records.map((r: any) => ({
                id: r.id,
                nodeId: r.node_id,
                typeId: r.type_id,
                date: r.date,
                // selfAssessment: r.self_assessment, // Removed
                values: r.values || {}
            }));
        } catch (error) {
            console.error('[nodeService] Error: fetchActivitiesByNode failed', error);
            return [];
        }
    },

    /**
     * Saves a study activity for a LEAF node.
     */
    async saveActivity(payload: Partial<Activity>): Promise<Activity> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');

            const userId = pb.authStore.model?.id;
            if (!userId) throw new Error('Missing user context');

            const {
                nodeId,
                typeId,
                date,
                values
            } = payload;

            assert(isNonEmptyString(nodeId), 'nodeId is required');
            assert(isNonEmptyString(typeId), 'Type is required');
            assert(isNonEmptyString(date), 'Date is required');

            const record: any = {
                node_id: nodeId,
                user_id: userId,
                type_id: typeId,
                date,
                values: values || {}
            };

            if (payload.id) {
                const res = await pb.collection('activities').update(payload.id, record);
                return {
                    id: res.id,
                    nodeId: res.node_id,
                    typeId: res.type_id,
                    date: res.date,
                    values: res.values
                };
            } else {
                const res = await pb.collection('activities').create(record);
                return {
                    id: res.id,
                    nodeId: res.node_id,
                    typeId: res.type_id,
                    date: res.date,
                    values: res.values
                };
            }
        } catch (error) {
            console.error('[nodeService] Error: saveActivity failed', error);
            throw error;
        }
    },

    /**
     * Fetches a global weekly review for a specific week.
     */
    /**
     * Fetches a global weekly review for a specific week or node-specific review.
     * ADDED: Optional nodeId support.
     */
    async fetchWeeklyReview(nodeId: string, weekStart: string): Promise<WeeklyReview | null> {
        try {
            if (!pb.authStore.isValid) return null;
            const userId = pb.authStore.model?.id;
            if (!userId) return null;

            assert(isNonEmptyString(nodeId), 'nodeId is required for fetchWeeklyReview');

            // Fetch review for specific user, node, and week
            const list = await pb.collection('weekly_reviews').getList(1, 1, {
                filter: `user_id = "${userId}" && node_id = "${nodeId}" && week_start = "${weekStart}"`
            });

            if (list.items.length === 0) return null;

            const r = list.items[0];
            return {
                id: r.id,
                userId: r.user_id,
                nodeId: r.node_id,
                weekStart: r.week_start,
                rating: r.rating,
                notes: r.notes
            };
        } catch (error) {
            console.error('[nodeService] Error: fetchWeeklyReview failed', error);
            return null;
        }
    },

    /**
     * Upserts a weekly review.
     */
    /**
     * Upserts a global weekly review.
     */
    async saveWeeklyReview(review: Partial<WeeklyReview>): Promise<WeeklyReview> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            const userId = pb.authStore.model?.id;
            assert(isNonEmptyString(userId), 'Missing user context');

            const { weekStart, rating, notes, nodeId } = review;
            assert(isNonEmptyString(weekStart), 'weekStart is required');
            assert(isNonEmptyString(nodeId), 'nodeId is required for saveWeeklyReview');

            // Check rating
            if (rating !== undefined) {
                assert(Number.isFinite(rating) && rating >= 1 && rating <= 5, 'Rating must be 1-5');
            }

            // Check if exists logic using the updated fetch which requires nodeId
            const existing = await nodeService.fetchWeeklyReview(nodeId!, weekStart!);

            const payload = {
                user_id: userId,
                node_id: nodeId,
                week_start: weekStart,
                rating,
                notes
            };

            let res;
            if (existing) {
                res = await pb.collection('weekly_reviews').update(existing.id, payload);
            } else {
                res = await pb.collection('weekly_reviews').create(payload);
            }

            return {
                id: res.id,
                userId: res.user_id,
                nodeId: res.node_id,
                weekStart: res.week_start,
                rating: res.rating,
                notes: res.notes
            };
        } catch (error) {
            console.error('[nodeService] Error: saveWeeklyReview failed', error);
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
    },

    /**
     * Deletes a single activity record.
     */
    async deleteActivity(activityId: string): Promise<void> {
        try {
            if (!pb.authStore.isValid) throw new Error('Not authenticated');
            assert(isNonEmptyString(activityId), 'activityId is required');
            await pb.collection('activities').delete(activityId);
        } catch (error) {
            console.error('[nodeService] Error: deleteActivity failed', error);
            throw error;
        }
    }
};
