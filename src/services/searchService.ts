import { AppNode } from '../types/node';

export const searchService = {
    /**
     * Recursively filters the node tree based on a query string.
     * If a child matches, its entire parent chain is preserved.
     */
    filterTree(nodes: AppNode[], query: string): AppNode[] {
        if (!query || !query.trim()) {
            return nodes;
        }

        const lowerQuery = query.toLowerCase().trim();

        const filterNode = (node: AppNode): AppNode | null => {
            // Check if current node matches
            const matches = node.name.toLowerCase().includes(lowerQuery);

            // Recursively filter children
            const filteredChildren = node.children
                .map(child => filterNode(child))
                .filter((child): child is AppNode => child !== null);

            // Keep node if it matches OR if it has matching descendants
            if (matches || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren
                };
            }

            return null;
        };

        return nodes
            .map(node => filterNode(node))
            .filter((node): node is AppNode => node !== null);
    }
};
