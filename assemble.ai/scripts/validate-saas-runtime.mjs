const service = process.argv[2];

if (service !== 'web' && service !== 'worker') {
  console.error('Usage: node scripts/validate-saas-runtime.mjs <web|worker>');
  process.exit(2);
}

const groups = {
  database: [['DATABASE_URL', 'SUPABASE_POSTGRES_URL']],
  redis: [['REDIS_URL']],
  storage: [
    ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  ],
  models: [['VOYAGE_API_KEY'], ['ANTHROPIC_API_KEY']],
  web: [
    ['NEXT_PUBLIC_APP_URL'],
    ['BETTER_AUTH_SECRET', 'SESSION_SECRET'],
    ['POLAR_ACCESS_TOKEN'],
    ['POLAR_WEBHOOK_SECRET'],
    ['POLAR_STARTER_PRODUCT_ID'],
    ['POLAR_PROFESSIONAL_PRODUCT_ID'],
    ['RESEND_API_KEY'],
    ['RESEND_FROM_EMAIL'],
  ],
};

const required = [
  ...groups.database,
  ...groups.redis,
  ...groups.storage,
  ...groups.models,
  ...(service === 'web' ? groups.web : []),
];

const missing = required
  .filter((keys) => !keys.some((key) => process.env[key]?.trim()))
  .map((keys) => keys.join(' or '));

if (missing.length) {
  console.error(`Missing ${service} runtime configuration: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`SaaS ${service} runtime configuration is present.`);
