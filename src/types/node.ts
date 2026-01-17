export type NodeType = 'FOLDER' | 'LEAF';

export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    [key: string]: any;
}

export interface AppNode {
    id: string;
    user_id: string;
    parent_id: string | null;
    name: string;
    type: NodeType;
    path: string;
    sort_order: number;
    metadata: Record<string, any>;
    children: AppNode[];
    created?: string;
    updated?: string;
}

export interface NodeCreateInput {
    name: string;
    type: NodeType;
    parentNode?: AppNode | null;
}

export interface Activity {
    id: string;
    node_id: string;
    user_id: string;
    date: string;
    hours_spent: number;
    self_assessment: number;
    [key: string]: any;
}
