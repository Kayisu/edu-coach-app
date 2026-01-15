import { pb } from '../api/pocketbase';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sanitizeName = (name) => name?.trim().replace(/\s+/g, ' ');
const buildPath = (parentPath, name) => {
  const safeName = sanitizeName(name);
  assert(isNonEmptyString(safeName), 'name is required');
  if (isNonEmptyString(parentPath)) return `${parentPath.replace(/\/+$/, '')}/${safeName}`;
  return `/${safeName}`;
};
const normalizePath = (path) => (path || '').replace(/\/+/g, '/');
const joinPath = (parentPath, name) => buildPath(normalizePath(parentPath), name);

/**
 * SYSTEM: Service Layer
 * GOAL: Decouple UI from Database.
 */

// --- TYPES (JSDoc for IntelliSense) ---
/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} user_id
 * @property {string|null} parent_id
 * @property {string} name
 * @property {'FOLDER' | 'LEAF'} type
 * @property {string} path
 * @property {number} sort_order
 * @property {Object} metadata
 * @property {Node[]} children
 */

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} node_id
 * @property {string} user_id
 * @property {string} date
 * @property {number} hours_spent
 * @property {number} self_assessment
 */

/**
 * @typedef {Object} SaveActivityParams
 * @property {string} nodeId
 * @property {string} date
 * @property {number} hoursSpent
 * @property {number} selfAssessment
 */

/**
 * @typedef {Object} CreateNodeParams
 * @property {string} name
 * @property {string} type - 'FOLDER' | 'LEAF'
 * @property {Node} [parentNode] - The parent node object (for path calc)
 */

export const nodeService = {
  /**
   * Fetches all nodes and converts them into a recursive tree structure.
   * MUST handle auth check to prevent crashes.
   * @returns {Promise<Array>} The hierarchical tree
   */
  async fetchNodeTree() {
    try {
      if (!pb.authStore.isValid) return [];

      const userId = pb.authStore.model?.id;
      if (!userId) return [];

      const flatList = await pb.collection('nodes').getFullList({
        sort: 'path',
        filter: `user_id = "${userId}"`,
      });

      return this.buildTree(flatList);
    } catch (error) {
      console.error('fetchNodeTree failed', error);
      return [];
    }
  },

  /**
   * Helper to convert flat list to nested tree.
   * @param {Array} flatList 
   */
  buildTree(flatList) {
    if (!Array.isArray(flatList) || flatList.length === 0) return [];

    const byId = new Map();
    const roots = [];

    flatList.forEach((node) => {
      byId.set(node.id, { ...node, children: [] });
    });

    const attach = (child) => {
      if (child.parent_id && byId.has(child.parent_id)) {
        byId.get(child.parent_id).children.push(child);
        return;
      }
      roots.push(child);
    };

    byId.forEach((node) => attach(node));

    const sortChildren = (nodes) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      nodes.forEach((n) => sortChildren(n.children));
    };

    sortChildren(roots);
    return roots;
  },

  /**
   * Creates a new node and auto-calculates the Materialized Path.
   * @param {CreateNodeParams} params
   */
  async createNode({ name, type, parentNode }) {
    if (!pb.authStore.isValid) throw new Error('Not authenticated');

    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error('Missing user context');

    const sanitizedName = sanitizeName(name);
    assert(isNonEmptyString(sanitizedName), 'name is required');
    assert(type === 'FOLDER' || type === 'LEAF', 'type must be FOLDER or LEAF');

    const path = buildPath(parentNode?.path, sanitizedName);
    const sort_order = Number.isFinite(parentNode?.children?.length)
      ? parentNode.children.length
      : 0;

    const record = {
      name: sanitizedName,
      type,
      parent_id: parentNode?.id ?? null,
      path,
      sort_order,
      user_id: userId,
      metadata: {},
    };

    return pb.collection('nodes').create(record);
  },

  /**
   * Renames a node and rewrites paths for all its descendants to maintain materialized paths.
   * @param {string} nodeId
   * @param {string} newName
   */
  async renameNode(nodeId, newName) {
    if (!pb.authStore.isValid) throw new Error('Not authenticated');
    const userId = pb.authStore.model?.id;
    assert(isNonEmptyString(userId), 'Missing user context');
    assert(isNonEmptyString(nodeId), 'nodeId is required');

    const sanitized = sanitizeName(newName);
    assert(isNonEmptyString(sanitized), 'name is required');

    const flatList = await pb.collection('nodes').getFullList({
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
  },

  /**
   * Recursively deletes a node and its descendants.
   * @param {string} nodeId
   */
  async deleteNodeRecursive(nodeId) {
    if (!pb.authStore.isValid) throw new Error('Not authenticated');
    const userId = pb.authStore.model?.id;
    assert(isNonEmptyString(userId), 'Missing user context');
    assert(isNonEmptyString(nodeId), 'nodeId is required');

    const flatList = await pb.collection('nodes').getFullList({
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
  },

  /**
   * Duplicates a node subtree under the same parent with a "Copy" suffix.
   * Maintains path integrity for all descendants.
   * @param {string} nodeId
   */
  async duplicateNode(nodeId) {
    if (!pb.authStore.isValid) throw new Error('Not authenticated');
    const userId = pb.authStore.model?.id;
    assert(isNonEmptyString(userId), 'Missing user context');
    assert(isNonEmptyString(nodeId), 'nodeId is required');

    const flatList = await pb.collection('nodes').getFullList({
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

    const created = new Map(); // oldId -> { id, path }

    for (const node of subtree) {
      const isRoot = node.id === target.id;
      const parentInfo = isRoot
        ? target.parent_id
        : created.get(node.parent_id)?.id;
      const parentPathForNode = isRoot
        ? parentPath
        : created.get(node.parent_id)?.path;

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

      const createdRecord = await pb.collection('nodes').create(record);
      created.set(node.id, { id: createdRecord.id, path: nextPath });
    }
  },

  /**
   * Fetches activities for a given node, scoped to current user.
   * @param {string} nodeId
   * @param {number} [limit=50]
   * @returns {Promise<Activity[]>}
   */
  async fetchActivitiesByNode(nodeId, limit = 50) {
    if (!pb.authStore.isValid) throw new Error('Not authenticated');

    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error('Missing user context');
    assert(isNonEmptyString(nodeId), 'nodeId is required');

    return pb.collection('activities').getFullList({
      filter: `user_id = "${userId}" && node_id = "${nodeId}"`,
      sort: '-date',
      $autoCancel: false,
      batch: limit,
    });
  },

  /**
   * Saves a study activity for a LEAF node.
   */
  async saveActivity(payload) {
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

    return pb.collection('activities').create(record);
  }
};