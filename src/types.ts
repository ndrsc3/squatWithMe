export interface UserRecord {
    userId: string;
    username: string;
    squats: Record<string, number[]>;
    currentStreak?: number;
}

export interface ProcessedSquatData {
    users: UserRecord[];
    stats: SquatStats;
}

export interface SquatStats {
    longestStreak: number;
    streakHolder: string;
    userStreaks: Record<string, number>;
    activeToday: number;
}
