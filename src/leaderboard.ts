import type { UserRecord } from './types';
import { calculateStreak, longestRun, monthCount, daysSince, daysToWinter, isDormant, RELAUNCH_DATE } from './squats';

const STRIP_DAYS = 14;

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function dateOffset(today: string, offset: number): Date {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - offset);
    return d;
}

function hasSquat(squats: Record<string, number[]> | undefined, d: Date): boolean {
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return squats?.[mk]?.includes(d.getDate()) ?? false;
}

function stripCells(squats: Record<string, number[]> | undefined, today: string): HTMLElement[] {
    const cells: HTMLElement[] = [];
    for (let off = STRIP_DAYS - 1; off >= 0; off--) {
        const d = dateOffset(today, off);
        const on = hasSquat(squats, d);
        const cell = el('div', 'day-cell');
        if (on) cell.classList.add('on');
        if (off === 0) cell.classList.add('is-today');
        cell.title = `${d.getMonth() + 1}/${d.getDate()}${on ? ' · 100 squats' : ''}`;
        cells.push(cell);
    }
    return cells;
}

function buildStrip(squats: Record<string, number[]> | undefined, today: string): HTMLElement {
    const strip = el('div', 'day-strip');
    strip.append(...stripCells(squats, today));
    return strip;
}

/** Date marks row above the crew strips — a label every 7 days, • = today. */
function stripMarks(today: string): HTMLElement {
    const marks = el('div', 'strip-marks');
    for (let off = STRIP_DAYS - 1; off >= 0; off--) {
        const d = dateOffset(today, off);
        const label = off === 0 ? '•' : off % 7 === 6 ? `${d.getMonth() + 1}/${d.getDate()}` : '';
        marks.appendChild(el('span', undefined, label));
    }
    return marks;
}

function renderYou(me: UserRecord | null, today: string): void {
    const streakEl = document.getElementById('user-streak');
    const statusEl = document.getElementById('you-status');
    const stripEl = document.getElementById('you-strip');
    const monthEl = document.getElementById('you-month');
    if (!streakEl || !statusEl || !stripEl || !monthEl) return;

    const squats = me?.squats ?? {};
    const streak = me ? calculateStreak(squats, today) : 0;
    streakEl.textContent = String(streak);

    const todayDone = hasSquat(squats, dateOffset(today, 0));
    statusEl.textContent = todayDone ? 'Squatted today 💪' : 'Not yet today';
    statusEl.classList.toggle('done', todayDone);

    stripEl.replaceChildren(...stripCells(squats, today));
    monthEl.textContent = `${monthCount(squats, today)} days this month · longest run ${longestRun(squats, today, 60)}`;

    const fill = document.getElementById('winter-fill');
    const sub = document.getElementById('winter-sub');
    if (!fill || !sub) return;
    const toGo = daysToWinter(today);
    const banked = daysSince(squats, RELAUNCH_DATE, today);
    if (toGo === 0) {
        fill.style.width = '100%';
        sub.textContent = `Winter is here ❄️ · ${banked} squat-days banked`;
    } else {
        fill.style.width = `${(banked / (banked + toGo)) * 100}%`;
        sub.textContent = `${banked} squat-days since relaunch · ${toGo} days to winter`;
    }
}

function renderToday(users: UserRecord[], today: string): void {
    const chipsEl = document.getElementById('today-chips');
    const countEl = document.getElementById('today-count');
    if (!chipsEl || !countEl) return;

    const now = dateOffset(today, 0);
    const done = users.filter((u) => hasSquat(u.squats, now));
    const waiting = users.filter((u) => !hasSquat(u.squats, now));
    done.sort((a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0));

    chipsEl.replaceChildren(
        ...done.map((u) => {
            const chip = el('span', 'chip', `${u.username} 💪`);
            chip.title = `streak ${u.currentStreak ?? 0}`;
            return chip;
        }),
        ...waiting.map((u) => el('span', 'chip wait', u.username))
    );
    countEl.textContent = `${done.length} of ${users.length} squatted so far today`;
}

function renderCrew(users: UserRecord[], currentUserId: string, today: string): void {
    const rowsEl = document.getElementById('crew-rows');
    if (!rowsEl) return;

    const sorted = Array.from(new Map(users.map((u) => [u.userId, u])).values()).sort((a, b) => {
        const da = isDormant(a.squats ?? {}, today) ? 1 : 0;
        const db = isDormant(b.squats ?? {}, today) ? 1 : 0;
        if (da !== db) return da - db;
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        if ((a.currentStreak ?? 0) !== (b.currentStreak ?? 0)) {
            return (b.currentStreak ?? 0) - (a.currentStreak ?? 0);
        }
        return a.username.localeCompare(b.username);
    });

    const marksRow = el('div', 'crew-row marks-row');
    marksRow.appendChild(el('span'));
    marksRow.appendChild(stripMarks(today));
    marksRow.appendChild(el('span'));

    rowsEl.replaceChildren(
        marksRow,
        ...sorted.map((u) => {
            const dormant = isDormant(u.squats ?? {}, today);
            const row = el('div', 'crew-row');
            if (dormant) row.classList.add('dormant');

            const name = el('span', 'crew-name', u.username);
            if (u.userId === currentUserId) name.classList.add('me');
            row.appendChild(name);
            row.appendChild(buildStrip(u.squats, today));

            const streak = u.currentStreak ?? 0;
            const flame = el('span', 'crew-streak', streak > 0 ? `${streak}🔥` : dormant ? '😴' : '—');
            if (streak === 0) flame.classList.add('zero');
            row.appendChild(flame);
            return row;
        })
    );
}

/** Render all three stats panels (You / Today / The Crew). */
export function renderStats(users: UserRecord[], currentUserId: string, today: string): void {
    const me = users.find((u) => u.userId === currentUserId) ?? null;
    renderYou(me, today);
    renderToday(users, today);
    renderCrew(users, currentUserId, today);
}
