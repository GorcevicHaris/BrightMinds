// lib/types.ts
export interface UserPayload {
    id: number;
    email: string;
    role: string;
}

export interface GameUpdate {
    childId: number;
    activityId: number;
    gameType: 'shape_matching' | 'memory' | 'coloring' | 'sound-to-image';
    event: 'started' | 'progress' | 'completed' | 'shape_placed' | 'card_flipped' | 'color_applied' | 'answer';
    data: any;
    timestamp: string;
}

export interface ActiveSession {
    childId: number;
    activityId: number;
    startedAt: string;
    gameType: string;
}

