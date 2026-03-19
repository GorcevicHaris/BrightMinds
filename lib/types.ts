// lib/types.ts
export interface UserPayload {
    id: number;
    email: string;
    role: string;
}

export interface GameUpdate {
    childId: number;
    activityId: number;
    gameType: 'shape_matching' | 'memory' | 'coloring' | 'sound-to-image' | 'social' | 'social-story' | 'emotions';
    event: 'started' | 'progress' | 'completed' | 'shape_placed' | 'card_flipped' | 'color_applied' | 'answer' | 'new_round' | 'next_question' | 'reset_answer' | 'hint';
    data: any;
    timestamp: string;
}

export interface ActiveSession {
    childId: number;
    activityId: number;
    startedAt: string;
    gameType: string;
}

