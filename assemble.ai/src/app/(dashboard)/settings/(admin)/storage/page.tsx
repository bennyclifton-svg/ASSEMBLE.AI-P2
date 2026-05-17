import { HardDrive } from 'lucide-react';
import { getStorageSettings, defaultLocalBasePath } from '@/lib/storage/settings';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { StorageSettingsForm } from './StorageSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminStoragePage() {
    const settings = await getStorageSettings();
    const useSupabaseStorage = isSupabaseConfigured() && process.env.USE_SUPABASE_STORAGE !== 'false';

    return (
        <div className="sitewise-page-frame">
            <div className="sitewise-page-header">
                <div>
                    <div className="sitewise-page-kicker">admin / storage</div>
                    <h1 className="mt-2">Storage</h1>
                    <p className="sitewise-page-subtitle">
                        Set the local upload folder and filename style for newly uploaded files.
                    </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <span className="sitewise-status-pill">
                        <HardDrive className="h-3.5 w-3.5" />
                        {useSupabaseStorage ? 'supabase' : 'local'}
                    </span>
                    <span className="sitewise-status-pill sitewise-status-pill-dark">
                        {settings.filenameStrategy === 'preserve_original' ? 'original names' : 'hash names'}
                    </span>
                </div>
            </div>

            <StorageSettingsForm
                initialSettings={{
                    resolvedLocalBasePath: settings.resolvedLocalBasePath,
                    filenameStrategy: settings.filenameStrategy,
                }}
                defaultLocalBasePath={defaultLocalBasePath()}
                useSupabaseStorage={useSupabaseStorage}
            />
        </div>
    );
}
