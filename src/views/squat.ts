import type { UserRecord } from '../types';
import * as apiClient from '../api-client';
import { recordSquat, calculateStreak, RELAUNCH_DATE } from '../squats';
import { renderStats } from '../leaderboard';

const REFRESH_THROTTLE_MS = 30_000;

/** The squat tracker — stats panels (You / Today / The Crew) per the 260804 redesign. */
export class SquatView {
    private users: UserRecord[] = [];
    private squatToday = false;
    private lastFetch = 0;
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
        // Refresh on return-to-tab (decision 260804: no websockets for a friends-sized crew).
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') void this.refreshIfStale();
        });
        window.addEventListener('focus', () => void this.refreshIfStale());
        await this.fetchUserData();
    }

    private async refreshIfStale(): Promise<void> {
        if (Date.now() - this.lastFetch < REFRESH_THROTTLE_MS) return;
        await this.fetchUserData();
    }

    private async fetchUserData(): Promise<void> {
        try {
            // Window must cover both the 14-day strips (~2 months, like V1) and the
            // season meter's banked count (since relaunch) — take the earlier start.
            const windowStart = new Date();
            windowStart.setMonth(windowStart.getMonth() - 1, 1);
            const yyyy = windowStart.getFullYear();
            const mm = String(windowStart.getMonth() + 1).padStart(2, '0');
            const monthStart = `${yyyy}-${mm}-01`;
            const since = RELAUNCH_DATE < monthStart ? RELAUNCH_DATE : monthStart;
            const data = await apiClient.getSquatUsers(since);
            this.lastFetch = Date.now();
            this.processUserData(data.users);
        } catch (error) {
            console.error('[squat] Failed to load data:', error);
        }
    }

    private processUserData(users: UserRecord[]): void {
        this.users = users.map((user) => ({
            ...user,
            currentStreak: calculateStreak(user.squats || {}, this.today),
        }));

        const currentUser = this.users.find((u) => u.userId === this.userId) ?? null;
        this.squatToday = this.hasSquattedToday(currentUser?.squats);
        this.updateUI();
    }

    private hasSquattedToday(squats: Record<string, number[]> | undefined): boolean {
        if (!squats) return false;
        return squats[this.monthKey]?.includes(this.ddInt) ?? false;
    }

    private updateUI(): void {
        this.updateSquatButtonState(this.squatToday);
        const activeUsers = document.getElementById('active-users');
        if (activeUsers) {
            const active = this.users.filter((u) => this.hasSquattedToday(u.squats)).length;
            activeUsers.textContent = String(active);
        }
        renderStats(this.users, this.userId, this.today);
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
}
