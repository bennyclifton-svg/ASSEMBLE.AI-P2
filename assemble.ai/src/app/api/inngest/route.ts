/**
 * Inngest API Route
 *
 * This endpoint serves the Inngest functions and handles incoming events.
 * Inngest will call this endpoint to:
 * 1. Discover available functions
 * 2. Execute functions when events are triggered
 *
 * @see https://www.inngest.com/docs/learn/serving-inngest-functions
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { polarFunctions } from '@/lib/inngest/functions/polar-webhook';

// Combine all function handlers
const functions = [
    ...polarFunctions,
];

// Export the Inngest serve handler for Next.js App Router
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions,
});
