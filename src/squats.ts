import * as apiClient from './api-client';

export async function recordSquat(date: string): Promise<void> {
    await apiClient.recordSquat(date);
}

export function calculateStreak(squats: Record<string, number[]>, today: string): number {
    if (!squats) return 0;

    const [yyyy, mm, dd] = today.split('-');
    const monthKey = `${yyyy}-${mm}`;
    const ddInt = parseInt(dd);

    const hasSquattedToday = squats[monthKey]?.includes(ddInt) ?? false;

    let streak = 0;
    const checkDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);

    if (!hasSquattedToday) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const ck = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
        const day = checkDate.getDate();

        if (!squats[ck] || !squats[ck].includes(day)) {
            break;
        }

        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}
