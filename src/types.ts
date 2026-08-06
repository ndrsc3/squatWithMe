export interface UserRecord {
    userId: string;
    username: string;
    squats: Record<string, number[]>;
    currentStreak?: number;
}
