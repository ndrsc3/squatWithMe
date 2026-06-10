export interface UserRecord {
    userId: string;
    username: string;
    lastActive: string;
    joinDate: string;
    recoveryHash?: string;
    devices?: Array<{
        deviceId: string;
        fingerprint: string;
        lastUsed: string;
        trusted: boolean;
    }>;
    squats: Record<string, number[]>;
    currentStreak?: number;
}

export interface SquatData {
    users: UserRecord[];
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

export interface AppState {
    squatData: ProcessedSquatData | null;
    userId: string | null;
    username: string | null;
    currentUser: UserRecord | null;
    currentStreak: number;
    deviceId: string | null;
    displayDays: number;
    squatToday: boolean;
    todaysDate: Date;
    ddInt: number;
    today: string;
    monthKey: string;
}
