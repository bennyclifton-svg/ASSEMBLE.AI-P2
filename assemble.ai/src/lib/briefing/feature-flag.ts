export function isBriefingEnabled(): boolean {
    if (process.env.BRIEFING_ENABLED === 'true') return true;
    if (process.env.BRIEFING_ENABLED === 'false') return false;
    return process.env.NODE_ENV !== 'production';
}
