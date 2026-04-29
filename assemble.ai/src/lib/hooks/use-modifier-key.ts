import { useEffect, useState } from 'react';

/**
 * Tracks whether the Ctrl (or Meta/Cmd on macOS) key is currently held.
 * Resets on window blur to avoid stuck-key state when the user Alt-Tabs.
 */
export function useModifierKey(): { ctrlOrMeta: boolean } {
    const [ctrlOrMeta, setCtrlOrMeta] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Control' || event.key === 'Meta') {
                setCtrlOrMeta(true);
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === 'Control' || event.key === 'Meta') {
                setCtrlOrMeta(false);
            }
        };
        const handleBlur = () => setCtrlOrMeta(false);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    return { ctrlOrMeta };
}
