export type NodeType = 'FOLDER' | 'LEAF';
export type AttributeDataType = 'text' | 'number' | 'duration';


export interface ActivityAttribute {
    id: string;
    typeId: string;
    name: string;
    dataType: AttributeDataType;
    isNullable: boolean;
    isInverse: boolean;
}

export interface ActivityType {
    id: string;
    userId: string;
    name: string;
    attributes: ActivityAttribute[];
}

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
    nodeId: string;
    typeId: string;
    date: string;
    // selfAssessment removed
    values: Record<string, string | number>;
}

export interface WeeklyReview {
    id: string;
    userId: string;
    nodeId?: string; // Optional/Deprecated for Global Review
    weekStart: string; // "YYYY-MM-DD" (Monday)
    rating: number; // 1-5
    notes?: string;
}
