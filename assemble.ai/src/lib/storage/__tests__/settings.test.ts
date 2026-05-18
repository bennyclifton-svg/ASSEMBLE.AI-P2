import { shouldPreferSupabaseStorage } from '../settings';

describe('storage settings', () => {
    it('prefers Supabase storage when SaaS storage is configured', () => {
        expect(shouldPreferSupabaseStorage({
            supabaseConfigured: true,
            useSupabaseStorage: undefined,
        })).toBe(true);
    });

    it('allows local storage to be forced for development', () => {
        expect(shouldPreferSupabaseStorage({
            supabaseConfigured: true,
            useSupabaseStorage: 'false',
        })).toBe(false);
    });

    it('does not choose Supabase without credentials', () => {
        expect(shouldPreferSupabaseStorage({
            supabaseConfigured: false,
            useSupabaseStorage: undefined,
        })).toBe(false);
    });
});
