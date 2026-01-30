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