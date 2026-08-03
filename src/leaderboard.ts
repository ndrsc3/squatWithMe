import type { UserRecord } from './types';

export function renderGrid(
    users: UserRecord[],
    currentUserId: string,
    today: string,
    displayDays: number
): void {
    const sortedUsers = Array.from(
        new Map(users.map((user) => [user.userId, user])).values()
    ).sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        if ((a.currentStreak ?? 0) !== (b.currentStreak ?? 0)) {
            return (b.currentStreak ?? 0) - (a.currentStreak ?? 0);
        }
        return a.username.localeCompare(b.username);
    });

    const dates = Array.from({ length: displayDays }, (_, i) => {
        const date = new Date(today + 'T00:00:00');
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
    });

    const grid = document.getElementById('squat-grid') as HTMLElement;
    grid.innerHTML = '';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `minmax(100px, auto) minmax(80px, auto) repeat(${dates.length}, 1fr)`;
    grid.style.gridTemplateRows = `auto repeat(${sortedUsers.length}, auto)`;

    addGridHeaders(grid, dates, sortedUsers.length, today);

    sortedUsers.forEach((user) => {
        addUserCells(grid, user, currentUserId);

        dates.forEach((date) => {
            const [yr, mo, dy] = date.split('-');
            const mk = `${yr}-${mo}`;
            const cell = document.createElement('div');
            cell.className = 'grid-cell';

            if (user.squats?.[mk]?.includes(parseInt(dy))) {
                cell.classList.add('squatted');
                cell.innerHTML = '✓';
            }

            if (date === today) {
                cell.classList.add('today');
            }

            grid.appendChild(cell);
        });
    });
}

function addGridHeaders(
    grid: HTMLElement,
    dates: string[],
    userCount: number,
    today: string
): void {
    const cornerCell = document.createElement('div');
    cornerCell.className = 'grid-cell corner-header';
    cornerCell.textContent = `Users (${userCount})`;
    grid.appendChild(cornerCell);

    const streakHeader = document.createElement('div');
    streakHeader.className = 'grid-cell corner-header';
    streakHeader.textContent = 'Streak';
    grid.appendChild(streakHeader);

    dates.forEach((date) => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell date-header';
        const [year, month, day] = date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        cell.textContent = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

        if (date === today) {
            cell.classList.add('today');
        }

        const daySpan = document.createElement('span');
        daySpan.className = 'day-of-week';
        daySpan.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        cell.appendChild(daySpan);

        grid.appendChild(cell);
    });
}

function addUserCells(grid: HTMLElement, user: UserRecord, currentUserId: string): void {
    const nameCell = document.createElement('div');
    nameCell.className = 'grid-cell user-name';
    if (user.userId === currentUserId) {
        nameCell.classList.add('current-user');
    }
    nameCell.textContent = user.username;
    grid.appendChild(nameCell);

    const streakCell = document.createElement('div');
    streakCell.className = 'grid-cell streak-cell';
    const streak = user.currentStreak ?? 0;
    streakCell.textContent = streak > 0 ? `${streak}🔥` : '0';
    grid.appendChild(streakCell);
}
