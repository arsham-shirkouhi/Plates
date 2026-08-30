const MONTH_NAMES = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
] as const;

export const WEEKDAY_LABELS = ['s', 'm', 't', 'w', 't', 'f', 's'] as const;

export function formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getMonthLabel(year: number, month: number): string {
    return `${MONTH_NAMES[month]} ${year}`;
}

export function shiftMonth(
    year: number,
    month: number,
    delta: number
): { year: number; month: number } {
    const next = new Date(year, month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
}

export function isSameMonth(
    year: number,
    month: number,
    date: Date = new Date()
): boolean {
    return date.getFullYear() === year && date.getMonth() === month;
}

export function getMonthDateRange(
    year: number,
    month: number
): { start: string; end: string } {
    return {
        start: formatDateString(new Date(year, month, 1)),
        end: formatDateString(new Date(year, month + 1, 0)),
    };
}

export type CalendarCell = {
    day: number;
    date: string;
} | null;

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
        cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push({
            day,
            date: formatDateString(new Date(year, month, day)),
        });
    }

    while (cells.length < 42) {
        cells.push(null);
    }

    return cells;
}
