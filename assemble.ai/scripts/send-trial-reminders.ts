import { loadAppEnv } from '../src/lib/env/load-app-env';
import { dispatchTrialEndingReminders } from '../src/lib/email/trial-reminders';

loadAppEnv();

const result = await dispatchTrialEndingReminders();
console.log(JSON.stringify(result, null, 2));
