export function getTimestamp(date: Date): number {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    ).getTime();
}

export function getUnixTimestamp(): number {
    return Math.floor(Date.now() / 1000);
}

export function handleTimeInRequest(timeRequest: string): Date {
    const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
    const match = timeRequest.match(regex);
    if (!match) {
        throw new Error('PublishedAt required format yyyy-MM-dd HH:mm:ss');
    }
    const [_, year, month, day, hour, minute, second] = match.map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
}

export function getUTCCurrentStartDay(): Date {
    const now = new Date();
    return new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0,
        ),
    );
}

export function getStartOfDay(date: Date): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0,
    );
}

export function getEndOfDay(date: Date): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        50,
        999,
    );
}

export function get24hAgo(): Date {
    const now = new Date();
    now.setHours(now.getHours() - 24);
    return now;
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
