import { loadEnvConfig } from '@next/env';

let loaded = false;

export function loadAppEnv(projectDir = process.cwd()): void {
    if (loaded) return;

    loadEnvConfig(projectDir, process.env.NODE_ENV !== 'production', {
        info: () => undefined,
        error: console.error,
    });

    loaded = true;
}
