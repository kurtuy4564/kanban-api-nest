import { config } from 'dotenv';

config({ path: '.env.test' });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'E2E tests require TEST_DATABASE_URL. Set it in .env.test or the environment; do not use a production database.',
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET =
  process.env.TEST_JWT_SECRET ?? 'e2e-test-only-secret-change-me';
