/**
 * Converts a time string (HH:MM) to total minutes.
 * @param timeStr - Time in "HH:MM" format
 * @returns Total minutes or 0 if invalid
 */
export const timeStrToMinutes = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return (hours * 60) + minutes;
};

/**
 * Converts total minutes to a time string (HH:MM).
 * @param totalMinutes - Total minutes
 * @returns Time formatted as "HH:MM"
 */
export const minutesToTimeStr = (totalMinutes: number): string => {
    if (typeof totalMinutes !== 'number' || isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    // HH:MM formatı için padStart(2, '0') kritik.
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Formats a date string to "dd.mm.yyyy".
 * @param dateStr - ISO date string or similar
 * @returns Date formatted as "dd.mm.yyyy"
 */
export const formatDate = (dateStr: any): string => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();

    // Try Regex extraction first (most robust for fixed formats like PocketBase)
    const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [_, year, month, day] = match;
        return `${day}.${month}.${year}`;
    }

    // Fallback to Date parsing
    try {
        const d = new Date(s);
        if (isNaN(d.getTime())) return s;

        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    } catch {
        return s;
    }
};