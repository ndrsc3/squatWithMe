import type { UserRecord, ProcessedSquatData, SquatStats } from '../types';
import * as apiClient from '../api-client';
import { recordSquat, calculateStreak } from '../squats';
import { renderGrid } from '../leaderboard';

/** The squat tracker, functionally unchanged from V1 — now Postgres-backed, streaks client-side. */
export class SquatView {
    private squatData: ProcessedSquatData | null = null;
    private squatToday = false;
    private readonly displayDays = 12;
    private readonly today: string;
    private readonly monthKey: string;
    private readonly ddInt: number;

    constructor(private readonly userId: string) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        this.ddInt = parseInt(dd);
        this.today = `${yyyy}-${mm}-${dd}`;
        this.monthKey = `${yyyy}-${mm}`;
    }

    async init(): Promise<void> {
        document.getElementById('squat-button')?.addEventListener('click', () => void this.recordSquatHandler());
        await this.fetchUserData();
    }

    private async fetchUserData(): Promise<void> {
        try {
            // ~2-month window (client-local first of previous month), like V1.
            const windowStart = new Date();
            windowStart.setMonth(windowStart.getMonth() - 1, 1);
            const yyyy = windowStart.getFullYear();
            const mm = String(windowStart.getMonth() + 1).padStart(2, '0');
            const data = await apiClient.getSquatUsers(`${yyyy}-${mm}-01`);
            this.processUserData(data.users);
        } catch (error) {
            console.error('[squat] Failed to load data:', error);
        }
    }

    private processUserData(users: UserRecord[]): void {
        const processedUsers = users.map((user) => ({
            ...user,
            currentStreak: calculateStreak(user.squats || {}, this.today),
        }));

        const stats: SquatStats = {
            longestStreak: 0,
            streakHolder: '',
            userStreaks: {},
            activeToday: processedUsers.filter((user) => this.hasSquattedToday(user.squats)).length,
        };

        processedUsers.forEach((user) => {
            stats.userStreaks[user.userId] = user.currentStreak ?? 0;
            if ((user.currentStreak ?? 0) > stats.longestStreak) {
                stats.longestStreak = user.currentStreak ?? 0;
                stats.streakHolder = user.username;
            }
        });

        this.squatData = { users: processedUsers, stats };
        const currentUser = processedUsers.find((u) => u.userId === this.userId) ?? null;
        this.squatToday = this.hasSquattedToday(currentUser?.squats);
        this.updateUI();
    }

    private hasSquattedToday(squats: Record<string, number[]> | undefined): boolean {
        if (!squats) return false;
        return squats[this.monthKey]?.includes(this.ddInt) ?? false;
    }

    private updateUI(): void {
        if (!this.squatData) return;
        this.updateSquatButtonState(this.squatToday);
        this.updateUIStats(this.squatData.stats);
        renderGrid(this.squatData.users, this.userId, this.today, this.displayDays);
    }

    private async recordSquatHandler(): Promise<void> {
        const squatButton = document.getElementById('squat-button')!;
        try {
            squatButton.classList.add('loading');
            await recordSquat(this.today);
            this.squatToday = true;
            this.updateSquatButtonState(true);
            await this.fetchUserData();
        } catch (error) {
            console.error('[squat] Error recording:', error);
        } finally {
            squatButton.classList.remove('loading');
        }
    }

    private updateSquatButtonState(hasSquatted: boolean): void {
        const squatButton = document.getElementById('squat-button')!;
        const squatStatus = document.getElementById('squat-status')!;
        if (hasSquatted) {
            squatButton.classList.add('hidden');
            squatStatus.textContent = "You've already done 100 squats today! 💪";
            squatStatus.classList.remove('hidden');
        } else {
            squatButton.classList.remove('hidden');
            squatStatus.textContent = '';
            squatStatus.classList.add('hidden');
        }
    }

    private updateUIStats(stats: SquatStats): void {
        const userStreak = document.getElementById('user-streak');
        const activeUsers = document.getElementById('active-users');
        const longestStreak = document.getElementById('longest-streak');
        const streakHolder = document.getElementById('streak-holder');

        if (userStreak) userStreak.textContent = String(stats.userStreaks[this.userId] ?? 0);
        if (longestStreak) longestStreak.textContent = String(stats.longestStreak || 0);
        if (streakHolder) streakHolder.textContent = stats.streakHolder || '-';
        if (activeUsers) activeUsers.textContent = String(stats.activeToday || 0);
    }
}
